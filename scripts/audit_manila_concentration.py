"""Read-only model audit: annual state continuity, selected minute logs.

Outputs are diagnostic artifacts; this does not change website controls or TES.
Run from repository root using the bundled Python runtime.
"""
import json
import sys
import time
from dataclasses import asdict, replace
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.server import build_configs, resolve_weather_file
from backend.solar_ld_engine import run_simulation


def main():
    payload = dict(weatherDataset="manila_tmy", airflow=7745, operationHours=9,
                   solutionConcentration=38, lgRatio=1, absSolutionTemp=25,
                   absTempMode="auto", lgMode="auto", regenMode="auto",
                   regenTemp=59.4, regenLgRatio=1.2, regenMaxAirRatio=3,
                   targetAbsHumidity=10, targetHumidityTolerance=.5,
                   tesSupplyTemp=60, tesReturnTemp=45, collectorType="evacuated")
    kind, collector, config = build_configs(payload)
    config = replace(config, reg_flow_control_by_tes=False,
                     t_tes_init_c=config.t_tes_min_c, ua_tes_w_k=0)
    limit = float(sys.argv[1]) if len(sys.argv) > 1 else 3
    # Counterfactual only: re-size modules as well as the airflow budget.
    config = replace(config, reg_max_air_ratio=limit)
    days = ['2001-05-25', '2001-05-26', '2001-05-27',
            '2001-05-30', '2001-05-31', '2001-06-01',
            '2001-11-16', '2001-11-17', '2001-11-18']
    stamps = [str(t) for day in days for t in pd.date_range(day, periods=24, freq='h')]
    stamps.append('2001-12-31 23:00:00')  # Do not stop/reinitialize at selected dates.
    start = time.perf_counter()
    result, summary = run_simulation(resolve_weather_file(payload), kind, config,
                                    replace(collector, area_m2=0), trace_times=stamps)
    out = Path('output/manila-concentration-audit-20260914') / f'{limit:g}x'
    out.mkdir(parents=True, exist_ok=True)
    result.to_csv(out / 'annual-hourly.csv', index=False)
    result[result.time.dt.strftime('%Y-%m-%d').isin(days)].to_csv(out / 'selected-hourly.csv', index=False)
    pd.DataFrame(result.attrs['substep_trace']).to_csv(out / 'selected-minutes.csv', index=False)
    metadata = dict(payload=payload, config=asdict(config),
                    design=result.attrs['regeneration_design'],
                    elapsedSeconds=time.perf_counter()-start,
                    summary=summary.to_dict(orient='records'))
    (out / 'metadata.json').write_text(json.dumps(metadata, default=str, indent=2))
    failures = result[result.SCHEDULE_ON & (result.SUPPLY_AIR_w_kgkg > .0105 + 1e-9)]
    print(json.dumps(dict(path=str(out), seconds=metadata['elapsedSeconds'],
                         rows=len(result), design=metadata['design'],
                         unmet=failures[['time','TANK_xi_START','TANK_xi_NEXT',
                                        'SUPPLY_AIR_w_kgkg']].to_dict(orient='records')), default=str), flush=True)


if __name__ == '__main__':
    main()
