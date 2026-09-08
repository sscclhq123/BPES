# LD concentration control (2026-09-09)

Implemented requested review items 1–4 only. TES sizing, ideal monthly heat
allocation, supply/return temperatures and existing thermophysical/enthalpy
models are unchanged. Ideal heating/cooling availability remains assumed.

The mixed solution tank retains its salt/water/enthalpy balances. Regeneration
starts alongside actual absorption. Its requested water rate is absorption plus
the water excess above the target concentration divided by a 3600 s recovery
time. The recovery time is a tuning parameter, not a paper-validated constant
or a guaranteed completion time. A negligible residual is removed within one
substep so off-schedule operation eventually stops.

Normal lower threshold is target minus 0.5 percentage point (37.5% at 38%).
36.4% is a separate hard absorber protection floor. Restart is at 36.6%, or the
target if lower. A predictive absorber run-time limit keeps the substep above
the floor even without credit for simultaneous regeneration. This is deliberately
conservative; it can curtail absorption before regeneration returns to the tank.

At validated, fixed installed-module flows, automatic regeneration chooses the
lowest temperature up to the user's upper setpoint that meets the request.
Fixed mode retains the requested temperature. Below the available minimum
output, run-time fraction controls output: ON-state water transfer, circulation,
return enthalpy flux, heat and module runtime are all integrated over the same
duration. This is an ideal substep duty model; motor/pump minimum cycle times
and actuator delays are not represented. The physical correlation rate itself
is not clipped to match the requested rate.

No extra modules are installed to fix capacity shortfalls. Diagnostic columns:

- REG_CAPACITY_DEFICIT_HOURS: requested absorption + recovery exceeds available capacity.
- REG_TARGET_CAPACITY_DEFICIT_HOURS: capacity evaluated at target concentration
  is smaller than current actual absorption (not a full independent design-point sizing).
- REG_TARGET_CAPACITY_MARGIN_kg_h: time-average target-state capacity minus absorption
  during evaluated control steps, normalized to the complete reporting hour.
- ABS_PROTECTION_HOURS: withheld absorber runtime due to protection.
- ABS_DUTY_FRACTION / REG_DUTY_FRACTION: actual equivalent operating fractions,
  used by existing heatmap output instead of boolean hourly occurrence.

Target concentration must exceed the 36.4% protection floor. Low-load capacity
is modulated by duty; at overload the concentration may still decline, but is
not assigned/clamped to a desired value. All concentration changes result from
integrated water transfer. Post-schedule regeneration continues while needed.
