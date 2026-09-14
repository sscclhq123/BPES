import unittest
from dataclasses import replace
from unittest.mock import patch
import pandas as pd
from backend import solar_ld_engine as e
from backend.server import DEFAULT_WEATHER

class ControlCacheTest(unittest.TestCase):
    def test_exact_state_cache_does_not_change_balances_or_controls(self):
        c=e.SystemConfig(sa_abs_m3h=7745,sim_months=(7,),reg_capacity_auto_size=True,reg_vav_control=True,reg_temp_auto_control=True,reg_flow_control_by_tes=False)
        collector=e.CollectorConfig(area_m2=0)
        w=e.prepare_weather(DEFAULT_WEATHER,collector,c)
        w=w[(w.time.dt.day==31)&w.time.dt.hour.between(9,18)].reset_index(drop=True)
        with patch.object(e,'prepare_weather',return_value=w):
            cached,_=e.run_simulation(DEFAULT_WEATHER,'flat_plate',c,collector,trace_times=[str(t) for t in w.time])
            uncached,_=e.run_simulation(DEFAULT_WEATHER,'flat_plate',replace(c,control_cache_enabled=False),collector,trace_times=[str(t) for t in w.time])
        self.assertGreater(cached.attrs['control_cache_hits'],0)
        pd.testing.assert_frame_equal(cached,uncached,check_exact=True)
        self.assertEqual(cached.attrs['substep_trace'],uncached.attrs['substep_trace'])
