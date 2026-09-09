import unittest
from unittest.mock import patch
from backend import solar_ld_engine as engine
from backend.server import DEFAULT_WEATHER


class SubstepTraceTest(unittest.TestCase):
    def test_trace_preserves_results_and_water_balance(self):
        config = engine.SystemConfig(sa_abs_m3h=7745, sim_months=(7,), reg_temp_auto_control=True)
        collector = engine.CollectorConfig(area_m2=0)
        weather = engine.prepare_weather(DEFAULT_WEATHER, collector, config)
        weather = weather[(weather.time.dt.day == 31) & weather.time.dt.hour.between(13, 15)].reset_index(drop=True)
        stamp = weather.iloc[1].time
        with patch.object(engine, 'prepare_weather', return_value=weather):
            normal, _ = engine.run_simulation(DEFAULT_WEATHER, 'flat_plate', config, collector)
            traced, _ = engine.run_simulation(DEFAULT_WEATHER, 'flat_plate', config, collector, trace_time=str(stamp))
        steps = traced.attrs['substep_trace']
        self.assertEqual(len(steps), 60)
        self.assertEqual(len(traced), 2)
        expected = normal.iloc[1]
        self.assertAlmostEqual(sum(s['absorbedKg'] for s in steps), expected.ABS_WATER_ABSORB_kg_h, places=9)
        self.assertAlmostEqual(sum(s['desorbedKg'] for s in steps), expected.REG_WATER_DESORB_kg_h, places=9)
        self.assertAlmostEqual(sum(s['supplyHumidity'] * s['durationSeconds'] for s in steps)/3600, expected.SUPPLY_AIR_w_kgkg*1000, places=9)
        self.assertAlmostEqual(steps[-1]['concentrationEnd'], expected.TANK_xi_NEXT*100, places=9)
        self.assertAlmostEqual(sum(s['regenHeatKWh'] for s in steps), expected.REG_HX_HEAT_NEED_kWh, places=9)
        for s in steps:
            self.assertAlmostEqual(s['waterEndKg'], s['waterStartKg']+s['absorbedKg']-s['desorbedKg'], places=8)
            self.assertAlmostEqual(s['concentrationEnd'],s['saltKg']/(s['saltKg']+s['waterEndKg'])*100,places=9)

    def test_invalid_time(self):
        with self.assertRaises(ValueError):
            engine.run_simulation(DEFAULT_WEATHER,'flat_plate',trace_time='2001-07-31 14:30')


if __name__ == '__main__':
    unittest.main()
