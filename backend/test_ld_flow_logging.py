import json
import unittest
from unittest.mock import patch

import pandas as pd
from backend import solar_ld_engine as engine
from backend.server import DEFAULT_WEATHER, ld_flow_hourly


class FlowLoggingTests(unittest.TestCase):
    def test_off_and_partial_duty_encoding(self):
        row = dict(time=pd.Timestamp("2001-07-31 14:00"), dt_h=1,
                   ABS_DUTY_FRACTION=.5, REG_DUTY_FRACTION=.25,
                   ABS_LG_CONTROLLED=2, REG_SOL_IN_LG=1.2,
                   ABS_AIR_IN_mdot_ON_kg_s=2, ABS_SOL_IN_mdot_kg_s=2,
                   REG_AIR_IN_mdot_kg_s=.5, REG_SOL_IN_mdot_kg_s=.6,
                   REG_ACTIVE_MODULE_COUNT=1.25)
        off = dict(row, ABS_DUTY_FRACTION=0, REG_DUTY_FRACTION=0)
        encoded = ld_flow_hourly(pd.DataFrame([row, off]))
        self.assertEqual(encoded["version"], 1)
        self.assertEqual(encoded["rows"][0][6:], [2, 4, 2, 2.4, 5])
        self.assertEqual(encoded["rows"][1][4:], [None]*7)
        json.dumps(encoded, allow_nan=False)

    def test_minute_and_hourly_mass_agree(self):
        c = engine.SystemConfig(sa_abs_m3h=7745, sim_months=(7,),
            reg_temp_auto_control=True, reg_capacity_auto_size=True,
            reg_flow_control_by_tes=False)
        collector = engine.CollectorConfig(area_m2=0)
        weather = engine.prepare_weather(DEFAULT_WEATHER, collector, c)
        weather = weather[(weather.time.dt.day==31)&weather.time.dt.hour.between(13,18)].reset_index(drop=True)
        with patch.object(engine, "prepare_weather", return_value=weather):
            result, _ = engine.run_simulation(DEFAULT_WEATHER, "flat_plate", c,
                collector, trace_times=[str(t) for t in weather.time])
        logged = ld_flow_hourly(result)
        steps = result.attrs["substep_trace"]
        for row in logged["rows"]:
            stamp, seconds, ad, rd, alg, rlg, aa, al, ra, rl, modules = row
            minute = [s for s in steps if s["time"][:13]==stamp[:13]]
            if ad:
                self.assertAlmostEqual(alg, al/aa, places=6)
                mass = sum((s["absSolutionFlow"] or 0)*s["absFraction"]*s["durationSeconds"] for s in minute)
                self.assertAlmostEqual(mass, al*ad*seconds, delta=.001)
            if rd:
                self.assertAlmostEqual(rlg, rl/ra, places=6)
                self.assertAlmostEqual(rlg, c.reg_fixed_lg, places=6)
                mass = sum((s["regSolutionFlow"] or 0)*s["regFraction"]*s["durationSeconds"] for s in minute)
                self.assertAlmostEqual(mass, rl*rd*seconds, delta=.001)
                self.assertGreater(modules, 0)
            else:
                self.assertIsNone(rlg)
                self.assertIsNone(ra)
        for s in steps:
            if s["regFraction"]>0:
                self.assertAlmostEqual(s["regLg"], s["regSolutionFlow"]/s["regAirFlow"], places=8)
        json.dumps(logged, allow_nan=False)


if __name__ == "__main__":
    unittest.main()
