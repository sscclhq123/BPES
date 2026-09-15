"""Read-only, versioned annual LD snapshots. Only the offline builder writes these.

Solar coverage/sizing is deliberately NOT cached. No pickle, rounding, or runtime
memoization of arbitrary user inputs. A changed effective config/EPW/engine misses.
"""
import hashlib
import io
import json
import logging
import os
import tempfile
from functools import lru_cache
from dataclasses import asdict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import numpy as np
import pandas as pd

CACHE_DIR = Path(__file__).resolve().parents[1] / "data" / "default_ld_cache"
SCHEMA = 2
CATALOG_PATH = Path(__file__).with_name("default_ld_catalog.json")
PRESETS = {
    "office_small": (511, 795, 9), "office_medium": (4982, 7745, 9),
    "office_large": (46320, 72004, 9),
    "mall_small": (1147, 4486, 12), "mall_medium": (2294, 8973, 12),
    "mall_large": (5226, 22220, 12),
    "residential_small": (1567, 1517, 24), "residential_medium": (3135, 3034, 24),
    "residential_large": (7837, 7519, 24),
    "hospital_small": (4487, 12702, 24), "hospital_medium": (11218, 31755, 24),
    "hospital_large": (22436, 63510, 24),
    "factory_small": (2418, 2707, 12), "factory_medium": (4835, 5414, 12),
    "factory_large": (9670, 10828, 24),
    "agriculture_small": (300, 2500, 24), "agriculture_medium": (1500, 14500, 24),
    "agriculture_large": (6000, 62000, 24),
}


def default_payload(city, preset):
    area, airflow, hours = PRESETS[preset]
    use, size = preset.split("_")
    return dict(weatherDataset=city, buildingUse=use, buildingSize=size,
                buildingInputMode="template", buildingArea=area, airflow=airflow,
                operationHours=hours, analysisPeriodMode="annual", mallParking="no",
                collectorType="evacuated", solutionConcentration=38, lgRatio=1,
                lgMode="auto", absSolutionTemp=25, absTempMode="auto",
                regenTemp=59.4, regenMode="auto", regenFlowMode="auto",
                regenSizingMode="load", regenLgRatio=1.2,
                targetAbsHumidity=10, targetHumidityTolerance=.5,
                tesSupplyTemp=60, tesReturnTemp=45, targetSolarShare=80)


def _json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      default=lambda v: v.item() if isinstance(v, np.generic) else str(v))


@lru_cache(maxsize=1)
def published_default_keys():
    try:
        return set(json.loads(CATALOG_PATH.read_text())["keys"])
    except (OSError, ValueError, KeyError):
        return set()


def signature(weather, kind, config, collector):
    # Hash bytes, not paths/mtime: portable across local and Vercel deployment.
    engine = Path(__file__).with_name("solar_ld_engine.py").read_bytes()
    return hashlib.sha256(_json(dict(
        schema=SCHEMA, engine=hashlib.sha256(engine).hexdigest(),
        weather=hashlib.sha256(Path(weather).read_bytes()).hexdigest(),
        kind=kind, config=asdict(config), collector=asdict(collector),
    )).encode()).hexdigest()


def write_snapshot(key, result, summary, provenance, directory=CACHE_DIR):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    arrays, frames = {}, {}
    for label, frame in (("result", result), ("summary", summary)):
        if not isinstance(frame.index, pd.RangeIndex):
            raise ValueError("Snapshot requires the engine's RangeIndex")
        spec = []
        for i, column in enumerate(frame.columns):
            series = frame[column]
            dtype = str(series.dtype)
            values = series.to_numpy()
            if dtype == "object":
                values = np.array([_json(v) for v in values])
            arrays[f"{label}_{i}"] = values
            spec.append([column, dtype])
        frames[label] = dict(columns=spec, attrs=frame.attrs)
    arrays["metadata"] = np.array(_json(dict(schema=SCHEMA, key=key,
                                              frames=frames, provenance=provenance)))
    fd, temporary = tempfile.mkstemp(prefix=".building-", suffix=".npz", dir=directory)
    try:
        with os.fdopen(fd, "wb") as stream:
            np.savez_compressed(stream, **arrays)
        os.replace(temporary, directory / f"{key}.npz")
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def read_snapshot(key, directory=CACHE_DIR):
    path = Path(directory) / f"{key}.npz"
    source = path
    if not path.is_file():
        # Static assets keep the 234 datasets out of the Python function bundle.
        # Fixed same-site origin and hash-only filename; no user URL or credentials.
        if not os.environ.get("VERCEL") or directory != CACHE_DIR:
            return None
        if key not in published_default_keys():
            return None
        try:
            with urlopen(f"https://saldop.vercel.app/default-ld-cache/{key}.npz", timeout=8) as response:
                body = response.read(32 * 1024 * 1024 + 1)
                if len(body) > 32 * 1024 * 1024:
                    raise ValueError("Oversized LD snapshot")
                source = io.BytesIO(body)
        except HTTPError as error:
            if error.code != 404:
                logging.warning("Default LD asset unavailable: HTTP %s", error.code)
            return None
        except (URLError, TimeoutError, ValueError):
            logging.warning("Default LD asset unavailable; running the normal simulation")
            return None
    try:
        with np.load(source, allow_pickle=False) as archive:
            metadata = json.loads(str(archive["metadata"]))
            if metadata["schema"] != SCHEMA or metadata["key"] != key:
                raise ValueError("Snapshot version/key mismatch")
            frames = []
            for label in ("result", "summary"):
                spec = metadata["frames"][label]
                frame = pd.DataFrame({column: (np.array([json.loads(v) for v in archive[f"{label}_{i}"]], dtype=object)
                                               if dtype == "object" else archive[f"{label}_{i}"].astype(dtype))
                                      for i, (column, dtype) in enumerate(spec["columns"])})
                frame.attrs = spec["attrs"]
                frames.append(frame)
            return tuple(frames)
    except Exception:
        # Broken/missing artifact must never block a custom or default simulation.
        logging.exception("Ignoring invalid default LD snapshot %s", path.name)
        return None
