import unittest
from unittest.mock import patch

import pandas as pd

from backend.server import selected_simulation_months
from backend.solar_ld_engine import CollectorConfig, SystemConfig, prepare_weather, read_epw_weather


class WeatherPeriodTests(unittest.TestCase):
    def test_annual_mode_selects_all_months(self):
        self.assertEqual(
            selected_simulation_months({"analysisPeriodMode": "annual"}),
            tuple(range(1, 13)),
        )

    def test_custom_months_are_deduplicated_and_sorted(self):
        self.assertEqual(
            selected_simulation_months(
                {"analysisPeriodMode": "custom", "simulationMonths": [12, 2, 7, 2]}
            ),
            (2, 7, 12),
        )

    def test_custom_mode_requires_at_least_one_month(self):
        with self.assertRaisesRegex(ValueError, "하나 이상"):
            selected_simulation_months(
                {"analysisPeriodMode": "custom", "simulationMonths": []}
            )

    def test_prepare_weather_keeps_only_selected_months(self):
        weather = pd.DataFrame(
            {
                "time": pd.to_datetime(
                    ["2025-01-15 12:00", "2025-02-15 12:00", "2025-03-15 12:00"]
                ),
                "Ta_degC": [1.0, 4.0, 9.0],
                "RH_pct": [55.0, 60.0, 65.0],
                "GHI_Wh_m2": [300.0, 400.0, 500.0],
            }
        )
        config = SystemConfig(sim_months=(1, 3))
        collector = CollectorConfig.for_type("evacuated_tube")

        with patch("backend.solar_ld_engine.read_weather", return_value=weather):
            selected = prepare_weather("unused.epw", collector, config)

        self.assertEqual(selected["time"].dt.month.tolist(), [1, 3])

    def test_tmy_epw_uses_one_reference_year(self):
        from backend.server import DEFAULT_WEATHER

        weather = read_epw_weather(DEFAULT_WEATHER)
        self.assertEqual(len(weather), 8760)
        self.assertEqual(weather["time"].dt.year.nunique(), 1)
        self.assertEqual(weather["time"].diff().dropna().dt.total_seconds().unique().tolist(), [3600.0])


if __name__ == "__main__":
    unittest.main()
