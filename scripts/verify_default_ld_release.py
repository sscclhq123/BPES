"""Fail a release if default LD snapshots do not match its calculation code.

Build-time verification uses only the Python standard library. Generating the
manifest additionally imports the calculation dependencies and checks all exact
runtime keys. This never re-labels or reuses a mismatched snapshot.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'backend/default_ld_release.json'
SOURCES = ('backend/solar_ld_engine.py', 'backend/server.py',
           'backend/default_load_cache.py')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(root=ROOT):
    manifest = json.loads((root/MANIFEST).read_text())
    catalog = json.loads((root/'backend/default_ld_catalog.json').read_text())['keys']
    if manifest.get('schema') != 1 or set(manifest['snapshots']) != set(catalog):
        raise ValueError('Default LD manifest/catalog mismatch; rebuild defaults')
    if manifest['count'] != len(catalog) or not catalog:
        raise ValueError('Incomplete default LD catalog')
    if set(manifest['sources']) != set(SOURCES):
        raise ValueError('Missing calculation source fingerprints')
    for relative, expected in {**manifest['sources'], **manifest['weather']}.items():
        path = root/relative
        if not path.is_file() or digest(path) != expected:
            raise ValueError(f'Calculation source/weather changed: {relative}; rebuild defaults')
    if digest(root/'backend/default_ld_catalog.json') != manifest['catalogSha256']:
        raise ValueError('Default LD catalog changed after verification')
    for key, expected in manifest['snapshots'].items():
        if len(key) != 64 or any(c not in '0123456789abcdef' for c in key):
            raise ValueError('Invalid snapshot key')
        path = root/'data/default_ld_cache'/f'{key}.npz'
        if not path.is_file() or digest(path) != expected:
            raise ValueError(f'Missing/corrupt default LD snapshot: {key}')
    return len(catalog)


def write_manifest():
    sys.path.insert(0, str(ROOT))
    from dataclasses import replace
    from backend.server import WEATHER_DATASETS, build_configs, resolve_weather_file
    from backend.default_load_cache import PRESETS, default_payload, signature, read_snapshot
    catalog = json.loads((ROOT/'backend/default_ld_catalog.json').read_text())['keys']
    expected_keys, weather, snapshots = {}, {}, {}
    for city in WEATHER_DATASETS:
        for preset in PRESETS:
            payload=default_payload(city,preset)
            kind,col,cfg=build_configs(payload)
            cfg=replace(cfg,reg_flow_control_by_tes=False,
                        t_tes_init_c=cfg.t_tes_min_c,ua_tes_w_k=0.0)
            col=replace(col,area_m2=0.0)
            path=resolve_weather_file(payload)
            key=signature(path,kind,cfg,col)
            expected_keys[key]={'city':city,'preset':preset}
            weather[str(path.relative_to(ROOT))]=digest(path)
            snapshot=ROOT/'data/default_ld_cache'/f'{key}.npz'
            if not snapshot.is_file():
                raise ValueError(f'Missing exact current snapshot: {city}/{preset} ({key})')
            loaded=read_snapshot(key)
            if loaded is None:
                raise ValueError(f'Unreadable snapshot: {city}/{preset}')
            result,summary=loaded
            if len(result)!=8760 or not result.time.is_monotonic_increasing or len(summary)!=1:
                raise ValueError(f'Incomplete annual snapshot: {city}/{preset}')
            snapshots[key]=digest(snapshot)
    if catalog != expected_keys:
        raise ValueError('Catalog does not match exact current runtime keys; rebuild defaults')
    manifest=dict(schema=1,count=len(expected_keys),
                  sources={p:digest(ROOT/p) for p in SOURCES},weather=weather,
                  catalogSha256=digest(ROOT/'backend/default_ld_catalog.json'),snapshots=snapshots)
    (ROOT/MANIFEST).write_text(json.dumps(manifest,indent=2)+'\n')


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--write-manifest',action='store_true')
    args=parser.parse_args()
    if args.write_manifest:
        write_manifest()
    print(f'Default LD release verified: {verify()} exact annual snapshots')
