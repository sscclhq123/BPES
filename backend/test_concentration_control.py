import unittest
from unittest.mock import patch

import pandas as pd

from backend.solar_ld_engine import (
    CollectorConfig, SystemConfig, controlled_regeneration, regeneration_water_demand,
    humidity_ratio_from_trh, moist_air_enthalpy, run_simulation,
)


class ConcentrationControlTests(unittest.TestCase):
    def controller(self, demand, auto=False):
        config = SystemConfig(reg_temp_auto_control=auto, reg_flow_auto_control=False)
        w = humidity_ratio_from_trh(30, 70)
        return controlled_regeneration(config, 30, 70, w, moist_air_enthalpy(30, w),
                                       0.36, 0.396, 1, 0.38, demand)

    def test_feedforward_and_recovery_are_water_mass_balance(self):
        # 152 kg salt needs 248 kg water at 38%; another 10 kg must be removed.
        rate = regeneration_water_demand(152, 258, .38, 50 / 3600, 3600, 60)
        self.assertAlmostEqual(rate * 3600, 60)

    def test_fixed_mode_reduces_duration_not_instantaneous_desorption(self):
        full, temp, _, capacity, _ = self.controller(1)
        partial, partial_temp, duty, _, _ = self.controller(capacity * .3)
        self.assertEqual(temp, partial_temp)
        self.assertEqual(full, partial)
        self.assertAlmostEqual(duty, .3)
        self.assertAlmostEqual(partial['m_water_desorb'] * duty, capacity * .3)

    def test_auto_temperature_and_capacity_limit(self):
        _, _, _, capacity, _ = self.controller(1)
        result, temp, duty, maximum, _ = self.controller(capacity * .85, auto=True)
        self.assertGreaterEqual(temp, 48.5)
        self.assertLessEqual(temp, 59.4)
        self.assertAlmostEqual(result['m_water_desorb'] * duty, capacity * .85)
        _, _, overloaded_duty, _, _ = self.controller(maximum * 2, auto=True)
        self.assertEqual(overloaded_duty, 1)

    def run_day(self, reg_factor=1, temperature=30, humidity=70):
        times = pd.date_range('2001-08-12', periods=48, freq='h')
        weather = pd.DataFrame({'time': times, 'Ta_degC': temperature, 'RH_pct': humidity,
                                'dt_s': 3600., 'dt_h': 1., 'GHI_Wh_m2': 0.,
                                'DNI_Wh_m2': 0., 'DHI_Wh_m2': 0.,
                                'IT_COLLECTOR_Wh_m2': 0., 'GT_COLLECTOR_W_m2': 0.})
        config = SystemConfig(sa_abs_m3h=7745, lg_ratio_reg_design=1.1,
                              sa_reg_factor=reg_factor, reg_temp_auto_control=True)
        with patch('backend.solar_ld_engine.prepare_weather', return_value=weather):
            result, _ = run_simulation('unused', 'flat_plate', config,
                                      CollectorConfig(area_m2=0))
        return result

    def test_sufficient_regenerator_holds_concentration_from_first_operating_hour(self):
        result = self.run_day(reg_factor=2)
        self.assertGreater(result.loc[result.time.dt.hour == 9, 'REG_DUTY_FRACTION'].iloc[0], 0)
        self.assertGreaterEqual(result.TANK_xi_NEXT.min(), .3799)
        self.assertLessEqual(result.TANK_xi_NEXT.max(), .38 + 1e-10)
        self.assertTrue(result.REG_DUTY_FRACTION.between(0, 1).all())
        # Independent flow modulation may satisfy demand without duty cycling.
        active = result[result.REG_DUTY_FRACTION > 0]
        self.assertTrue((active.REG_SOL_IN_mdot_kg_s > 0).all())
        self.assertTrue((active.REG_SOL_IN_mdot_kg_s <= active.REG_ACTIVE_MODULE_COUNT * .48 + 1e-9).all())

    def test_capacity_shortage_protects_domain_and_conserves_salt_and_water(self):
        result = self.run_day(reg_factor=.2, temperature=32, humidity=85)
        self.assertGreater(result.REG_CAPACITY_DEFICIT_HOURS.sum(), 0)
        self.assertGreater(result.ABS_PROTECTION_HOURS.sum(), 0)
        self.assertGreaterEqual(result.TANK_xi_NEXT.min(), .364 - 1e-10)
        self.assertLessEqual(result.TANK_xi_NEXT.max(), .38 + 1e-10)
        salt = result.TANK_Msol_NEXT_kg * result.TANK_xi_NEXT
        self.assertLess(salt.max() - salt.min(), 1e-8)
        net_water = ((result.ABS_WATER_ABSORB_kg_h - result.REG_WATER_DESORB_kg_h) * result.dt_h).sum()
        initial_mass = salt.iloc[0] / .38
        self.assertAlmostEqual(result.TANK_Msol_NEXT_kg.iloc[-1] - initial_mass, net_water, places=7)
        self.assertEqual(result.REG_MODULE_COUNT.nunique() if 'REG_MODULE_COUNT' in result else 1, 1)


if __name__ == '__main__':
    unittest.main()
