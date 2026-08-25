import unittest
from dataclasses import replace

import pandas as pd

from backend.server import (
    calculate_collector_area_sweep,
    initial_collector_area_candidates,
    refined_collector_area_candidates,
    simulate_tes_grid,
    simulate_tes_tank,
    tes_energy_density_kwh_m3,
    tes_heat_loss_ua_w_k,
    dehumidification_metrics,
    monthly_rows,
    unmet_dehumidification_trend,
)
from backend.solar_ld_engine import CollectorConfig, SystemConfig


class TesOptimizationTests(unittest.TestCase):
    def setUp(self):
        self.config = SystemConfig(
            t_tes_min_c=42,
            t_tes_max_c=75,
            t_tes_init_c=42,
            tes_insulation_k_w_mk=0,
        )
        self.collector = CollectorConfig.for_type("evacuated_tube")

    @staticmethod
    def result_frame(loads, irradiances):
        return pd.DataFrame(
            {
                "time": pd.date_range("2025-07-01", periods=len(loads), freq="h"),
                "dt_h": [1.0] * len(loads),
                "Ta_degC": [30.0] * len(loads),
                "GT_COLLECTOR_W_m2": irradiances,
                "REG_HX_HEAT_NEED_kWh": loads,
            }
        )

    def test_design_flow_limits_hourly_heat_transfer(self):
        result = self.result_frame([100.0], [1000.0])
        design_flow = 0.5
        dispatch = simulate_tes_tank(result, self.config, self.collector, 100, 10, design_flow)
        transfer_limit = design_flow * tes_energy_density_kwh_m3(self.config)

        self.assertLessEqual(dispatch["tesToReg"][0], transfer_limit + 1e-9)
        self.assertLessEqual(dispatch["maxActualFlow"], design_flow + 1e-9)

    def test_storage_shifts_solar_heat_to_later_load(self):
        result = self.result_frame([0.0, 50.0], [1000.0, 0.0])
        without_storage = simulate_tes_tank(result, self.config, self.collector, 100, 0, 5)
        with_storage = simulate_tes_tank(result, self.config, self.collector, 100, 2, 5)

        self.assertEqual(without_storage["storageToReg"][1], 0)
        self.assertGreater(with_storage["storageToReg"][1], 0)
        self.assertLess(with_storage["auxTotal"], without_storage["auxTotal"])

    def test_vectorized_grid_matches_scalar_dispatch(self):
        result = self.result_frame([0.0, 50.0, 20.0], [1000.0, 0.0, 500.0])
        scalar = simulate_tes_tank(result, self.config, self.collector, 80, 2, 0.8)
        grid = simulate_tes_grid(result, self.config, self.collector, 80, [2], [0.8])[0]

        self.assertAlmostEqual(grid["auxTotal"], scalar["auxTotal"], places=9)
        self.assertAlmostEqual(grid["lossTotal"], scalar["lossTotal"], places=9)
        self.assertAlmostEqual(grid["dumpTotal"], scalar["dumpTotal"], places=9)
        self.assertAlmostEqual(grid["tesToRegTotal"], scalar["tesToRegTotal"], places=9)

    def test_tank_ua_scales_with_volume_and_insulation(self):
        config = SystemConfig(tes_insulation_k_w_mk=0.023, tes_insulation_thickness_m=0.10)
        ua_small = tes_heat_loss_ua_w_k(1, config)
        ua_large = tes_heat_loss_ua_w_k(8, config)
        ua_thicker = tes_heat_loss_ua_w_k(8, replace(config, tes_insulation_thickness_m=0.20))

        self.assertGreater(ua_small, 0)
        self.assertGreater(ua_large, ua_small)
        self.assertLess(ua_thicker, ua_large)

    def test_large_collector_range_gets_adaptive_refinement(self):
        coarse = initial_collector_area_candidates(20, 4000)
        refined = refined_collector_area_candidates(coarse, [coarse[4], coarse[8], coarse[12]])
        self.assertEqual(len(coarse), 17)
        self.assertGreater(len(refined), 0)
        self.assertLess(min(abs(value - coarse[4]) for value in refined), coarse[1] - coarse[0])

    def test_hourly_unmet_is_not_hidden_by_monthly_surplus(self):
        result = pd.DataFrame({
            "time": pd.to_datetime(["2025-08-01 09:00", "2025-08-01 10:00"]),
            "dt_h": [0.5, 1.5],
            "TARGET_MOISTURE_REMOVAL_kg_h": [10.0, 10.0],
            "ACCEPTABLE_MIN_MOISTURE_REMOVAL_kg_h": [9.0, 9.0],
            "ABS_WATER_ABSORB_kg_h": [14.0, 8.0],
            "SUPPLY_AIR_w_kgkg": [0.0100, 0.0107],
            "Ta_degC": [31.0, 32.0],
            "OA_w_kgkg": [0.0160, 0.0170],
            "REG_HX_HEAT_NEED_kWh": [0.0, 0.0],
            "REG_HX_HEAT_FROM_TES_kWh": [0.0, 0.0],
            "REG_HX_HEAT_FROM_AUX_kWh": [0.0, 0.0],
            "COLLECTOR_QU_TOTAL_kWh": [0.0, 0.0],
            "TES_DUMP_SIZED_kWh": [2.0, 3.0],
        })
        metrics = dehumidification_metrics(result)
        monthly = monthly_rows(result)[0]
        trend = unmet_dehumidification_trend(result, 10.5)

        self.assertGreater(metrics["actualDehumidification"], metrics["acceptableMinDehumidification"])
        self.assertFalse(metrics["dehumidificationAccepted"])
        self.assertFalse(monthly["dehumidificationAccepted"])
        self.assertAlmostEqual(monthly["unusedSolar"], 5.0)
        self.assertAlmostEqual(metrics["unmetHours"], 1.5)
        self.assertAlmostEqual(metrics["unmetShortfall"], 1.5)
        self.assertAlmostEqual(trend["totalHours"], 1.5)
        self.assertAlmostEqual(trend["events"][0]["humidityExcess"], 0.2)
        self.assertAlmostEqual(trend["events"][0]["outdoorTemp"], 32.0)
        self.assertAlmostEqual(trend["events"][0]["outdoorHumidity"], 17.0)
        self.assertAlmostEqual(trend["averageHumidityExcess"], 0.2)
        self.assertAlmostEqual(trend["daily"][0]["averageHumidityExcess"], 0.2)

    def test_area_sweep_returns_target_area_and_hourly_dispatch(self):
        result = self.result_frame([0.0, 40.0, 40.0, 0.0], [900.0, 200.0, 0.0, 700.0])
        payload = {
            "collectorMin": 10,
            "collectorMax": 20,
            "targetSolarShare": 1,
            "tesSupplyTemp": 75,
            "tesReturnTemp": 42,
            "tesDesignMargin": 15,
            "buildingArea": 100,
            "parkingArea": 0,
            "mallParking": "no",
        }
        selected, area_results = calculate_collector_area_sweep(result, payload, self.collector, self.config)

        self.assertGreater(len(area_results), 0)
        self.assertTrue(selected["best"]["targetAchieved"])
        self.assertEqual(
            selected["best"]["collectorArea"],
            min(item["best"]["collectorArea"] for item in area_results if item["best"]["targetAchieved"]),
        )
        self.assertIn("TES_ACTUAL_FLOW_m3_h", selected["result"].columns)

    def test_area_sweep_reports_increasing_collector_areas(self):
        result = self.result_frame([0.0, 40.0, 40.0, 0.0], [900.0, 200.0, 0.0, 700.0])
        payload = {
            "collectorMin": 10,
            "collectorMax": 700,
            "targetSolarShare": 50,
            "tesSupplyTemp": 75,
            "tesReturnTemp": 42,
            "tesDesignMargin": 15,
            "buildingArea": 1000,
            "parkingArea": 0,
            "mallParking": "no",
        }
        _, area_results = calculate_collector_area_sweep(result, payload, self.collector, self.config)
        areas = [item["best"]["collectorArea"] for item in area_results]

        self.assertEqual(areas, sorted(areas))
        self.assertGreater(len(areas), 1)


if __name__ == "__main__":
    unittest.main()
