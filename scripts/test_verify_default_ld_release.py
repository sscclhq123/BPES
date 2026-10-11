import json
import tempfile
import unittest
from pathlib import Path
from scripts.verify_default_ld_release import SOURCES, MANIFEST, digest, verify


class ReleaseGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.key='a'*64
        for p in (*SOURCES,'data/weather/test.epw.gz',f'data/default_ld_cache/{self.key}.npz'):
            path=self.root/p;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(b'fixture')
        catalog=self.root/'backend/default_ld_catalog.json'
        catalog.write_text(json.dumps({'keys':{self.key:{'city':'test','preset':'office_medium'}}}))
        self.manifest=dict(schema=1,count=1,sources={p:digest(self.root/p) for p in SOURCES},
            weather={'data/weather/test.epw.gz':digest(self.root/'data/weather/test.epw.gz')},
            catalogSha256=digest(catalog),snapshots={self.key:digest(self.root/f'data/default_ld_cache/{self.key}.npz')})
        (self.root/MANIFEST).write_text(json.dumps(self.manifest))

    def test_complete_release_passes(self):
        self.assertEqual(verify(self.root),1)

    def test_engine_change_fails(self):
        (self.root/SOURCES[0]).write_bytes(b'new engine')
        with self.assertRaisesRegex(ValueError,'source/weather changed'):verify(self.root)

    def test_snapshot_missing_fails(self):
        (self.root/f'data/default_ld_cache/{self.key}.npz').unlink()
        with self.assertRaisesRegex(ValueError,'Missing/corrupt'):verify(self.root)

    def test_snapshot_corrupt_fails(self):
        (self.root/f'data/default_ld_cache/{self.key}.npz').write_bytes(b'broken')
        with self.assertRaisesRegex(ValueError,'Missing/corrupt'):verify(self.root)

    def test_weather_change_fails(self):
        (self.root/'data/weather/test.epw.gz').write_bytes(b'new weather')
        with self.assertRaisesRegex(ValueError,'source/weather changed'):verify(self.root)

    def test_catalog_change_fails(self):
        (self.root/'backend/default_ld_catalog.json').write_text('{"keys": {}}')
        with self.assertRaisesRegex(ValueError,'manifest/catalog mismatch'):verify(self.root)


if __name__=='__main__':unittest.main()
