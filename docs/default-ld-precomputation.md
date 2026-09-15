# Default annual LD precomputation

## Scope

13 registered EPWs × 6 building uses × 3 sizes = **234 default cases**.
The canonical payloads are in `backend/default_load_cache.py` and mirror the
studio building templates: annual weather, default airflow/schedule, automatic
LD controls, 38% concentration target, regenerator L/G 1.2, airflow limit 3×,
evacuated-tube collector selection, TES supply/return 60/45°C.

This stores **annual LD load results**, not final design responses. Collector
coverage, area sizing, monthly ideal-TES allocation, and auxiliary energy are
recomputed by the existing API for every request. A nondefault LD condition,
selected-month calculation, uploaded weather, or flat-plate selection falls back
to normal simulation. Identical effective LD conditions can reuse a snapshot
even if non-LD metadata such as the building label changes.

No arbitrary user calculation is written to the default store. The numerical
engine, control bounds, integration timestep, and TES assumptions are unchanged.
Detailed minute-trace requests retain their existing replay calculation.

## Correctness / invalidation

The filename is SHA-256 of the full effective SystemConfig, CollectorConfig,
collector type, compressed EPW bytes, engine source bytes, and storage schema.
Changing an effective parameter, weather file, or engine source causes a miss.
For numerical dependency upgrades, bump SCHEMA and regenerate the catalog/data.

NPZ stores full-precision typed columns without pickle or decimal rounding.
The builder checks all 8,760 hourly rows, exact DataFrame round-trip equality,
and result metadata. Missing, obsolete, or unreadable files fall back to the
normal calculation; they do not produce an empty/partial design result.

## Storage / deployment

Artifacts: `data/default_ld_cache/<sha256>.npz`.
Default-key allowlist: `backend/default_ld_catalog.json` (234 keys).
Vercel serves files as static assets at `/default-ld-cache/<sha256>.npz` with
immutable caching. They are excluded from the Python function bundle to avoid
its size limit. Production retrieves only allowlisted hashes from the fixed
`https://saldop.vercel.app` origin; local runs read local files. No new service,
database, account, or secret is required.

API response `loadCache.hit` reports whether the annual LD result was reused;
`loadCache.solarSizing` remains `live`. An allowlisted file absent from a partial
deployment triggers the existing full calculation until that file is published.

## Rebuild / resume

Run `python3 scripts/precompute_default_ld.py --workers 3` from the repository
with numpy/pandas installed. It regenerates the catalog and skips valid existing
files. JSON-line stdout reports each completed/failed case. Narrow checks use
`--city seoul_epw --preset office_medium`. `--catalog-only` regenerates only keys.
Generated files must be committed/deployed alongside the matching code/catalog.
Do not deploy `.building-*` temporary files. No automatic deletion of old data.

## Validation recorded 2026-09-15

- Seoul medium office annual generation: 18.63 s; snapshot 887,179 bytes.
- Local cached complete API calculation: 50% coverage 2.30 s; 100% 2.42 s.
- Annual solver was mocked to raise if called during both cached API checks.
- Regeneration requirement stayed 143,109.43999158737 kWh; collector area changed
  from 442.2 m² to 884.3 m² (existing model outputs, not new validation claims).
- Unit tests cover exact round trip, corrupted/missing fallback, coverage reuse,
  and cache misses for changed LD/period/weather/engine conditions.

## Existing scientific limitation (not changed here)

The current `prepare_weather` calls solar decomposition/transposition with Seoul
coordinate defaults for every EPW. This pre-existing foreign-city solar issue is
not fixed by caching. Solar results must not be treated as independently validated
by this performance change. A future engine fix invalidates these stored keys;
the load-only ideal-auxiliary calculation and the live solar allocation remain
separate. No approximation was added to speed up the physics.
