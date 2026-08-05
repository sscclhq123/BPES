from __future__ import annotations

import json
import math
import re
import socket
import sys
import time
from dataclasses import replace
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from solar_ld_engine import (  # noqa: E402
    CollectorConfig,
    SystemConfig,
    collector_output_w_m2,
    prepare_weather,
    CollectorConfig as WeatherCollectorConfig,
    run_simulation,
)


DEFAULT_WEATHER = ROOT.parent / "KOR_SO_Seoul.WS.471080_TMYx.2011-2025.epw"
UPLOAD_DIR = ROOT / "data" / "weather" / "uploads"


def clean_value(value):
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if hasattr(value, "item"):
        return clean_value(value.item())
    return value


def to_number(payload, key, default):
    try:
        value = payload.get(key, default)
        if value in ("", None):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def selected_simulation_months(payload):
    if payload.get("analysisPeriodMode", "annual") == "annual":
        return tuple(range(1, 13))
    raw_months = payload.get("simulationMonths", [])
    if isinstance(raw_months, str):
        raw_months = raw_months.split(",")
    try:
        months = tuple(sorted({int(month) for month in raw_months}))
    except (TypeError, ValueError):
        months = ()
    if not months or any(month < 1 or month > 12 for month in months):
        raise ValueError("월별 선택에서는 1~12월 중 하나 이상을 선택해야 합니다.")
    return months


def period_label(months):
    return "연간 전체 · 1~12월" if tuple(months) == tuple(range(1, 13)) else "선택 월 · " + ", ".join(f"{month}월" for month in months)


def safe_filename(filename):
    stem = Path(filename).stem or "weather"
    suffix = Path(filename).suffix.lower()
    safe_stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", stem).strip("._") or "weather"
    safe_suffix = suffix if suffix in {".csv", ".txt", ".xls", ".epw"} else ".dat"
    return f"{safe_stem}{safe_suffix}"


def parse_multipart_file(headers, body):
    content_type = headers.get("Content-Type", "")
    match = re.search(r"boundary=(?P<boundary>[^;]+)", content_type)
    if not match:
        raise ValueError("multipart boundary를 찾을 수 없습니다.")
    boundary = ("--" + match.group("boundary").strip('"')).encode()
    for part in body.split(boundary):
        if b'Content-Disposition:' not in part or b'name="weather_file"' not in part:
            continue
        header_blob, _, file_blob = part.partition(b"\r\n\r\n")
        disposition = header_blob.decode("utf-8", errors="ignore")
        filename_match = re.search(r'filename="([^"]+)"', disposition)
        if not filename_match:
            raise ValueError("파일명을 찾을 수 없습니다.")
        file_blob = file_blob.rstrip(b"\r\n")
        if file_blob.endswith(b"--"):
            file_blob = file_blob[:-2].rstrip(b"\r\n")
        return filename_match.group(1), file_blob
    raise ValueError("weather_file 필드를 찾을 수 없습니다.")


def resolve_weather_file(payload):
    dataset = str(payload.get("weatherDataset", ""))
    if dataset.startswith("uploaded:"):
      filename = dataset.split(":", 1)[1]
      candidate = (UPLOAD_DIR / filename).resolve()
      upload_root = UPLOAD_DIR.resolve()
      if upload_root not in candidate.parents and candidate != upload_root:
          raise ValueError("허용되지 않는 업로드 파일 경로입니다.")
      if not candidate.exists():
          raise FileNotFoundError(f"업로드 파일을 찾을 수 없습니다: {filename}")
      return candidate
    return DEFAULT_WEATHER


def build_configs(payload):
    collector_type = "evacuated_tube" if payload.get("collectorType") == "evacuated" else "flat_plate"
    collector = CollectorConfig.for_type(collector_type)
    collector.area_m2 = to_number(payload, "collectorArea", to_number(payload, "collectorMin", collector.area_m2))
    if collector.area_m2 <= 0:
        raise ValueError("집열기 면적은 0보다 커야 합니다.")
    building_area = to_number(payload, "buildingArea", 0)
    collector_max = to_number(payload, "collectorMax", collector.area_m2)
    uses_parking_collector = payload.get("mallParking") == "yes"
    if building_area > 0 and collector_max > building_area and not uses_parking_collector:
        raise ValueError(
            f"적용 면적 {building_area:.0f} m²보다 집열기 최대값 {collector_max:.0f} m²가 큽니다. "
            "주차장/옥외공간 활용을 선택하지 않았기 때문에 배치 면적이 부족합니다. "
            "집열기 최대값을 적용 면적 이하로 낮추거나 주차장/옥외공간 활용을 선택하세요."
        )

    config = SystemConfig()
    config.sim_months = selected_simulation_months(payload)
    config.v_tes_l = to_number(payload, "tesVolume", config.v_tes_l / 1000) * 1000
    if config.v_tes_l <= 0:
        raise ValueError("축열조 용량은 0보다 커야 합니다.")
    config.xi_tank_init = to_number(payload, "solutionConcentration", config.xi_tank_init * 100) / 100
    config.xi_target = config.xi_tank_init
    config.xi_regen_on = max(config.xi_tank_init - 0.001, 0.20)
    config.xi_aux_on = max(config.xi_tank_init - 0.005, 0.20)
    config.xi_abs_stop = max(config.xi_tank_init - 0.020, 0.20)
    config.lg_ratio_abs = to_number(payload, "lgRatio", config.lg_ratio_abs)
    config.lg_ratio_reg_design = to_number(payload, "lgRatio", config.lg_ratio_reg_design)
    config.t_abs_in_target_c = to_number(payload, "absSolutionTemp", config.t_abs_in_target_c)
    config.t_reg_in_target_c = to_number(payload, "regenTemp", config.t_reg_in_target_c)
    config.t_tes_min_c = to_number(payload, "tesReturnTemp", config.t_tes_min_c)
    config.t_tes_max_c = to_number(payload, "tesSupplyTemp", config.t_tes_max_c)
    config.t_tes_init_c = to_number(payload, "tesInitialTemp", config.t_tes_init_c)
    config.tes_insulation_k_w_mk = to_number(
        payload, "tesInsulationK", config.tes_insulation_k_w_mk
    )
    if config.tes_insulation_k_w_mk <= 0:
        raise ValueError("TES 단열재 열전도율은 0보다 커야 합니다.")
    config.target_supply_w_g_kg = to_number(payload, "targetAbsHumidity", config.target_supply_w_g_kg)
    config.sa_abs_m3h = to_number(payload, "airflow", config.sa_abs_m3h)
    config.operation_hours_per_day = int(to_number(payload, "operationHours", config.operation_hours_per_day))
    return collector_type, collector, config


def empirical_warnings(payload):
    checks = [
        (
            36.4 <= to_number(payload, "solutionConcentration", 38) <= 39.0,
            f"LiCl 농도 {to_number(payload, 'solutionConcentration', 38):.1f} %는 Park 흡수기 회귀식 범위 36.4~39.0 %를 벗어납니다.",
        ),
        (
            8.05 <= to_number(payload, "absSolutionTemp", 25) <= 31.4,
            f"제습부 입구 용액 목표온도 {to_number(payload, 'absSolutionTemp', 25):.1f} °C는 Park 흡수기 회귀식 범위 8.05~31.40 °C를 벗어납니다.",
        ),
        (
            48.5 <= to_number(payload, "regenTemp", 55) <= 59.4,
            f"재생기 입구 용액 목표온도 {to_number(payload, 'regenTemp', 55):.1f} °C는 재생기 회귀식 범위 48.5~59.4 °C를 벗어납니다.",
        ),
        (
            1.09 <= to_number(payload, "lgRatio", 1.1) <= 2.0,
            f"L/G {to_number(payload, 'lgRatio', 1.1):.2f}는 Park 흡수기와 재생기 모듈을 함께 구성하는 권장 범위 1.09~2.00을 벗어납니다.",
        ),
    ]
    return [message + " 결과는 외삽값으로 해석하세요." for ok, message in checks if not ok]


def monthly_rows(result):
    monthly = result.copy()
    monthly["month"] = pd.to_datetime(monthly["time"]).dt.month
    grouped = monthly.groupby("month", as_index=False).agg(
        reg_need_kWh=("REG_HX_HEAT_NEED_kWh", "sum"),
        tes_to_reg_kWh=("REG_HX_HEAT_FROM_TES_kWh", "sum"),
        aux_kWh=("REG_HX_HEAT_FROM_AUX_kWh", "sum"),
        collector_kWh=("COLLECTOR_QU_TOTAL_kWh", "sum"),
    )
    return [
        {
            "month": f"{int(row.month)}월",
            "load": clean_value(row.reg_need_kWh),
            "solar": clean_value(row.tes_to_reg_kWh),
            "aux": clean_value(row.aux_kWh),
            "collector": clean_value(row.collector_kWh),
        }
        for row in grouped.itertuples(index=False)
    ]


def tes_energy_density_kwh_m3(config):
    delta_t = max(config.t_tes_max_c - config.t_tes_min_c, 1e-9)
    return config.rho_w_kg_m3 * config.cp_w_j_kgk * delta_t / 3600 / 1000


def tes_heat_loss_ua_w_k(volume_m3, config):
    """Return insulation-conduction UA for a closed vertical cylindrical tank."""
    volume_m3 = max(float(volume_m3), 0.0)
    if volume_m3 <= 0:
        return 0.0
    aspect_ratio = max(float(config.tes_tank_height_diameter_ratio), 1e-9)
    conductivity = max(float(config.tes_insulation_k_w_mk), 0.0)
    thickness = max(float(config.tes_insulation_thickness_m), 1e-9)
    if conductivity <= 0:
        return 0.0

    inner_radius = (volume_m3 / (2 * math.pi * aspect_ratio)) ** (1 / 3)
    inner_height = 2 * aspect_ratio * inner_radius
    outer_radius = inner_radius + thickness

    ua_side = 2 * math.pi * conductivity * inner_height / math.log(outer_radius / inner_radius)
    ua_ends = conductivity * (2 * math.pi * inner_radius**2) / thickness
    return ua_side + ua_ends


def simulate_tes_tank(result, config, collector, collector_area_m2, volume_m3, design_flow_m3_h):
    volume_m3 = max(float(volume_m3), 0.0)
    design_flow_m3_h = max(float(design_flow_m3_h), 0.0)
    energy_density = tes_energy_density_kwh_m3(config)
    storage_capacity_kwh = volume_m3 * energy_density
    tank_ua_w_k = tes_heat_loss_ua_w_k(volume_m3, config)
    initial_fraction = np.clip(
        (config.t_tes_init_c - config.t_tes_min_c)
        / max(config.t_tes_max_c - config.t_tes_min_c, 1e-9),
        0,
        1,
    )
    storage_kwh = storage_capacity_kwh * initial_fraction

    output = {
        "collector": [],
        "solarDirect": [],
        "storageToReg": [],
        "tesToReg": [],
        "aux": [],
        "flow": [],
        "loss": [],
        "dump": [],
        "tempStart": [],
        "tempEnd": [],
        "storedEnd": [],
    }

    for row in result.itertuples(index=False):
        dt_h = max(float(getattr(row, "dt_h", 1) or 1), 1e-9)
        regen_kwh = max(float(getattr(row, "REG_HX_HEAT_NEED_kWh", 0) or 0), 0.0)
        ambient_c = float(getattr(row, "Ta_degC", config.t_tes_min_c) or config.t_tes_min_c)
        irradiance_w_m2 = max(float(getattr(row, "GT_COLLECTOR_W_m2", 0) or 0), 0.0)
        fill_fraction = storage_kwh / storage_capacity_kwh if storage_capacity_kwh > 1e-9 else 0.0
        tes_temp_start = config.t_tes_min_c + fill_fraction * (config.t_tes_max_c - config.t_tes_min_c)

        useful_w_m2, _, _ = collector_output_w_m2(collector, irradiance_w_m2, tes_temp_start, ambient_c)
        collector_kwh = max(collector_area_m2 * useful_w_m2 * dt_h / 1000, 0.0)
        loss_kwh = min(
            storage_kwh,
            max(tank_ua_w_k * max(tes_temp_start - ambient_c, 0) * dt_h / 1000, 0.0),
        )
        storage_kwh -= loss_kwh

        transfer_limit_kwh = design_flow_m3_h * energy_density * dt_h
        solar_direct_kwh = min(collector_kwh, regen_kwh, transfer_limit_kwh)
        remaining_demand_kwh = regen_kwh - solar_direct_kwh
        remaining_transfer_kwh = max(transfer_limit_kwh - solar_direct_kwh, 0.0)
        storage_to_reg_kwh = min(storage_kwh, remaining_demand_kwh, remaining_transfer_kwh)
        storage_kwh -= storage_to_reg_kwh

        charge_kwh = max(collector_kwh - solar_direct_kwh, 0.0)
        storage_kwh += charge_kwh
        dump_kwh = max(storage_kwh - storage_capacity_kwh, 0.0)
        storage_kwh = min(storage_kwh, storage_capacity_kwh)
        tes_to_reg_kwh = solar_direct_kwh + storage_to_reg_kwh
        aux_kwh = max(regen_kwh - tes_to_reg_kwh, 0.0)
        actual_flow_m3_h = tes_to_reg_kwh / energy_density / dt_h if energy_density > 0 else 0.0
        end_fraction = storage_kwh / storage_capacity_kwh if storage_capacity_kwh > 1e-9 else 0.0
        tes_temp_end = config.t_tes_min_c + end_fraction * (config.t_tes_max_c - config.t_tes_min_c)

        output["collector"].append(collector_kwh)
        output["solarDirect"].append(solar_direct_kwh)
        output["storageToReg"].append(storage_to_reg_kwh)
        output["tesToReg"].append(tes_to_reg_kwh)
        output["aux"].append(aux_kwh)
        output["flow"].append(actual_flow_m3_h)
        output["loss"].append(loss_kwh)
        output["dump"].append(dump_kwh)
        output["tempStart"].append(tes_temp_start)
        output["tempEnd"].append(tes_temp_end)
        output["storedEnd"].append(storage_kwh)

    output["auxTotal"] = sum(output["aux"])
    output["lossTotal"] = sum(output["loss"])
    output["dumpTotal"] = sum(output["dump"])
    output["collectorTotal"] = sum(output["collector"])
    output["tesToRegTotal"] = sum(output["tesToReg"])
    output["maxActualFlow"] = max(output["flow"], default=0.0)
    output["storageCapacityKWh"] = storage_capacity_kwh
    output["tankUA"] = tank_ua_w_k
    return output


def simulate_tes_grid(result, config, collector, collector_area_m2, volume_values, flow_values):
    energy_density = tes_energy_density_kwh_m3(config)
    volumes, flows = np.meshgrid(
        np.asarray(volume_values, dtype=float),
        np.asarray(flow_values, dtype=float),
        indexing="ij",
    )
    volumes = volumes.ravel()
    flows = flows.ravel()
    capacities = volumes * energy_density
    tank_ua = np.asarray([tes_heat_loss_ua_w_k(volume, config) for volume in volumes])
    initial_fraction = np.clip(
        (config.t_tes_init_c - config.t_tes_min_c)
        / max(config.t_tes_max_c - config.t_tes_min_c, 1e-9),
        0,
        1,
    )
    stored = capacities * initial_fraction
    aux_total = np.zeros_like(stored)
    loss_total = np.zeros_like(stored)
    dump_total = np.zeros_like(stored)
    collector_total = np.zeros_like(stored)
    tes_to_reg_total = np.zeros_like(stored)
    max_actual_flow = np.zeros_like(stored)
    delta_t = config.t_tes_max_c - config.t_tes_min_c

    loads = result["REG_HX_HEAT_NEED_kWh"].fillna(0).clip(lower=0).to_numpy(dtype=float)
    time_steps = result["dt_h"].fillna(1).clip(lower=1e-9).to_numpy(dtype=float)
    ambient = result["Ta_degC"].fillna(config.t_tes_min_c).to_numpy(dtype=float)
    irradiance = result["GT_COLLECTOR_W_m2"].fillna(0).clip(lower=0).to_numpy(dtype=float)

    for regen_kwh, dt_h, ambient_c, irradiance_w_m2 in zip(loads, time_steps, ambient, irradiance):
        fill_fraction = np.divide(stored, capacities, out=np.zeros_like(stored), where=capacities > 1e-9)
        tes_temp = config.t_tes_min_c + fill_fraction * delta_t
        if collector.collector_type == "evacuated_tube":
            if irradiance_w_m2 <= 1:
                useful_w_m2 = np.zeros_like(stored)
            else:
                collector_delta_t = np.maximum(tes_temp - ambient_c, 0)
                efficiency = collector.eta0_evacuated
                efficiency -= collector.a1_evacuated * collector_delta_t / irradiance_w_m2
                efficiency -= collector.a2_evacuated * collector_delta_t**2 / irradiance_w_m2
                useful_w_m2 = irradiance_w_m2 * np.maximum(efficiency, 0)
        else:
            absorbed_w_m2 = collector.tau_alpha * irradiance_w_m2
            useful_w_m2 = collector.fr * (absorbed_w_m2 - collector.ul_w_m2k * (tes_temp - ambient_c))
            useful_w_m2 = np.maximum(useful_w_m2, 0) if irradiance_w_m2 > 1 else np.zeros_like(stored)

        collector_kwh = collector_area_m2 * useful_w_m2 * dt_h / 1000
        loss_kwh = np.minimum(
            stored,
            tank_ua * np.maximum(tes_temp - ambient_c, 0) * dt_h / 1000,
        )
        stored -= loss_kwh
        transfer_limit = flows * energy_density * dt_h
        direct = np.minimum(np.minimum(collector_kwh, regen_kwh), transfer_limit)
        remaining_demand = regen_kwh - direct
        remaining_transfer = np.maximum(transfer_limit - direct, 0)
        discharge = np.minimum(np.minimum(stored, remaining_demand), remaining_transfer)
        stored -= discharge
        stored += np.maximum(collector_kwh - direct, 0)
        dump = np.maximum(stored - capacities, 0)
        stored = np.minimum(stored, capacities)
        served = direct + discharge
        aux = np.maximum(regen_kwh - served, 0)
        actual_flow = served / energy_density / dt_h

        aux_total += aux
        loss_total += loss_kwh
        dump_total += dump
        collector_total += collector_kwh
        tes_to_reg_total += served
        max_actual_flow = np.maximum(max_actual_flow, actual_flow)

    return [
        {
            "volume": float(volume),
            "flow": float(flow),
            "storageCapacityKWh": float(capacity),
            "tankUA": float(ua),
            "auxTotal": float(aux),
            "lossTotal": float(loss),
            "dumpTotal": float(dump),
            "collectorTotal": float(collected),
            "tesToRegTotal": float(served),
            "maxActualFlow": float(max_flow),
        }
        for volume, flow, capacity, ua, aux, loss, dump, collected, served, max_flow in zip(
            volumes,
            flows,
            capacities,
            tank_ua,
            aux_total,
            loss_total,
            dump_total,
            collector_total,
            tes_to_reg_total,
            max_actual_flow,
        )
    ]


def apply_tes_dispatch(result, dispatch, design_flow_m3_h):
    adjusted = result.copy()
    adjusted["COLLECTOR_QU_TOTAL_kWh"] = dispatch["collector"]
    adjusted["TES_SOLAR_DIRECT_kWh"] = dispatch["solarDirect"]
    adjusted["TES_STORAGE_TO_REG_kWh"] = dispatch["storageToReg"]
    adjusted["REG_HX_HEAT_FROM_TES_kWh"] = dispatch["tesToReg"]
    adjusted["REG_HX_HEAT_FROM_AUX_kWh"] = dispatch["aux"]
    adjusted["TES_DESIGN_FLOW_m3_h"] = design_flow_m3_h
    adjusted["TES_ACTUAL_FLOW_m3_h"] = dispatch["flow"]
    adjusted["TES_LOSS_SIZED_kWh"] = dispatch["loss"]
    adjusted["TES_DUMP_SIZED_kWh"] = dispatch["dump"]
    adjusted["TES_T_START_SIZED_degC"] = dispatch["tempStart"]
    adjusted["TES_T_SIZED_degC"] = dispatch["tempEnd"]
    adjusted["TES_STORED_END_kWh"] = dispatch["storedEnd"]
    adjusted["AUX_ON"] = adjusted["REG_HX_HEAT_FROM_AUX_kWh"] > 1e-6
    adjusted["REG_ON"] = adjusted["REG_HX_HEAT_NEED_kWh"] > 1e-6
    return adjusted


def values_for_range(min_value, max_value, step, fixed=False):
    if fixed:
        return [float(min_value)]
    lo = min(float(min_value), float(max_value))
    hi = max(float(min_value), float(max_value))
    if abs(hi - lo) < 1e-9:
        return [lo]
    count = max(1, int(round((hi - lo) / step)))
    return [round(lo + (hi - lo) * idx / count, 3) for idx in range(count + 1)]


def initial_collector_area_candidates(min_value, max_value, fixed=False):
    if fixed:
        return [float(min_value)]
    lo = min(float(min_value), float(max_value))
    hi = max(float(min_value), float(max_value))
    span = hi - lo
    if span < 1e-9:
        return [lo]
    count = int(np.clip(math.ceil(span / 250) + 1, 9, 17))
    return np.round(np.linspace(lo, hi, count), 3).tolist()


def refined_collector_area_candidates(initial_values, preferred_areas):
    if len(initial_values) < 2:
        return []
    lo, hi = min(initial_values), max(initial_values)
    coarse_step = (hi - lo) / (len(initial_values) - 1)
    offsets = (-coarse_step / 2, -coarse_step / 4, coarse_step / 4, coarse_step / 2)
    existing = set(initial_values)
    refined = {
        round(np.clip(center + offset, lo, hi), 3)
        for center in preferred_areas
        for offset in offsets
    }
    return sorted(refined - existing)


def derived_tes_candidates(result, config, payload):
    energy_density = tes_energy_density_kwh_m3(config)
    margin = max(to_number(payload, "tesDesignMargin", 15), 0) / 100
    dated_load = pd.DataFrame(
        {
            "date": pd.to_datetime(result["time"]).dt.date,
            "load": result["REG_HX_HEAT_NEED_kWh"].fillna(0).clip(lower=0),
        }
    )
    daily_load = dated_load.groupby("date")["load"].sum()
    max_daily_load_kwh = float(daily_load.max()) if not daily_load.empty else 0.0
    peak_power_kw = float(
        (result["REG_HX_HEAT_NEED_kWh"].fillna(0) / result["dt_h"].clip(lower=1e-9)).max()
    )
    volume_upper_m3 = max(max_daily_load_kwh * (1 + margin) / max(energy_density, 1e-9), 0.2)
    flow_upper_m3_h = max(peak_power_kw / max(energy_density, 1e-9), 0.05)

    volume_candidates = np.square(np.linspace(0, math.sqrt(volume_upper_m3), 10))
    flow_candidates = np.square(np.linspace(0, math.sqrt(flow_upper_m3_h), 10))
    volume_candidates = np.unique(np.round(volume_candidates, 3)).tolist()
    flow_candidates = np.unique(np.round(flow_candidates, 3)).tolist()
    return volume_candidates, flow_candidates, energy_density


def pareto_front(candidates):
    objective_keys = ("auxEnergy", "collectorArea", "tesVolume", "tesDesignFlow", "tesDump")
    front = []
    for index, candidate in enumerate(candidates):
        values = [candidate["best"][key] for key in objective_keys]
        dominated = False
        for other_index, other in enumerate(candidates):
            if index == other_index:
                continue
            other_values = [other["best"][key] for key in objective_keys]
            if all(a <= b + 1e-9 for a, b in zip(other_values, values)) and any(
                a < b - 1e-9 for a, b in zip(other_values, values)
            ):
                dominated = True
                break
        if not dominated:
            front.append(candidate)

    for key in objective_keys:
        values = [item["best"][key] for item in front]
        low, high = min(values), max(values)
        span = high - low
        for item in front:
            item["best"][f"normalized_{key}"] = (item["best"][key] - low) / span if span > 1e-9 else 0.0

    for item in front:
        normalized = [item["best"][f"normalized_{key}"] for key in objective_keys]
        item["best"]["score"] = clean_value(math.sqrt(sum(value**2 for value in normalized)))
        item["best"]["pareto"] = True
    return sorted(front, key=lambda item: item["best"]["score"])


def optimize_tes_design(base_result, payload, base_collector, base_config):
    collector_min = to_number(payload, "collectorMin", base_collector.area_m2)
    collector_max = to_number(payload, "collectorMax", base_collector.area_m2)
    collector_values = initial_collector_area_candidates(
        collector_min,
        collector_max,
        fixed=payload.get("collectorMode") == "fixed",
    )
    supply_temp = to_number(payload, "tesSupplyTemp", base_config.t_tes_max_c)
    return_temp = to_number(payload, "tesReturnTemp", base_config.t_tes_min_c)
    available_area = max(
        to_number(payload, "buildingArea", 0)
        + (to_number(payload, "parkingArea", 0) if payload.get("mallParking") == "yes" else 0),
        0,
    )
    if supply_temp <= return_temp:
        raise ValueError("TES 공급수온도는 환수온도보다 높아야 합니다.")
    candidate_config = replace(base_config, t_tes_min_c=return_temp, t_tes_max_c=supply_temp)
    volume_values, flow_values, energy_density = derived_tes_candidates(base_result, candidate_config, payload)
    candidates = []
    reg_need = float(base_result["REG_HX_HEAT_NEED_kWh"].sum(skipna=True))
    refinement_parents = []
    refined_parent_by_area = {}

    def evaluate_areas(area_values, search_stage, parent_by_area=None):
        for area in area_values:
            grid_results = simulate_tes_grid(
                base_result,
                candidate_config,
                base_collector,
                area,
                volume_values,
                flow_values,
            )
            for trial in grid_results:
                tes_to_reg = trial["tesToRegTotal"]
                aux = trial["auxTotal"]
                coverage = area / available_area if available_area > 0 else 0
                candidates.append(
                    {
                        "best": {
                            "collectorArea": clean_value(area),
                            "searchStage": search_stage,
                            "parentCollectorArea": clean_value((parent_by_area or {}).get(area)) if parent_by_area else None,
                            "tesVolume": clean_value(trial["volume"]),
                            "tesStorageEnergy": clean_value(trial["storageCapacityKWh"]),
                            "tesHeatLossUA": clean_value(trial["tankUA"]),
                            "tesInsulationK": candidate_config.tes_insulation_k_w_mk,
                            "tesKWhPerM3": clean_value(energy_density),
                            "tesSizingMethod": "Two-stage adaptive hourly TES + Pareto closest-to-utopia",
                            "tesDesignFlow": clean_value(trial["flow"]),
                            "tesMaxFlow": clean_value(trial["maxActualFlow"]),
                            "tesLoss": clean_value(trial["lossTotal"]),
                            "tesDump": clean_value(trial["dumpTotal"]),
                            "collectorUsefulEnergy": clean_value(trial["collectorTotal"]),
                            "solutionConcentration": base_config.xi_tank_init * 100,
                            "lgRatio": base_config.lg_ratio_abs,
                            "absSolutionTemp": base_config.t_abs_in_target_c,
                            "regenTemp": base_config.t_reg_in_target_c,
                            "solarShare": tes_to_reg / reg_need if reg_need > 0 else 0,
                            "collectorCoverage": clean_value(coverage),
                            "availableCollectorArea": clean_value(available_area),
                            "auxEnergy": clean_value(aux),
                            "regenNeed": clean_value(reg_need),
                            "usefulSolar": clean_value(tes_to_reg),
                        },
                    }
                )

    evaluate_areas(collector_values, "coarse")

    if abs(collector_max - collector_min) > 500 and payload.get("collectorMode") != "fixed":
        preliminary = pareto_front(candidates)
        preferred_areas = []
        for item in preliminary:
            area = item["best"]["collectorArea"]
            if area not in preferred_areas:
                preferred_areas.append(area)
                refinement_parents.append(dict(item["best"]))
            if len(preferred_areas) == 3:
                break
        refined_values = refined_collector_area_candidates(collector_values, preferred_areas)
        refined_parent_by_area = {
            area: min(preferred_areas, key=lambda parent: (abs(area - parent), parent))
            for area in refined_values
        }
        evaluate_areas(refined_values, "refined", refined_parent_by_area)
        collector_values = sorted(set(collector_values + refined_values))

    if not candidates:
        raise ValueError("TES 설계 후보를 만들 수 없습니다. 공급수온도와 환수온도 범위를 확인하세요.")
    optimized = pareto_front(candidates)
    selected = optimized[0]
    selected["best"]["evaluatedCollectorAreas"] = len(collector_values)
    selected["best"]["evaluatedDesignCombinations"] = len(candidates)
    search_hierarchy = []
    for parent in refinement_parents:
        parent_area = parent["collectorArea"]
        child_candidates = [
            {"best": dict(item["best"])}
            for item in candidates
            if item["best"].get("searchStage") == "refined"
            and item["best"].get("parentCollectorArea") == parent_area
        ]
        child_front = pareto_front(child_candidates) if child_candidates else []
        search_hierarchy.append(
            {
                "id": f"collector-{parent_area:g}",
                "parent": parent,
                "children": [item["best"] for item in child_front[:8]],
            }
        )
    selected["best"]["searchHierarchy"] = search_hierarchy
    selected_dispatch = simulate_tes_tank(
        base_result,
        candidate_config,
        base_collector,
        selected["best"]["collectorArea"],
        selected["best"]["tesVolume"],
        selected["best"]["tesDesignFlow"],
    )
    selected["best"]["auxiliaryHours"] = int(sum(value > 1e-6 for value in selected_dispatch["aux"]))
    selected["result"] = apply_tes_dispatch(
        base_result,
        selected_dispatch,
        selected["best"]["tesDesignFlow"],
    )
    return optimized


def build_weather_preview_from_file(weather_file, source_label, months=tuple(range(1, 13))):
    config = SystemConfig(sim_months=tuple(months))
    collector = WeatherCollectorConfig.for_type("evacuated_tube")
    weather = prepare_weather(weather_file, collector, config)
    n_days = max(weather["time"].dt.date.nunique(), 1)
    grouped = weather.assign(month=weather["time"].dt.month).groupby("month", as_index=False).agg(
        temp=("Ta_degC", "mean"),
        humidity=("RH_pct", "mean"),
        solar=("IT_COLLECTOR_Wh_m2", "sum"),
    )
    points = [
        {
            "month": f"{int(row.month)}월",
            "temp": clean_value(row.temp),
            "humidity": clean_value(row.humidity),
            "solar": clean_value(row.solar / 1000),
        }
        for row in grouped.itertuples(index=False)
    ]
    return {
        "source": source_label,
        "points": points,
        "representative": {
            "outdoorTemp": clean_value(weather["Ta_degC"].mean()),
            "humidity": clean_value(weather["RH_pct"].mean()),
            "irradiance": clean_value(weather["IT_COLLECTOR_Wh_m2"].sum() / 1000 / n_days),
        },
    }


def weather_preview(payload):
    weather_file = resolve_weather_file(payload)
    months = selected_simulation_months(payload)
    dataset = str(payload.get("weatherDataset", ""))
    dataset_labels = {
        "seoul_epw": "서울 TMYx EPW · 2011-2025",
        "bangkok_tmy": "방콕 TMY3",
        "manila_tmy": "마닐라 TMY3",
    }
    dataset_label = "사용자 업로드" if dataset.startswith("uploaded:") else dataset_labels.get(dataset, "표준 기상 데이터")
    return build_weather_preview_from_file(weather_file, f"{dataset_label} · {period_label(months)}", months)


def upload_weather(headers, body):
    original_name, data = parse_multipart_file(headers, body)
    if not data:
        raise ValueError("빈 파일은 업로드할 수 없습니다.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = safe_filename(original_name)
    target = UPLOAD_DIR / filename
    counter = 2
    while target.exists():
        filename = f"{Path(filename).stem}_{counter}{Path(filename).suffix}"
        target = UPLOAD_DIR / filename
        counter += 1
    target.write_bytes(data)

    dataset_id = f"uploaded:{filename}"
    try:
        preview = build_weather_preview_from_file(target, "사용자 업로드 · 연간 전체")
        return {
            "datasetId": dataset_id,
            "filename": filename,
            "label": original_name,
            "supported": True,
            "representative": preview["representative"],
            "message": f"{original_name} 업로드 완료. 기상 추세와 계산에 연결했습니다.",
        }
    except Exception as exc:
        return {
            "datasetId": dataset_id,
            "filename": filename,
            "label": original_name,
            "supported": False,
            "representative": None,
            "message": f"{original_name} 파일은 저장했습니다. 현재 미리보기/계산 파서는 ASOS 탭 형식 우선 지원입니다. ({exc})",
        }


def simulate(payload):
    collector_type, collector, config = build_configs(payload)
    weather_file = resolve_weather_file(payload)
    load_config = replace(
        config,
        reg_flow_control_by_tes=False,
        t_tes_init_c=config.t_tes_min_c,
        ua_tes_w_k=0.0,
    )
    load_collector = replace(collector, area_m2=0.0)
    result, summary = run_simulation(
        weather_file,
        collector_type,
        config=load_config,
        collector=load_collector,
    )
    base_result = result
    optimized = optimize_tes_design(base_result, payload, collector, config)
    best_case = optimized[0]
    result = best_case["result"]
    best = best_case["best"]
    search_hierarchy = best.get("searchHierarchy", [])
    row = summary.iloc[0].to_dict()
    reg_need = float(result["REG_HX_HEAT_NEED_kWh"].sum(skipna=True))
    tes_to_reg = float(result["REG_HX_HEAT_FROM_TES_kWh"].sum(skipna=True))
    aux = float(result["REG_HX_HEAT_FROM_AUX_kWh"].sum(skipna=True))
    row["REG_HX_NEED_total_kWh"] = reg_need
    row["TES_TO_REG_total_kWh"] = tes_to_reg
    row["AUX_TO_REG_total_kWh"] = aux
    row["AUX_ON_hours"] = int(result["AUX_ON"].sum())
    target_unmet_hours = int(row.get("TARGET_HUMIDITY_UNMET_hours", 0) or 0)
    solar_share = tes_to_reg / reg_need if reg_need > 0 else 0
    warnings = empirical_warnings(payload)
    if target_unmet_hours > 0:
        warnings.append(
            f"실제 병렬 LD 계산에서 목표 급기 절대습도를 충족하지 못한 시간이 {target_unmet_hours} h입니다. "
            "농도, 흡수기 용액온도, L/G 또는 모듈 직렬단 구성을 검토하세요."
        )
    monthly_candidate_cache = {}

    def candidate_with_monthly(candidate):
        cache_key = (
            candidate["collectorArea"],
            candidate["tesVolume"],
            candidate["tesDesignFlow"],
        )
        if cache_key not in monthly_candidate_cache:
            dispatch = simulate_tes_tank(
                base_result,
                config,
                collector,
                candidate["collectorArea"],
                candidate["tesVolume"],
                candidate["tesDesignFlow"],
            )
            candidate_result = apply_tes_dispatch(
                base_result,
                dispatch,
                candidate["tesDesignFlow"],
            )
            candidate_reg_need = float(candidate_result["REG_HX_HEAT_NEED_kWh"].sum(skipna=True))
            candidate_solar = float(candidate_result["REG_HX_HEAT_FROM_TES_kWh"].sum(skipna=True))
            candidate_aux = float(candidate_result["REG_HX_HEAT_FROM_AUX_kWh"].sum(skipna=True))
            monthly_candidate_cache[cache_key] = {
                "regenNeed": clean_value(candidate_reg_need),
                "usefulSolar": clean_value(candidate_solar),
                "auxEnergy": clean_value(candidate_aux),
                "solarShare": clean_value(candidate_solar / candidate_reg_need if candidate_reg_need > 0 else 0),
                "monthly": monthly_rows(candidate_result),
            }
        return {
            **candidate,
            **monthly_candidate_cache[cache_key],
            "absorberModules": int(row["ABS_module_count"]),
            "regeneratorModules": int(row["REG_module_count"]),
            "unmetHours": target_unmet_hours,
        }

    display_hierarchy = [
        {
            **group,
            "parent": candidate_with_monthly(group["parent"]),
            "children": [
                candidate_with_monthly(child)
                for child in group["children"]
            ],
        }
        for group in search_hierarchy
    ]
    display_candidates = [
        candidate_with_monthly(
            {
                **item["best"],
                "absorberModules": int(row["ABS_module_count"]),
                "regeneratorModules": int(row["REG_module_count"]),
                "unmetHours": target_unmet_hours,
            }
        )
        for item in optimized[:8]
    ]

    return {
        "warnings": warnings,
        "summary": {key: clean_value(value) for key, value in row.items()},
        "monthly": monthly_rows(result),
        "best": {
            **{key: value for key, value in best.items() if key != "searchHierarchy"},
            "solarShare": solar_share,
            "auxEnergy": aux,
            "unmetHours": target_unmet_hours,
            "auxiliaryHours": int(max(0, row["AUX_ON_hours"])),
            "absorberModules": int(row["ABS_module_count"]),
            "regeneratorModules": int(row["REG_module_count"]),
            "absorberModuleAirFlow": clean_value(row["ABS_module_air_kg_s"]),
            "absorberModuleSolutionFlow": clean_value(row["ABS_module_solution_kg_s"]),
            "regenNeed": reg_need,
            "usefulSolar": tes_to_reg,
        },
        "candidates": display_candidates,
        "searchHierarchy": display_hierarchy,
    }


def render_calculation_page(payload):
    started_at = time.perf_counter()
    try:
        result = simulate(payload)
        bootstrap = {
            "input": payload,
            "result": result,
            "elapsedSeconds": time.perf_counter() - started_at,
        }
    except Exception as exc:
        bootstrap = {
            "input": payload,
            "error": str(exc),
            "elapsedSeconds": time.perf_counter() - started_at,
        }

    bootstrap_json = json.dumps(bootstrap, ensure_ascii=False).replace("<", "\\u003c")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = html.replace(
        "window.__CALCULATION_BOOTSTRAP__ = null;",
        f"window.__CALCULATION_BOOTSTRAP__ = {bootstrap_json};",
    )
    return html.encode("utf-8")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if urlparse(self.path).path == "/api/health":
            body = json.dumps({"ok": True}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in {"/calculate", "/api/simulate", "/api/weather-preview", "/api/weather-upload"}:
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length)
            if path == "/calculate":
                form = parse_qs(raw_body.decode("utf-8"))
                payload = json.loads(form.get("payload", ["{}"])[0])
                body = render_calculation_page(payload)
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
                return
            if path == "/api/weather-upload":
                response = upload_weather(self.headers, raw_body)
            else:
                payload = json.loads(raw_body or b"{}")
                response = weather_preview(payload) if path == "/api/weather-preview" else simulate(payload)
            body = json.dumps(response, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            body = json.dumps({"error": str(exc)}, ensure_ascii=False).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


def main():
    host = "0.0.0.0"
    port = 8765
    server = ThreadingHTTPServer((host, port), Handler)
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("8.8.8.8", 80))
        local_ip = probe.getsockname()[0]
    finally:
        probe.close()
    print("Serving Solar LD Optimizer")
    print(f"  Local:   http://127.0.0.1:{port}")
    print(f"  Network: http://{local_ip}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
