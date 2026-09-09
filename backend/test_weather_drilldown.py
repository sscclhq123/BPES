import unittest
import pandas as pd
from backend.server import weather_hourly_rows, monthly_weather_rows


class WeatherDrilldownTest(unittest.TestCase):
    def test_units_and_duration(self):
        data = pd.DataFrame({'time': pd.to_datetime(['2001-07-31 12:00', '2001-07-31 13:00', '2001-08-01 00:00']), 'Ta_degC': [30., 32., 25.], 'OA_w_kgkg': [.02, .024, .018], 'GT_COLLECTOR_W_m2': [400., 600., 0.], 'dt_h': [1., .5, 1.]})
        hours = weather_hourly_rows(data)
        self.assertEqual(hours[0]['hour'], 12)
        self.assertEqual(hours[1]['day'], 31)
        self.assertEqual(hours[2]['month'], 8)
        self.assertEqual(hours[1]['outdoorHumidity'], 24.)
        self.assertEqual(hours[1]['irradiance'], 600.)
        self.assertAlmostEqual(sum(r['irradiance'] * r['duration'] / 1000 for r in hours), monthly_weather_rows(data)[0]['irradiation'])
