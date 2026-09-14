# Regenerator VAV and multi-region calculation — 2026-09-14

## Observed failure

The previous production Manila annual request ended with
`FUNCTION_INVOCATION_TIMEOUT` (Vercel function limit: 300 seconds).
Seoul alone completed in about 198 seconds. HTTP health checks alone did not
reproduce the problem. Previously, three CPU-bound annual requests ran at once;
plain-text gateway errors also surfaced as JSON parsing failures.

## Changes

- Queue regions one at a time; retain successful results for failed-region retry.
- Do not open results until every selected region succeeds.
- Preserve HTTP timeout diagnostics and forward input-validation failures.
- Memoize absorber/regenerator control searches only for exactly identical
  inlet state/demand within the same weather hour. No rounding, larger time
  steps, or skipping mass/enthalpy integration. Clear bounded caches each hour.
- Add monthly/day/hour L/G and regenerator air/solution mass-flow diagnostics,
  including on-state vs whole-period means and 60-second replay plots.

## Regenerator control assumptions (not empirical-paper claims)

Absorber outdoor airflow remains the building's required design flow. During
regenerator operation, total airflow is bounded by 1 times that reference and
the user-set maximum (1–3 times, default 3). Mass conversion retains the existing
reference air density, 1.2 kg/m³. Fans and solution pumps are coupled:

`solution mass flow = fixed regenerator L/G × regenerator air mass flow`.

Select active parallel modules so each module remains in the intersection of
air 0.24–0.40 kg/s and solution 0.26–0.48 kg/s. Search for the lowest allowed
solution temperature that can meet water-removal demand, then the smallest
feasible airflow at that temperature. Low demand uses duty cycling at a valid
ON-state flow, so a whole-hour average may be below 1x. OFF flow is zero.
Some narrow manual domains (e.g. endpoint L/G plus an exactly 1x maximum) cannot
fit an integer number of modules and must report infeasibility.

Demand includes concurrent absorbed water plus the tank's existing dilution
debt over its configured recovery horizon. Both branches retain the common
mixed tank mass/enthalpy balances and concentration stop/restart thresholds.
After-hours regeneration continues when recovery is requested. At the 3x cap,
insufficient regeneration or equilibrium limits are reported, never replaced
by artificial recovery to 38%. The Liu correlation coefficients are unchanged.
The 1–3x range is a user-specified design constraint, not proof of fan/duct
feasibility or empirical validation of every weather condition.

TES sizing and ideal supply/return assumptions are unchanged. Heating demand,
solar allocation, auxiliary heat and common-tank energy balances remain in
the existing engine.

## Verification

- `python3 -m unittest discover -s backend -p 'test_*.py'`
- `node --test scripts/test_calculation_batch.mjs`
- `studio-source/tests/ld-flow.browser.js`: desktop/mobile, OFF gaps,
  partial-duty means, region switching, minute replay.
- Local Manila annual / medium office / 7,745 m³/h / 9-hour schedule:
  approximately 33 seconds, 8,760 hourly rows, 2 unmet hours retained.
- Cache regression compares full hourly results and minute records exactly.
- VAV tests cover flow bounds, fixed L/G, module domains, capped capacity,
  equilibrium shutoff, tank mass conservation and heat-balance residuals.

## Production verification (05a2c31)

On saldop.vercel.app, select Seoul + Manila, medium office, 7,745 m³/h,
09:00–18:00, annual, automatic LD, fixed regeneration L/G 1.2, 3x maximum,
solar target 80%, and ideal TES 60/45 °C:

- Seoul finished in approximately 103 seconds; Manila in 152 seconds.
- Both completed after 257.648 seconds including browser startup, and only
  then did the UI open the result screen. Each region returned 8,760 flow rows.
- Hourly ON-state airflow ratios: Seoul 1.000–2.944x; Manila 1.000–3.000x.
- Maximum fixed-L/G deviation in rounded exported flows: below 4e-9.
- Seoul has 0 unmet hours; Manila retains 2 unmet hours. Successful calculation
  is not a guarantee that the design meets all humidity requirements.
- Actual browser progress verified on mobile; results support region switch
  and July/day drilldown. Browser reported no JavaScript errors.
- Automated backend suite: 49 passing tests. Batch tests use eight simulated
  regions, including one failed-region retry; they are not eight real annual runs.
- Three-day Manila cache benchmark (same new controller): 1.173 s uncached,
  0.200 s cached. Local timings do not guarantee all production runtimes.

Vercel runtime-log access was unavailable through the connected account;
verification used deployment status, HTTP responses and the real browser flow.
