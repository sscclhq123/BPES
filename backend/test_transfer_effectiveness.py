import unittest
from unittest.mock import patch
import numpy as np
from backend import solar_ld_engine as e
from backend.server import DEFAULT_WEATHER
from backend.ld_performance import ld_performance


class TransferTests(unittest.TestCase):
    def test_same_step_and_no_clipping(self):
        a=dict(actual=0., potential=0., invalid_s=0., outside_s=0.)
        e.accumulate_transfer(a,.02,.03,.04,2,10,True)
        self.assertAlmostEqual(a['actual']/a['potential'],.5)
        e.accumulate_transfer(a,.02,.05,.04,2,10,True)
        self.assertEqual(a['outside_s'],10)
        self.assertAlmostEqual(a['actual']/a['potential'],1.)
        e.accumulate_transfer(a,.02,.03,.02,2,10,True)
        self.assertEqual(a['invalid_s'],10)
        e.accumulate_transfer(a,.02,.03,.01,2,0,True)
        self.assertEqual(a['invalid_s'],10)
        b=dict(actual=0., potential=0., invalid_s=0., outside_s=0.)
        e.accumulate_transfer(b,.02,.012,.01,1,30,False)
        self.assertAlmostEqual(b['actual']/b['potential'],.8)

    def test_simulated_logging_water_balance(self):
        c=e.SystemConfig(sa_abs_m3h=7745,sim_months=(7,),reg_capacity_auto_size=True,reg_flow_control_by_tes=False)
        collector=e.CollectorConfig(area_m2=0)
        weather=e.prepare_weather(DEFAULT_WEATHER,collector,c)
        weather=weather[(weather.time.dt.day==31)&weather.time.dt.hour.between(13,18)].reset_index(drop=True)
        with patch.object(e,'prepare_weather',return_value=weather):
            result,_=e.run_simulation(DEFAULT_WEATHER,'flat_plate',c,collector)
        for side,water in [('ABS','ABS_WATER_ABSORB_kg_h'),('REG','REG_WATER_DESORB_kg_h')]:
            self.assertTrue(np.isfinite(result[f'{side}_TRANSFER_potential']).all())
            valid=result[f'{side}_TRANSFER_invalid_s']==0
            np.testing.assert_allclose(result.loc[valid,f'{side}_TRANSFER_actual'],result.loc[valid,water]*result.loc[valid,'dt_h'],atol=1e-7)
        d=ld_performance(result)
        self.assertEqual(d['effectiveness']['version'],1)
        self.assertEqual(len(d['effectiveness']['rows']),len(result))
        self.assertEqual(len(d['effectiveness']['rows'][0]),9)

if __name__=='__main__': unittest.main()
