import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd

from backend.default_load_cache import (PRESETS, default_payload, signature,
                                       write_snapshot, read_snapshot)
from backend.server import build_configs, resolve_weather_file


class DefaultLoadCacheTests(unittest.TestCase):
    def setUp(self):
        self.payload = default_payload("seoul_epw", "office_medium")
        self.kind, self.collector, self.config = build_configs(self.payload)
        self.weather = resolve_weather_file(self.payload)

    def key(self, payload):
        kind, collector, config = build_configs(payload)
        config = replace(config, reg_flow_control_by_tes=False,
                         t_tes_init_c=config.t_tes_min_c, ua_tes_w_k=0)
        return signature(self.weather, kind, config, replace(collector, area_m2=0))

    def test_default_count_and_coverage_reuse(self):
        from backend.server import WEATHER_DATASETS
        self.assertEqual(len(PRESETS) * len(WEATHER_DATASETS), 234)
        self.assertEqual(self.key(self.payload), self.key({**self.payload, "targetSolarShare": 100}))

    def test_manual_changes_and_engine_weather_invalidate(self):
        original = self.key(self.payload)
        for field, value in dict(airflow=7000, operationHours=24, lgRatio=2,
                                 absTempMode="fixed", solutionConcentration=37,
                                 regenMaxAirRatio=2, tesSupplyTemp=65,
                                 analysisPeriodMode="monthly", collectorType="flat").items():
            with self.subTest(field=field):
                self.assertNotEqual(original, self.key({**self.payload, field: value,
                                                       "simulationMonths": [7]}))
        with patch.object(Path, "read_bytes", return_value=b"different source/weather"):
            self.assertNotEqual(original, self.key(self.payload))

    def test_lossless_roundtrip_and_corrupt_fallback(self):
        frame = pd.DataFrame(dict(time=pd.date_range("2001-01-01", periods=2, freq="h"),
                                  x=[np.pi, np.nan], on=[True, False], count=[2, 5]))
        frame.attrs = {"regeneration_design": {"modules": 20}, "substep_trace": []}
        summary = pd.DataFrame(dict(collector_type=["evacuated_tube"], energy=[np.pi]))
        with tempfile.TemporaryDirectory() as directory:
            self.assertIsNone(read_snapshot("missing", directory))
            write_snapshot("test", frame, summary, {}, directory)
            a, b = read_snapshot("test", directory)
            pd.testing.assert_frame_equal(frame, a, check_exact=True)
            pd.testing.assert_frame_equal(summary, b, check_exact=True)
            self.assertEqual(frame.attrs, a.attrs)
            with patch("backend.default_load_cache.np.load", side_effect=ValueError("bad zip")):
                with self.assertLogs(level="ERROR"):
                    self.assertIsNone(read_snapshot("test", directory))


if __name__ == "__main__":
    unittest.main()
