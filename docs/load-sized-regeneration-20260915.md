# Load-sized regeneration bank and installed-capacity VAV

## Requested change

Remove the arbitrary maximum of three times the absorber airflow. Size the
regenerator bank before annual operation; keep its installed capacity fixed
during operation. No changes to correlation coefficients, common-tank balances,
TES supply/return assumptions, or absorber airflow control.

## Calculation

For each selected scheduled hour whose outdoor humidity exceeds the accepted
upper limit, design water-removal demand is absorber air mass flow multiplied by
the positive difference between outdoor humidity ratio and the humidity target.
Evaluate the existing regeneration correlation at the TARGET tank concentration,
allowed upper solution temperature, and maximum feasible per-module airflow.
The module airflow interval is the intersection of the air domain and the
solution domain divided by fixed L/G. Required modules are the maximum rounded-up
hourly demand / per-module removal capacity. The bank must also accommodate the
retained minimum ON airflow of one times the absorber design airflow.

Previously installation was clipped by the 3× airflow budget; now all required
modules are installed in the design. At runtime active modules never exceed the
installed count. VAV links solution flow = air flow × fixed L/G. Low loads use
partial duty below minimum ON capacity. Zero thermodynamic regeneration capacity
is reported as impossible, not hidden by unbounded flow. A finite optional
`reg_max_air_ratio` remains solely for internal counterfactual audits; the web API
ignores retired `regenMaxAirRatio` inputs from old saved URLs.

This is an initial capacity-sizing/control strategy, NOT a new experimental fit
or equipment-cost optimization. It does not guarantee absorber performance or
validate the correlation outside its outdoor-air experimental domain. Installed
fan, duct, pump and heat-source feasibility still require engineering selection.

## Manila / medium office / default annual conditions

| Quantity | Previous 3× design | Load-sized design |
|---|---:|---:|
| Required modules | 29 | 29 |
| Installed modules | 20 | 29 |
| Maximum air mass flow, kg/s | 7.745 | 11.600 |
| Maximum solution mass flow, kg/s | 9.294 | 13.920 |
| Airflow / absorber design flow | 3.000 | 4.493 |
| Budget-limited design hours | 2 | 0 |

The new annual run retained tank concentration at 38 wt% to floating-point
precision (hour-end minimum 37.99999999999999 wt%). At May 26 13:00 and
November 17 09:00 the tank starts/ends at 38 wt%, but supply humidity remains
about 11.428 and 11.897 g/kg respectively: those absorber limitations are not
falsely reported as solved by regeneration sizing.

Annual maximum absolute solution-tank energy residual: 6.12e-9 kJ.
Annual maximum absolute regeneration heat-exchanger balance residual: 0 kWh.
This checks implemented balance closure, not experimental model validity.

## Verification and display

All 53 backend tests passed, including explicit >3× sizing, no runtime module growth,
per-module flow bounds, fixed L/G, low-load duty, zero-capacity handling, tank mass
and energy balance, cache round trip and invalidation. Browser tests cover desktop
and 390px mobile, hourly/monthly/60-second flows, region changes, and the new
calculated-capacity line. L/G graph still ends at 3.0; that is a different quantity
from airflow multiple. Maximum solution flow was added to the capacity summary.

All 234 default caches are being regenerated with the new engine signature.
Old cache keys and the 3× batch must not be used for the new configuration.
