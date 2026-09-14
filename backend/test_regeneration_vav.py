import unittest
import math
from dataclasses import replace
from unittest.mock import patch
import pandas as pd
from backend import solar_ld_engine as e
from backend.server import build_configs, DEFAULT_WEATHER


class RegenerationVavTests(unittest.TestCase):
    def config(self, **changes):
        return replace(e.SystemConfig(sa_abs_m3h=7745, sim_months=(7,),
            reg_capacity_auto_size=True, reg_vav_control=True,
            reg_temp_auto_control=True, reg_flow_control_by_tes=False), **changes)

    def test_on_flow_bounds_module_domains_and_linked_pump(self):
        for lg in [.65, 1.2, 2.0]:
            for limit in [1, 2, 3]:
                c=self.config(reg_fixed_lg=lg, reg_max_air_ratio=limit)
                amin,amax=e.regeneration_air_domain(c)
                absorber=c.sa_abs_m3h/3600*c.rho_air_kg_m3
                modules=math.ceil(absorber*limit/amax)
                w=e.humidity_ratio_from_trh(33,70);h=e.moist_air_enthalpy(33,w)
                if not e.regeneration_vav_domains(c,modules):
                    # At endpoint L/G the per-module flow interval collapses.
                    # A 1x-only budget need not fit an integer module count.
                    with self.assertRaises(ValueError):
                        e.controlled_regeneration(c,33,70,w,h,0,0,modules,.38,.02)
                    continue
                for need in [0, .0001, .005, .02, .08]:
                    r,t,d,cap,_=e.controlled_regeneration(c,33,70,w,h,0,0,modules,.38,need)
                    air=r['controlled_air_kg_s'];sol=r['controlled_solution_kg_s'];n=r['controlled_modules']
                    self.assertGreaterEqual(air+1e-9,absorber)
                    self.assertLessEqual(air,absorber*limit+1e-9)
                    self.assertTrue(amin-1e-9<=air/n<=amax+1e-9)
                    self.assertAlmostEqual(sol/air,lg)
                    self.assertLessEqual(r['m_water_desorb']*d,need+1e-9)
                    self.assertTrue(48.5<=t<=59.4)
                    if need==0:self.assertEqual(d,0)
                    if need==.08:self.assertLess(cap,need)

    def test_website_defaults_and_hard_maximum(self):
        for value in [.9, 3.01, float('nan')]:
            with self.assertRaises(ValueError):build_configs({'regenMaxAirRatio':value})

    def test_tank_and_heat_balance_with_after_hours_recovery(self):
        c=self.config(xi_tank_init=.37,xi_target=.38)
        collector=e.CollectorConfig(area_m2=0)
        weather=e.prepare_weather(DEFAULT_WEATHER,collector,c)
        weather=weather[(weather.time.dt.day==31)&weather.time.dt.hour.between(13,20)].reset_index(drop=True)
        with patch.object(e,'prepare_weather',return_value=weather):
            result,_=e.run_simulation(DEFAULT_WEATHER,'flat_plate',c,collector,trace_times=[str(t) for t in weather.time])
        self.assertLess(result.RES_SOLTANK_kJ.abs().max(),1e-6)
        self.assertLess(result.REG_HX_BALANCE_RESIDUAL_kWh.abs().max(),1e-8)
        for s in result.attrs['substep_trace']:
            self.assertAlmostEqual(s['waterEndKg'],s['waterStartKg']+s['absorbedKg']-s['desorbedKg'],places=7)
            if s['regFraction']:
                self.assertGreaterEqual(s['regAirFlow']+1e-9,7745/3600*1.2)
                self.assertLessEqual(s['regAirFlow'],7745/3600*1.2*3+1e-9)
        self.assertTrue(result.TANK_xi_NEXT.between(.364-1e-9,.38+1e-9).all())

    def test_insufficient_capacity_and_closed_equilibrium_are_not_faked(self):
        c=self.config(t_reg_in_target_c=48.5)
        w=e.humidity_ratio_from_trh(60,100);h=e.moist_air_enthalpy(60,w)
        r,t,d,cap,_=e.controlled_regeneration(c,60,100,w,h,0,0,20,.38,.02)
        self.assertEqual(cap,0)
        self.assertEqual(d,0)
        self.assertEqual(r['m_water_desorb'],0)

    def test_recovery_after_absorber_schedule_ends(self):
        c=self.config(xi_tank_init=.37,xi_target=.38)
        col=e.CollectorConfig(area_m2=0)
        weather=e.prepare_weather(DEFAULT_WEATHER,col,c)
        weather=weather[(weather.time.dt.day==31)&weather.time.dt.hour.between(18,20)].reset_index(drop=True)
        with patch.object(e,'prepare_weather',return_value=weather):
            result,_=e.run_simulation(DEFAULT_WEATHER,'flat_plate',c,col)
        self.assertTrue((result.ABS_DUTY_FRACTION==0).all())
        self.assertTrue((result.REG_DUTY_FRACTION>0).all())
        self.assertGreater(result.TANK_xi_NEXT.iloc[-1],.379)
        self.assertLess(result.TANK_xi_NEXT.iloc[0],.38)
