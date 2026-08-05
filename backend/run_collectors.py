from __future__ import annotations

import argparse
from pathlib import Path

from solar_ld_engine import run_simulation, write_outputs


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WEATHER = ROOT / "data" / "weather" / "uploads" / "OBS_ASOS_TIM_20260403023410.xls"


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Solar LD collector simulations.")
    parser.add_argument("--weather", type=Path, default=DEFAULT_WEATHER)
    parser.add_argument("--outdir", type=Path, default=Path("outputs"))
    parser.add_argument(
        "--collector",
        choices=["flat_plate", "evacuated_tube", "both"],
        default="both",
    )
    args = parser.parse_args()

    collectors = ["flat_plate", "evacuated_tube"] if args.collector == "both" else [args.collector]
    summaries = []

    for collector in collectors:
        result, summary = run_simulation(args.weather, collector)
        outfile = args.outdir / f"python_{collector}_ASOS2025.xlsx"
        write_outputs(result, summary, outfile)
        summaries.append(summary)
        row = summary.iloc[0]
        print(
            f"{collector}: collector={row['collector_total_kWh']:.3f} kWh, "
            f"TES={row['TES_TO_REG_total_kWh']:.3f} kWh, "
            f"AUX={row['AUX_TO_REG_total_kWh']:.3f} kWh, "
            f"solar cover={100 * row['TES_TO_REG_total_kWh'] / row['REG_HX_NEED_total_kWh']:.2f}%"
        )
        print(f"  wrote {outfile}")


if __name__ == "__main__":
    main()
