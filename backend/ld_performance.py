"""Post-process integrated logs; does not modify physics or invalidate LD caches.

These are operational indicators, not contactor effectiveness or a validation
of every internal time step. Regenerator outlet humidity is a last-step sample
whereas flows are integrated means: never combine them into a fake efficiency.
"""
import math
import pandas as pd


def area_ratio(collector_area, building_area):
    try:
        a, b = float(collector_area), float(building_area)
        return 100 * a / b if math.isfinite(a) and math.isfinite(b) and a >= 0 and b > 0 else None
    except (TypeError, ValueError):
        return None


def ld_performance(result):
    def aggregate(frame):
        dt = frame['dt_h']
        absorbed = frame['ABS_WATER_ABSORB_kg_h'] * dt
        target = frame['TARGET_MOISTURE_REMOVAL_kg_h'] * dt
        released = frame['REG_WATER_DESORB_kg_h'] * dt
        heat = frame['REG_HX_HEAT_NEED_kWh'].sum()
        on_hours = frame['REG_DUTY_FRACTION'] * dt
        outside = (~frame['Ta_degC'].between(30.3, 36.6) |
                   ~(frame['OA_w_kgkg'] * 1000).between(10.5, 22.0))
        ratio = lambda a, b: float(a / b) if b > 1e-9 else None
        return {
            'absorbedKg': float(absorbed.sum()),
            'releasedKg': float(released.sum()),
            'targetKg': float(target.sum()),
            # A surplus in another hour cannot compensate for an unmet hour.
            'targetServedPct': ratio(pd.concat([absorbed, target], axis=1).min(axis=1).sum()*100, target.sum()),
            'waterBalancePct': ratio(released.sum()*100, absorbed.sum()),
            'netWaterKg': float(absorbed.sum()-released.sum()),
            'specificRegenHeat': ratio(heat, released.sum()),
            'regenHeatKWh': float(heat),
            'regenOnHours': float(on_hours.sum()),
            'regenWeatherOutsideHours': float(on_hours[outside].sum()),
            'regenWeatherOutsidePct': ratio(on_hours[outside].sum()*100, on_hours.sum()),
        }
    months = pd.to_datetime(result['time']).dt.month
    # Compact additive quantities, not averages of percentages. Preserve zero/off
    # hours and actual calendar dates for day -> hour drilldown without a rerun.
    dt = result['dt_h']
    absorbed = result['ABS_WATER_ABSORB_kg_h'] * dt
    released = result['REG_WATER_DESORB_kg_h'] * dt
    target = result['TARGET_MOISTURE_REMOVAL_kg_h'] * dt
    served = pd.concat([absorbed, target], axis=1).min(axis=1)
    on = result['REG_DUTY_FRACTION'] * dt
    outside = (~result['Ta_degC'].between(30.3, 36.6) |
               ~(result['OA_w_kgkg'] * 1000).between(10.5, 22.0))
    # Append outdoor conditions; retain indices 0..7 for older consumers.
    hourly = [[str(t), *[round(float(v), 8) if pd.notna(v) and math.isfinite(float(v)) else None for v in values]]
              for t, *values in zip(result['time'], absorbed, released, target,
                                    served, result['REG_HX_HEAT_NEED_kWh'], on, on*outside,
                                    result['Ta_degC'], result['OA_w_kgkg']*1000)]
    columns = [f'{side}_TRANSFER_{key}' for side in ('ABS', 'REG')
               for key in ('actual', 'potential', 'invalid_s', 'outside_s')]
    effectiveness = None
    if all(c in result for c in columns):
        effectiveness = {'version': 1, 'rows': [
            [str(t), *[float(v) for v in values]]
            for t, *values in zip(result['time'], *(result[c] for c in columns))]}
    return {'effectiveness': effectiveness, 'hourlyVersion': 2, 'hourly': hourly, 'total': aggregate(result), 'monthly': [
        {'month': int(month), **aggregate(frame)}
        for month, frame in result.groupby(months, sort=True)
    ]}
