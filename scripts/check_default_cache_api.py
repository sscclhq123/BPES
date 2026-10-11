"""Verify actual cache hits after deployment; no application state is mutated."""
import argparse
import json
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.default_load_cache import default_payload


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--origin',default='https://saldop.vercel.app')
    parser.add_argument('--cities',nargs='+',default=['seoul_epw','manila_tmy','berlin_tmyx'])
    args=parser.parse_args()
    origin=args.origin.rstrip('/')
    parsed=urlparse(origin)
    if parsed.scheme!='https' or parsed.path or parsed.query or parsed.fragment:
        raise ValueError('Expected an HTTPS origin')
    for city in args.cities:
        payload=default_payload(city,'office_medium')
        payload['targetSolarShare']=100
        started=time.perf_counter()
        request=Request(origin+'/api/simulate',data=json.dumps(payload).encode(),
                        headers={'Content-Type':'application/json'})
        with urlopen(request,timeout=310) as response:
            result=json.load(response)
        cache=result.get('loadCache',{})
        if cache.get('hit') is not True:
            raise AssertionError(f'{city}: annual default cache missed: {cache}')
        if len(result.get('monthly',[]))!=12:
            raise AssertionError(f'{city}: incomplete annual response')
        print(json.dumps(dict(city=city,seconds=round(time.perf_counter()-started,3),
            cache=cache,months=len(result['monthly']),
            collectorArea=result.get('best',{}).get('collectorArea'))),flush=True)


if __name__=='__main__':main()
