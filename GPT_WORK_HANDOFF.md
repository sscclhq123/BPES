# GPT Work Handoff: Solar LD Optimization Program

## Project Location

- Local project folder: `/Users/kwanghoonsmacbookpro/Desktop/BPES/ld-dec-optimizer`
- Main page: `/Users/kwanghoonsmacbookpro/Desktop/BPES/ld-dec-optimizer/index.html`
- Frontend logic: `/Users/kwanghoonsmacbookpro/Desktop/BPES/ld-dec-optimizer/app.js`
- Styling: `/Users/kwanghoonsmacbookpro/Desktop/BPES/ld-dec-optimizer/styles.css`
- Python API server: `/Users/kwanghoonsmacbookpro/Desktop/BPES/ld-dec-optimizer/backend/server.py`
- LD/solar simulation engine: `/Users/kwanghoonsmacbookpro/Desktop/BPES/ld-dec-optimizer/backend/solar_ld_engine.py`

## How To Run Locally

From the project folder:

```bash
cd /Users/kwanghoonsmacbookpro/Desktop/BPES/ld-dec-optimizer
/Users/kwanghoonsmacbookpro/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 backend/server.py
```

Open:

```text
http://127.0.0.1:8765/
```

This is a local server link. Other people cannot access it from the internet unless the site is deployed to hosting.

## Current App Concept

The site is being built as a design/optimization tool for a solar-assisted liquid desiccant system.

The intended workflow is:

1. Select weather input.
2. Select building/application space.
3. Enter LD operating conditions.
4. Enter collector and thermal storage sizing bounds.
5. Run calculation/optimization.
6. Show optimal collector area, TES volume, solar fraction, auxiliary heat use, unmet time, recommended operating conditions, and reverse-capacity guide.

## Current UI State

Top title:

```text
Solar-Assisted Liquid Desiccant Optimization Program
```

Top controls:

- Simulation Goal
  - Design mode: calculate collector/TES size needed for a building.
  - Reverse mode: estimate building/space size that a given collector/TES can handle.
- Post-LD Air Treatment
  - FCU linkage
  - DEC linkage

Weather section:

- Standard weather data
- Personal weather data upload
- For uploaded personal weather data:
  - solar data exists
  - solar data missing, then user enters latitude/longitude and the app estimates irradiance with a simple sky model placeholder

Building/application section:

- Standard building model
- Custom building input
- Load file upload placeholder
- Uses include:
  - office
  - shopping mall
  - residential
  - hospital
  - factory
  - agriculture
- Building size:
  - small
  - medium
  - large
- Outdoor/parking collector-use option is currently available generally, not only for shopping mall.

LD section:

- Solution concentration
- L/G
- Absorber inlet solution target temperature
- Regenerator inlet solution target temperature
- Collector type
- Optimization/fixed options for solution concentration, L/G, and regenerator solution temperature

Design variable section:

- Collector min/max
- TES min/max
- Optimize or fix collector/TES values

## Recent Important Change

Added LD solution temperature inputs:

- `absSolutionTemp`: absorber inlet solution target temperature
  - frontend default: `30°C`
  - recommended range: `15~30°C`
  - Python backend maps it to `SystemConfig.t_abs_in_target_c`
- `regenTemp`: regenerator inlet solution target temperature
  - frontend default: `55°C`
  - recommended range: `45~80°C`
  - Python backend maps it to `SystemConfig.t_reg_in_target_c`

The backend API was checked with:

```json
{
  "absSolutionTemp": 29,
  "regenTemp": 56
}
```

and returned:

```text
29.0 56.0
```

## Current Calculation Model

There are two layers:

1. Frontend preliminary optimizer in `app.js`
2. Python simulation API in `backend/solar_ld_engine.py`

The Python simulation currently models the solution tank as a single fully mixed tank.

Current solution tank state variables:

- `state_sol_m_salt`
- `state_sol_m_water`
- `state_sol_t`

So the tank has:

- one average concentration
- one average temperature
- no stratification
- no separate strong/weak solution tank
- no explicit solution-to-solution heat exchanger yet

The current assumption is:

```text
fully mixed single solution tank + controlled absorber/regenerator inlet solution temperatures
```

This is a simplification. A more physical next version should separate:

- weak solution tank
- strong solution tank
- solution heat exchanger
- absorber-side cooler
- regenerator-side heater
- regeneration control logic

## Known Limitations

The current site is a working prototype, not a final validated engineering calculator.

Important limitations:

- EPW parser is not fully implemented yet.
- Personal weather upload works mainly for the current ASOS-style format.
- Missing-solar-data sky model is still a placeholder-level estimate.
- Building load data are prototype/representative placeholders, not fully validated EnergyPlus/eQuest results.
- FCU mode is selected in UI but full FCU coil/load model is not implemented yet.
- DEC content still exists in the UI logic as an option, but the user has been leaning toward LD + FCU use.
- Python LD model is currently single-tank fully mixed.
- Current building sizing/reverse-sizing is approximate and needs stronger physical grounding.

## Papers/References Mentioned By User

The user referred to:

1. Chen, Yang, Luo, 2018, Energy 143, 114-127
   - Title: `Investigation on solar assisted liquid desiccant dehumidifier and evaporative cooling system for fresh air treatment`
   - Used conceptually for solar-assisted LD + evaporative cooling system.

2. A paper by author Kim Min Hwi
   - User wants building-scale LD conditions from that paper.
   - Need re-read the provided PDF if available in local downloads.

PDFs previously mentioned:

- `/Users/kwanghoonsmacbookpro/Downloads/1-s2.0-S0360544217318297-main.pdf`
- `/Users/kwanghoonsmacbookpro/Downloads/1-s2.0-S0378778814002254-main.pdf`

## User's Current Direction

The user wants to finish the homepage first, but also wants the calculation logic to eventually become physically correct.

Likely target direction:

- Weather:
  - Use pre-uploaded standard weather files.
  - Let users upload personal weather data.
  - If solar irradiance data exists, do not require latitude/longitude.
  - If solar irradiance data is missing, ask for latitude/longitude and estimate solar irradiance.

- Building/application:
  - Standard building models from EnergyPlus/eQuest or prototype datasets.
  - Custom/other building should accept Excel/CSV load data later.
  - Need define required load columns and parser.

- LD:
  - Add physically meaningful LD inputs.
  - Use absorber/regenerator experimental equations from papers/MATLAB code where valid.
  - Clarify empirical equation validity ranges.

- FCU:
  - Need implement FCU-side calculation if post-LD air is sent to an FCU.
  - Need decide whether EnergyPlus load result provides sensible/latent load, outdoor air load, or coil load.

- Solar/TES:
  - Collector area and TES size should be optimized or reverse-calculated.
  - Need better guideline equations for collector/TES min/max.

## Suggested Next Engineering Steps

1. Re-read Kim Min Hwi paper and extract actual building/application conditions.
2. Decide final system architecture:
   - LD + FCU
   - LD + DEC
   - both selectable
3. Upgrade Python solution model:
   - from one fully mixed tank
   - to strong/weak solution tanks or at least a clearer tank + heat exchanger model
4. Implement FCU model:
   - input air from LD outlet
   - target supply/room condition
   - calculate remaining sensible load and chilled-water/coil load
5. Implement EnergyPlus/eQuest load upload:
   - define required columns
   - parse CSV/XLSX
   - use hourly latent/sensible load and outdoor air data
6. Replace placeholder standard building data with sourced prototype data.
7. Implement EPW parser and real weather dataset selection.
8. Prepare deployment if the user wants a public shareable URL.

## Prompt To Paste Into GPT Work

Continue this project from the local folder `/Users/kwanghoonsmacbookpro/Desktop/BPES/ld-dec-optimizer`.

This is a prototype website for a Solar-Assisted Liquid Desiccant Optimization Program. The app has a Korean UI and currently runs locally at `http://127.0.0.1:8765/` using `backend/server.py`.

Please inspect these files first:

- `index.html`
- `styles.css`
- `app.js`
- `backend/server.py`
- `backend/solar_ld_engine.py`

Important current state:

- Weather UI supports standard data and personal weather upload.
- Personal upload has two modes: solar data exists / solar data missing.
- If solar data is missing, user should enter latitude/longitude for a sky-model estimate.
- Building UI supports office, mall, residential, hospital, factory, and agriculture, with small/medium/large representative data.
- Top UI has simulation goal: design collector/TES for a building, or reverse-calculate manageable building/space size from equipment bounds.
- Top UI has post-LD air treatment: FCU or DEC.
- LD section now includes:
  - solution concentration
  - L/G
  - absorber inlet solution target temperature, `absSolutionTemp`
  - regenerator inlet solution target temperature, `regenTemp`
  - collector type
- Python backend maps:
  - `absSolutionTemp` to `SystemConfig.t_abs_in_target_c`
  - `regenTemp` to `SystemConfig.t_reg_in_target_c`

Important modeling caveat:

The current Python solution tank model is a single fully mixed tank with one concentration and one temperature. It is not yet a strong/weak solution two-tank model and does not explicitly include a solution-to-solution heat exchanger. The next major physics upgrade should address this.

The immediate next task is likely to decide whether to model LD + FCU, LD + DEC, or both, then upgrade the calculation logic accordingly while keeping the UI clear.
