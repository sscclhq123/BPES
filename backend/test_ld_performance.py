import unittest
import pandas as pd
from ld_performance import area_ratio, ld_performance


class PerformanceTests(unittest.TestCase):
    def test_area(self):
        self.assertEqual(area_ratio(500, 1000), 50)
        self.assertEqual(area_ratio(1500, 1000), 150)
        for area in (0, -1, None, float('nan')):
            self.assertIsNone(area_ratio(500, area))

    def frame(self):
        return pd.DataFrame({
            'time':['2020-01-01 00:00','2020-02-01 00:00'], 'dt_h':[.5,1],
            'ABS_WATER_ABSORB_kg_h':[20,0], 'TARGET_MOISTURE_REMOVAL_kg_h':[10,5],
            'REG_WATER_DESORB_kg_h':[0,10], 'REG_HX_HEAT_NEED_kWh':[0,8],
            'REG_DUTY_FRACTION':[0,.5], 'Ta_degC':[32,29], 'OA_w_kgkg':[.015,.015]})

    def test_integrated_and_no_surplus_credit(self):
        p=ld_performance(self.frame())
        self.assertEqual(p['total']['targetServedPct'],50)
        self.assertEqual(p['total']['waterBalancePct'],100)
        self.assertEqual(p['total']['specificRegenHeat'],.8)
        self.assertEqual(p['total']['regenWeatherOutsideHours'],.5)
        self.assertEqual(p['total']['regenWeatherOutsidePct'],100)
        self.assertIsNone(p['monthly'][0]['specificRegenHeat'])
        self.assertIsNone(p['monthly'][1]['waterBalancePct'])

    def test_off_hours_and_boundaries(self):
        f=self.frame()
        f['Ta_degC']=[-20,30.3]
        f['OA_w_kgkg']=[.001,.022]
        self.assertEqual(ld_performance(f)['total']['regenWeatherOutsideHours'],0)

if __name__=='__main__':
    unittest.main()
