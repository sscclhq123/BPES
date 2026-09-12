import unittest
from dataclasses import replace
from unittest.mock import patch
import pandas as pd
from backend import solar_ld_engine as e
from backend.server import DEFAULT_WEATHER, build_configs


class RegenerationSizingTests(unittest.TestCase):
    def config(self, **kw):
        return replace(e.SystemConfig(sa_abs_m3h=7745, sim_months=(7,), reg_temp_auto_control=True,
            reg_capacity_auto_size=True, reg_flow_control_by_tes=False), **kw)

    def test_independent_capacity_and_budget(self):
        c=self.config()
        weather=pd.DataFrame([dict(time=pd.Timestamp('2001-07-31 14:00'),Ta_degC=32.4,RH_pct=78)])
        design=e.size_regeneration_bank(weather,c,7745/3600*1.2)
        self.assertGreater(design['modules'],7)
        self.assertLessEqual(design['airRatio'],3)
        capped=e.size_regeneration_bank(weather,replace(c,reg_max_air_ratio=1),7745/3600*1.2)
        self.assertTrue(capped['limited'])
        self.assertLessEqual(capped['airRatio'],1)

    def test_linked_flows_and_invalid_lg(self):
        c=self.config();w=e.humidity_ratio_from_trh(32.4,78);h=e.moist_air_enthalpy(32.4,w)
        for need in [.002,.02,.04]:
            r,t,d,cap,_=e.controlled_regeneration(c,32.4,78,w,h,2.58,2.84,19,.38,need)
            self.assertAlmostEqual(r['controlled_solution_kg_s']/r['controlled_air_kg_s'],1.2)
            self.assertTrue(19*.24-1e-9<=r['controlled_air_kg_s']<=19*.4+1e-9)
            self.assertLessEqual(r['m_water_desorb']*d,need+1e-9)
        with self.assertRaises(ValueError):e.regeneration_air_domain(replace(c,reg_fixed_lg=3))
        with self.assertRaises(ValueError):build_configs({'regenMaxAirRatio':float('nan')})

    def test_high_capacity_tank_stability_and_minute_logs(self):
        c=self.config();collector=e.CollectorConfig(area_m2=0)
        weather=e.prepare_weather(DEFAULT_WEATHER,collector,c)
        weather=weather[(weather.time.dt.day==31)&weather.time.dt.hour.between(13,16)].reset_index(drop=True)
        times=[str(t) for t in weather.time]
        with patch.object(e,'prepare_weather',return_value=weather):
            result,summary=e.run_simulation(DEFAULT_WEATHER,'flat_plate',c,collector,trace_times=times)
            legacy,_=e.run_simulation(DEFAULT_WEATHER,'flat_plate',replace(c,reg_capacity_auto_size=False),collector)
        steps=result.attrs['substep_trace']
        self.assertEqual(len(steps),240)
        self.assertLess(summary.iloc[0].LD_integration_step_s,60)
        self.assertTrue(result.TANK_xi_NEXT.between(.364-1e-9,.38+1e-9).all())
        self.assertGreater(result.TANK_xi_NEXT.min(),.3799)
        self.assertLess(result.SUPPLY_AIR_w_kgkg.max(),.0105)
        self.assertGreater(legacy.SUPPLY_AIR_w_kgkg.max(),.015)
        self.assertTrue(result.TANK_T_NEXT_degC.between(0,80).all())
        self.assertLess(result.RES_SOLTANK_kJ.abs().max(),1e-6)
        self.assertLess(result.REG_HX_BALANCE_RESIDUAL_kWh.abs().max(),1e-8)
        self.assertAlmostEqual(sum(s['absorbedKg'] for s in steps),result.ABS_WATER_ABSORB_kg_h.sum())
        for s in steps:
            self.assertEqual(s['durationSeconds'],60)
            self.assertAlmostEqual(s['waterEndKg'],s['waterStartKg']+s['absorbedKg']-s['desorbedKg'],places=7)
        for a,b in zip(steps,steps[1:]):self.assertAlmostEqual(a['waterEndKg'],b['waterStartKg'])

    def test_no_regeneration_capacity_is_not_faked(self):
        c=self.config(t_reg_in_target_c=48.5)
        weather=pd.DataFrame([dict(time=pd.Timestamp('2001-07-31 14:00'),Ta_degC=60,RH_pct=100)])
        design=e.size_regeneration_bank(weather,c,2.58)
        self.assertTrue(design['limited'])
        self.assertEqual(design['zeroCapacityHours'],1)
