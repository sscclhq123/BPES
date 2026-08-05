from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from backend.server import render_calculation_page, simulate, upload_weather, weather_preview


class handler(BaseHTTPRequestHandler):
    def _route(self) -> str:
        parsed = urlparse(self.path)
        requested = parse_qs(parsed.query).get("route", [""])[0].strip("/")
        return f"/api/{requested}" if requested and requested != "calculate" else "/calculate" if requested == "calculate" else parsed.path

    def _send(self, status: int, content_type: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = self._route()
        if path in {"/api", "/api/", "/api/health"}:
            self._send(200, "application/json; charset=utf-8", b'{"ok":true,"runtime":"vercel-python"}')
            return
        self._send(404, "application/json; charset=utf-8", b'{"error":"Not found"}')

    def do_POST(self) -> None:
        path = self._route()
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length)
            if path == "/calculate":
                form = parse_qs(raw_body.decode("utf-8"))
                payload = json.loads(form.get("payload", ["{}"]) [0])
                self._send(200, "text/html; charset=utf-8", render_calculation_page(payload))
                return
            if path == "/api/weather-upload":
                response = upload_weather(self.headers, raw_body)
            elif path in {"/api/weather-preview", "/api/simulate"}:
                payload = json.loads(raw_body or b"{}")
                response = weather_preview(payload) if path == "/api/weather-preview" else simulate(payload)
            else:
                self._send(404, "application/json; charset=utf-8", b'{"error":"Not found"}')
                return
            body = json.dumps(response, ensure_ascii=False).encode("utf-8")
            self._send(200, "application/json; charset=utf-8", body)
        except Exception as exc:
            body = json.dumps({"error": str(exc)}, ensure_ascii=False).encode("utf-8")
            self._send(500, "application/json; charset=utf-8", body)
