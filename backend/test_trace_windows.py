import unittest
from backend.server import substep_trace

class TraceWindowsTest(unittest.TestCase):
    def test_merge_and_separate(self):
        result = substep_trace({'request': {'simulationMonths':[7], 'analysisPeriodMode':'custom', 'weatherDataset':'seoul_epw'}, 'times':['2001-07-01 00:00','2001-07-01 14:00','2001-07-01 15:00','2001-07-01 14:00']})
        a,b=result['traces']
        self.assertTrue(a['clipped'])
        self.assertEqual(len(a['steps']),90)
        self.assertEqual(b['time'],'2001-07-01 13:30:00')
        self.assertEqual(b['endTime'],'2001-07-01 16:30:00')
        self.assertEqual(len(b['steps']),180)
        self.assertEqual(len({s['time'] for s in b['steps']}),180)
        for x,y in zip(b['steps'],b['steps'][1:]):
            self.assertAlmostEqual(x['waterEndKg'],y['waterStartKg'])
