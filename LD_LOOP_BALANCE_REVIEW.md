# LD loop control and balance revision (2026-09-12)

## Model boundary

One perfectly mixed solution inventory supplies both parallel contactor banks;
both returns mix back into that same salt/water/enthalpy state each 60 seconds.
Building ventilation flow is fixed. Existing absorber L/G fixed/auto and temperature
fixed/auto choices remain available; no extra building ventilation is invented.
Installed regeneration module count is unchanged.

## Corrections

- Both contactors now use the full air enthalpy change to calculate solution return
  enthalpy. Previously multiplying only this term by 0.70 left an unaccounted
  external heat term. The revised assumption is **adiabatic contactors**, not a
  new empirical fit. The regression coefficients and air-output closure are unchanged.
- Heating uses the same h(x,T)=585.977x+2.7T-181.659 kJ/kg as the inventory.
  The previous separate cp correlation was inconsistent with this enthalpy model.
- Any required absorber heating or regeneration-loop cooling is recorded separately;
  it is not counted as solar regeneration heat. These auxiliaries are ideal loads,
  not specified equipment or guaranteed real-world capacity.
- Absorber flow candidates are clamped to the existing per-module solution-flow domain.
  This is intersected with the L/G bounds; infeasible intersections raise an error.
  The fixed-L/G automatic-temperature branch had an 8.05 C default floor; it now
  uses the UI's 20 C floor too.

## Proposed regeneration controller (not a literature prescription)

Demand = current absorbed water rate + concentration-recovery debt / recovery horizon.
For the installed bank: air 0.24–0.40 kg/s/module and solution 0.26–0.48 kg/s/module.
Temperature retains the existing 48.5–59.4 C bounds and user fixed/auto selection.
Automatic flow mode varies air and solution independently; L/G is their resulting
ratio, not a fixed 1.1 constraint. The 1.1 value remains a sizing reference only.
Select lowest feasible temperature; consider minimum/mid/maximum air flow and solve
solution flow using the existing power-law exponent. Prefer least solution flow,
then least air flow among feasible candidates. This is a bounded heuristic, not an
economic or global energy optimum. At insufficient capacity, report the deficit;
do not fabricate moisture removal. Low-load duty modulation remains supported.

These numerical domains are inherited from the existing code. This revision does
not independently revalidate their provenance against the original paper datasets.

## Balance equations

Contactor: ma*ha,in + ms*hs,in = ma*ha,out + ms,out*hs,out.
Salt: ms,in*xin = ms,out*xout.
Tank water: Mw,next = Mw + (absorption - desorption)*dt.
Tank energy: U,next = U + [sum(return m*h) - sum(supply m*h)]*dt - loss*dt.
Regeneration heater: Qneed = ms*[h(x,Treg)-h(x,Ttank)] (positive heating).
Qneed = QTES + Qaux. A negative temperature lift is a separate cooling load.
TES: deltaE = Qcollector - QtoReg - Qloss - Qdump.

## TES limitation / unchanged scope

The website first computes LD demand assuming its temperature-conditioning needs
can be supplied, then dispatches solar/storage/auxiliary heat over that demand.
TES geometry, sizing algorithm, stratification, hydraulic design and ideal supply /
return assumptions were not redesigned. Heat-balance closure is necessary but does
not prove heat-exchanger UA, temperature approach or pump sizing is feasible.
The minute-level diagnostic is the LD load pass; it must not be represented as
minute-level solar/TES sizing dispatch. Hourly post-dispatch heat residual is also
recomputed against the actual dispatch columns.

## Verification and remaining limits

Unit tests cover adiabatic air/solution energy balance, salt/water balance, heater
enthalpy consistency, independent regeneration flow bounds and capacity saturation.
Existing partial dehumidifier duty near the concentration floor remains; this is
not a new full-stop/restart controller. Fixed-temperature UI choices are respected.
Physical validation against measured inlet/outlet data, contactor saturation limits,
the original regression validity in outdoor temperature/humidity, fan/pump power,
and equipment-level heat exchanger feasibility remain research work.

## Reproduction

Seoul July, 7,745 m3/h, 9 operating hours, absorber/regenerator temperature auto,
same initial conditions and installed modules, compared against commit f57b698:

| July 31 hour | Old supply g/kgDA | Revised supply g/kgDA | Old heat kWh | Revised heat kWh |
|---|---:|---:|---:|---:|
|13|10.000|10.000|133.24|146.71|
|14|18.435|17.391|168.27|193.18|
|15|17.365|16.811|172.53|195.22|

These are simulation comparisons, not measurements or validation against the papers.
Heat-exchanger supply residual: 0 kWh. Maximum absolute hourly solution-tank
energy residual in this reproduction: 8.01e-10 kJ. Target humidity remains unmet
under the installed regeneration capacity; do not interpret balance closure as
guaranteed dehumidification performance.
