"""Resumable offline generation of the 13 x 18 DEFAULT annual LD snapshots.

Run with --workers 3. Existing matching artifacts are verified and skipped.
No simulation approximation; this calls the same engine/config as the API.
"""
import argparse
import json
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.server import WEATHER_DATASETS, build_configs, resolve_weather_file
from backend.solar_ld_engine import run_simulation
from backend.default_load_cache import (CACHE_DIR, PRESETS, default_payload,
                                       CATALOG_PATH, signature, read_snapshot, write_snapshot)


def write_catalog():
    keys = {}
    for city in WEATHER_DATASETS:
        for preset in PRESETS:
            payload = default_payload(city, preset)
            kind, collector, config = build_configs(payload)
            config = replace(config, reg_flow_control_by_tes=False,
                             t_tes_init_c=config.t_tes_min_c, ua_tes_w_k=0.0)
            key = signature(resolve_weather_file(payload), kind, config,
                            replace(collector, area_m2=0.0))
            keys[key] = dict(city=city, preset=preset)
    CATALOG_PATH.write_text(json.dumps(dict(keys=keys), indent=2) + "\n")
    print(json.dumps(dict(event="catalog", defaults=len(keys))), flush=True)


def build_one(job):
    city, preset = job
    start = time.monotonic()
    payload = default_payload(city, preset)
    kind, collector, config = build_configs(payload)
    config = replace(config, reg_flow_control_by_tes=False,
                     t_tes_init_c=config.t_tes_min_c, ua_tes_w_k=0.0)
    collector = replace(collector, area_m2=0.0)
    weather = resolve_weather_file(payload)
    key = signature(weather, kind, config, collector)
    reused = read_snapshot(key) is not None
    if not reused:
        result, summary = run_simulation(weather, kind, config=config, collector=collector)
        if len(result) != 8760 or not result.time.is_monotonic_increasing:
            raise ValueError(f"Incomplete annual result: {city}/{preset}")
        write_snapshot(key, result, summary, dict(city=city, preset=preset, payload=payload))
        restored, restored_summary = read_snapshot(key)
        # Check every value/dtype: storage must not change scientific outputs.
        import pandas as pd
        pd.testing.assert_frame_equal(result, restored, check_exact=True)
        pd.testing.assert_frame_equal(summary, restored_summary, check_exact=True)
        if result.attrs != restored.attrs:
            raise ValueError("Result metadata did not round-trip")
    return dict(city=city, preset=preset, key=key, reused=reused,
                seconds=round(time.monotonic()-start, 2),
                bytes=(CACHE_DIR / f"{key}.npz").stat().st_size)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--city", choices=list(WEATHER_DATASETS))
    parser.add_argument("--preset", choices=list(PRESETS))
    parser.add_argument("--catalog-only", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.workers <= 8:
        parser.error("Use 1–8 workers")
    write_catalog()
    if args.catalog_only:
        return 0
    jobs = [(city, preset) for city in ([args.city] if args.city else WEATHER_DATASETS)
            for preset in ([args.preset] if args.preset else PRESETS)]
    print(json.dumps(dict(event="start", total=len(jobs), workers=args.workers)), flush=True)
    failures = []
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(build_one, job): job for job in jobs}
        for completed, future in enumerate(as_completed(futures), 1):
            try:
                print(json.dumps(dict(event="complete", completed=completed,
                                      total=len(jobs), **future.result())), flush=True)
            except Exception as error:
                failures.append(futures[future])
                print(json.dumps(dict(event="error", job=futures[future],
                                      error=str(error))), flush=True)
    print(json.dumps(dict(event="finished", total=len(jobs), failures=failures)), flush=True)
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
