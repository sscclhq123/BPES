import unittest

import pandas as pd

from backend.solar_ld_engine import (
    SystemConfig,
    apply_absorber_outlier_control,
    absorber_block,
    humidity_ratio_from_trh,
    is_operation_hour,
    moist_air_enthalpy,
    parallel_absorber_block,
    required_parallel_modules,
    staged_regenerator_flow,
)


class ParallelModuleTests(unittest.TestCase):
    def setUp(self):
        self.config = SystemConfig(sa_abs_m3h=7745, lg_ratio_abs=1.1, lg_ratio_reg_design=1.1)
        self.air_flow = self.config.sa_abs_m3h / 3600 * self.config.rho_air_kg_m3
        self.solution_flow = self.air_flow * self.config.lg_ratio_abs

    def test_office_medium_condition_uses_four_absorber_modules(self):
        absorber_modules = required_parallel_modules(
            self.air_flow,
            self.solution_flow,
            self.config.abs_module_air_min_kg_s,
            self.config.abs_module_air_max_kg_s,
            self.config.abs_module_solution_min_kg_s,
            self.config.abs_module_solution_max_kg_s,
            "흡수기",
        )
        regenerator_modules = required_parallel_modules(
            self.air_flow,
            self.solution_flow,
            self.config.reg_module_air_min_kg_s,
            self.config.reg_module_air_max_kg_s,
            self.config.reg_module_solution_min_kg_s,
            self.config.reg_module_solution_max_kg_s,
            "재생기",
        )

        self.assertEqual(absorber_modules, 4)
        self.assertEqual(regenerator_modules, 7)
        self.assertAlmostEqual(self.air_flow / absorber_modules, 0.64542, places=5)
        self.assertAlmostEqual(self.solution_flow / absorber_modules, 0.70996, places=5)

    def test_park_absorber_defaults_match_supplied_model_domain(self):
        self.assertEqual(self.config.xi_tank_init, 0.38)
        self.assertEqual(self.config.xi_target, 0.38)
        self.assertEqual(self.config.abs_module_air_min_kg_s, 0.15)
        self.assertEqual(self.config.abs_module_air_max_kg_s, 0.73)
        self.assertEqual(self.config.abs_module_solution_min_kg_s, 0.63)
        self.assertEqual(self.config.abs_module_solution_max_kg_s, 2.08)

    def test_matlab_absorber_outlier_control_is_reproduced_exactly(self):
        self.assertEqual(apply_absorber_outlier_control(0.695), 0.695)
        self.assertEqual(apply_absorber_outlier_control(0.700), 0.700)
        self.assertEqual(apply_absorber_outlier_control(0.701), 0.690)

    def test_parallel_absorber_scales_mass_transfer_only(self):
        module_count = 4
        outdoor_temp = 28.0
        outdoor_rh = 75.0
        outdoor_w = humidity_ratio_from_trh(outdoor_temp, outdoor_rh)
        outdoor_h = moist_air_enthalpy(outdoor_temp, outdoor_w)
        module = absorber_block(
            outdoor_temp,
            outdoor_rh,
            outdoor_w,
            outdoor_h,
            self.config.p_atm_kpa,
            self.air_flow / module_count,
            self.solution_flow / module_count,
            25.0,
            0.38,
            self.config.eff_enthalpy,
        )
        total = parallel_absorber_block(
            outdoor_temp,
            outdoor_rh,
            outdoor_w,
            outdoor_h,
            self.config.p_atm_kpa,
            self.air_flow,
            self.solution_flow,
            module_count,
            25.0,
            0.38,
            self.config.eff_enthalpy,
        )

        self.assertGreater(total["m_water_absorb"], 0)
        self.assertAlmostEqual(total["m_water_absorb"], module["m_water_absorb"] * module_count, places=12)
        self.assertAlmostEqual(total["w_air_out"], module["w_air_out"], places=12)
        self.assertAlmostEqual(total["xi_out"], module["xi_out"], places=12)

    def test_regenerator_stages_modules_within_domain(self):
        solution_flow, air_flow, active_modules = staged_regenerator_flow(0.50, 1.1, 7, self.config)

        self.assertEqual(active_modules, 1)
        self.assertAlmostEqual(solution_flow, 0.44, places=12)
        self.assertAlmostEqual(air_flow, 0.40, places=12)

    def test_invalid_lg_ratio_has_no_parallel_solution(self):
        with self.assertRaisesRegex(ValueError, "병렬 모듈"):
            required_parallel_modules(
                self.air_flow,
                self.air_flow * 0.5,
                self.config.abs_module_air_min_kg_s,
                self.config.abs_module_air_max_kg_s,
                self.config.abs_module_solution_min_kg_s,
                self.config.abs_module_solution_max_kg_s,
                "흡수기",
            )

    def test_operation_schedule_is_applied_by_hour(self):
        nine_hour_config = SystemConfig(operation_start_hour=9, operation_hours_per_day=9)
        all_day_config = SystemConfig(operation_start_hour=9, operation_hours_per_day=24)

        self.assertFalse(is_operation_hour(pd.Timestamp("2025-07-01 08:00"), nine_hour_config))
        self.assertTrue(is_operation_hour(pd.Timestamp("2025-07-01 09:00"), nine_hour_config))
        self.assertTrue(is_operation_hour(pd.Timestamp("2025-07-01 17:00"), nine_hour_config))
        self.assertFalse(is_operation_hour(pd.Timestamp("2025-07-01 18:00"), nine_hour_config))
        self.assertTrue(is_operation_hour(pd.Timestamp("2025-07-01 02:00"), all_day_config))


if __name__ == "__main__":
    unittest.main()
