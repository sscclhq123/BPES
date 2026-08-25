from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd


CollectorType = Literal["flat_plate", "evacuated_tube"]


@dataclass
class CollectorConfig:
    collector_type: CollectorType = "flat_plate"
    area_m2: float = 3.0
    tilt_deg: float = 30.0
    azimuth_from_south_deg: float = 0.0
    ground_reflectance: float = 0.20
    fr: float = 0.85
    ul_w_m2k: float = 5.5
    tau_alpha: float = 0.80
    eta0_evacuated: float = np.nan
    a1_evacuated: float = np.nan
    a2_evacuated: float = np.nan

    @classmethod
    def for_type(cls, collector_type: CollectorType) -> "CollectorConfig":
        if collector_type == "evacuated_tube":
            return cls(
                collector_type="evacuated_tube",
                fr=0.75,
                ul_w_m2k=1.5,
                tau_alpha=0.84,
                eta0_evacuated=0.65,
                a1_evacuated=1.00,
                a2_evacuated=0.005,
            )
        return cls()


@dataclass
class SystemConfig:
    v_tes_l: float = 300.0
    t_tes_init_c: float = 42.0
    t_tes_min_c: float = 42.0
    t_tes_max_c: float = 95.0
    rho_w_kg_m3: float = 1000.0
    cp_w_j_kgk: float = 4190.0
    ua_tes_w_k: float = 2.0
    tes_insulation_k_w_mk: float = 0.023
    tes_insulation_thickness_m: float = 0.10  # Fixed commercial buffer-tank reference thickness.
    tes_tank_height_diameter_ratio: float = 2.0

    m_solution_tank_init_kg: float = 400.0
    solution_tank_residence_time_s: float = 155.0
    t_solution_tank_init_c: float = 42.0
    xi_tank_init: float = 0.38
    xi_target: float = 0.38
    xi_regen_on: float = 0.379
    xi_aux_on: float = 0.375
    xi_abs_stop: float = 0.360
    ua_solution_tank_w_k: float = 2.0

    sa_abs_m3h: float = 1200.0
    rho_air_kg_m3: float = 1.2
    lg_ratio_abs: float = 1.0
    lg_auto_control: bool = True
    lg_ratio_min: float = 1.09
    lg_ratio_max: float = 2.00
    sa_reg_factor: float = 1.0
    lg_ratio_reg_design: float = 1.0
    reg_flow_control_by_tes: bool = True

    d_outlet_m: float = 0.30
    fan_static_pressure_design_pa: float = 150.0
    t_abs_in_target_c: float = 25.0
    t_reg_in_target_c: float = 55.0
    abs_temp_auto_control: bool = True
    reg_temp_auto_control: bool = True
    reg_temp_min_c: float = 48.5
    reg_temp_max_c: float = 59.4
    target_supply_w_g_kg: float = 10.0
    target_humidity_tolerance_g_kg: float = 0.5
    eps_tes_reg_hx: float = 0.80
    eps_dec: float = 0.95
    eff_enthalpy: float = 0.70
    p_atm_kpa: float = 101.325
    dt_internal_s: float = 60.0
    sim_months: tuple[int, ...] = tuple(range(1, 13))
    operation_start_hour: int = 9
    operation_hours_per_day: int = 9

    # Park et al. absorber regression data domain, applied per parallel module.
    abs_module_air_min_kg_s: float = 0.15
    abs_module_air_max_kg_s: float = 0.73
    abs_module_solution_min_kg_s: float = 0.63
    abs_module_solution_max_kg_s: float = 2.08

    # Regenerator power-law correlation data domain, applied per active module.
    reg_module_air_min_kg_s: float = 0.24
    reg_module_air_max_kg_s: float = 0.40
    reg_module_solution_min_kg_s: float = 0.26
    reg_module_solution_max_kg_s: float = 0.48


def safe_div(a: float, b: float) -> float:
    if pd.isna(a) or pd.isna(b) or abs(b) < 1e-12:
        return np.nan
    return a / b


def apply_absorber_outlier_control(effectiveness: float) -> float:
    """Reproduce the supplied MATLAB rule: values over 0.70 become 0.69."""
    if effectiveness > 0.70:
        return 0.69
    return effectiveness


def is_operation_hour(timestamp, config: SystemConfig) -> bool:
    if config.operation_hours_per_day >= 24:
        return True
    hour = pd.Timestamp(timestamp).hour
    end_hour = config.operation_start_hour + config.operation_hours_per_day
    return config.operation_start_hour <= hour < end_hour


def required_parallel_modules(
    total_air_kg_s: float,
    total_solution_kg_s: float,
    air_min_kg_s: float,
    air_max_kg_s: float,
    solution_min_kg_s: float,
    solution_max_kg_s: float,
    component_name: str,
) -> int:
    if total_air_kg_s <= 0 or total_solution_kg_s <= 0:
        raise ValueError(f"{component_name} 전체 공기 및 용액 유량은 0보다 커야 합니다.")

    # The process-air duty determines the number of parallel contactors.  The
    # solution loop is recirculated independently and is clamped to the
    # correlation range after the module count has been selected.
    minimum_count = max(1, math.ceil(total_air_kg_s / air_max_kg_s - 1e-12))
    maximum_count = math.floor(total_air_kg_s / air_min_kg_s + 1e-12)
    if minimum_count > maximum_count:
        raise ValueError(
            f"{component_name} 처리풍량이 단일 모듈 최소 공기유량보다 작습니다. "
            f"전체 공기 {total_air_kg_s:.3f} kg/s 조건을 확인하세요."
        )
    return minimum_count


def bounded_solution_flow(
    requested_solution_kg_s: float,
    module_count: int,
    solution_min_kg_s: float,
    solution_max_kg_s: float,
) -> float:
    """Keep each parallel module inside the empirical solution-flow domain."""
    return float(np.clip(
        requested_solution_kg_s,
        module_count * solution_min_kg_s,
        module_count * solution_max_kg_s,
    ))


def staged_regenerator_flow(
    requested_solution_kg_s: float,
    lg_ratio: float,
    installed_modules: int,
    config: SystemConfig,
) -> tuple[float, float, int]:
    if requested_solution_kg_s <= 0 or lg_ratio <= 0 or installed_modules <= 0:
        return 0.0, 0.0, 0

    per_module_solution_min = max(
        config.reg_module_solution_min_kg_s,
        config.reg_module_air_min_kg_s * lg_ratio,
    )
    per_module_solution_max = min(
        config.reg_module_solution_max_kg_s,
        config.reg_module_air_max_kg_s * lg_ratio,
    )
    if per_module_solution_min > per_module_solution_max:
        return 0.0, 0.0, 0

    best_solution_flow = 0.0
    best_active_modules = 0
    for module_count in range(1, installed_modules + 1):
        lower = module_count * per_module_solution_min
        upper = module_count * per_module_solution_max
        if lower <= requested_solution_kg_s <= upper:
            best_solution_flow = requested_solution_kg_s
            best_active_modules = module_count
            break
        deliverable = min(requested_solution_kg_s, upper)
        if deliverable >= lower and deliverable > best_solution_flow:
            best_solution_flow = deliverable
            best_active_modules = module_count

    if best_active_modules == 0:
        return 0.0, 0.0, 0
    return best_solution_flow, best_solution_flow / lg_ratio, best_active_modules


def sind(x):
    return np.sin(np.deg2rad(x))


def cosd(x):
    return np.cos(np.deg2rad(x))


def saturation_pressure_kpa(tc):
    return 0.61078 * np.exp((17.2694 * tc) / (tc + 237.29))


def humidity_ratio_from_trh(tc, rh, p_atm_kpa=101.325):
    pws = saturation_pressure_kpa(tc)
    pv = (rh / 100.0) * pws
    pv = np.minimum(pv, 0.98 * p_atm_kpa)
    return 0.621945 * pv / (p_atm_kpa - pv)


def moist_air_enthalpy(tc, w):
    return 1.006 * tc + w * (2501 + 1.86 * tc)


def rh_from_tw(tc, w, p_atm_kpa=101.325):
    pv = (w * p_atm_kpa) / (0.621945 + w)
    pws = saturation_pressure_kpa(tc)
    return np.clip(100 * pv / pws, 0, 100)


def dry_air_volume_flow_m3h(m_dot_dry_air, tc, w, p_atm_kpa=101.325):
    r_da = 0.287042
    v = r_da * (tc + 273.15) * (1 + 1.607858 * w) / p_atm_kpa
    return m_dot_dry_air * v * 3600


def latent_heat_vaporization_water_kjkg(tc):
    return max(2501 - 2.361 * tc, 0)


def solution_enthalpy(xi, t_c):
    return 585.977 * xi + 2.7 * t_c - 181.659


def solution_temperature_from_h(h, xi):
    return (h + 181.659 - 585.977 * xi) / 2.7


def cp_licl_solution_kjkgk(xi, t_c):
    return max(-2.379 * xi - 0.002 * t_c + 3.726, 0.1)


def calc_twb_stull(t_c, rh):
    return (
        t_c * np.arctan(0.151977 * np.sqrt(rh + 8.313659))
        + np.arctan(t_c + rh)
        - np.arctan(rh - 1.676331)
        + 0.00391838 * rh**1.5 * np.arctan(0.023101 * rh)
        - 4.686035
    )


def empty_absorber_result():
    return {
        "w_eq": np.nan,
        "eff": np.nan,
        "T_air_out": np.nan,
        "w_air_out": np.nan,
        "m_water_absorb": 0.0,
        "m_sol_out": np.nan,
        "xi_out": np.nan,
        "h_sol_out": np.nan,
        "T_sol_out": np.nan,
    }


def empty_regenerator_result():
    return {
        "w_eq": np.nan,
        "eff": np.nan,
        "T_air_out": np.nan,
        "w_air_out": np.nan,
        "m_water_desorb": 0.0,
        "m_sol_out": np.nan,
        "xi_out": np.nan,
        "h_sol_out": np.nan,
        "T_sol_out": np.nan,
    }


def absorber_block(ta, rh, w_oa, h_oa, p_atm, m_dot_oa, m_dot_sol_in, t_sol_in, xi_in, eff_enthalpy):
    a0, a1, a2 = 4.58208, -0.159174, 0.0072594
    b0, b1, b2 = -18.3816, 0.5661, -0.019314
    c0, c1, c2 = 21.312, -0.666, 0.01332
    p_sol = (a0 + a1 * t_sol_in + a2 * t_sol_in**2)
    p_sol += (b0 + b1 * t_sol_in + b2 * t_sol_in**2) * xi_in
    p_sol += (c0 + c1 * t_sol_in + c2 * t_sol_in**2) * xi_in**2
    p_sol = max(1e-6, min(p_sol, 0.98 * p_atm))
    w_eq = 0.622 * p_sol / (p_atm - p_sol)

    alpha = [
        1.3906,
        -0.0473,
        -0.0045,
        0.0427,
        -0.5539,
        0.3870,
        -2.8714,
        -0.0016,
        0.0021,
        0.0048,
        -0.0051,
        0.0005,
        0.0006,
        -0.0018,
        -0.0016,
        0.0019,
        1.4589,
        -0.9721,
    ]
    f_dot_oa_abs = m_dot_oa / 104 * 1000
    f_dot_sol_abs_in = m_dot_sol_in / 104 * 1000
    w_oa_g = w_oa * 1000
    eff = (
        alpha[0]
        + alpha[1] * f_dot_oa_abs
        + alpha[2] * f_dot_sol_abs_in
        + alpha[3] * ta
        + alpha[4] * w_oa_g
        + alpha[5] * t_sol_in
        + alpha[6] * xi_in
        + alpha[7] * f_dot_oa_abs * f_dot_sol_abs_in
        + alpha[8] * f_dot_oa_abs * ta
        + alpha[9] * f_dot_oa_abs * w_oa_g
        + alpha[10] * f_dot_oa_abs * t_sol_in
        + alpha[11] * f_dot_sol_abs_in * w_oa_g
        + alpha[12] * f_dot_sol_abs_in * t_sol_in
        + alpha[13] * ta * w_oa_g
        + alpha[14] * ta * t_sol_in
        + alpha[15] * w_oa_g * t_sol_in
        + alpha[16] * w_oa_g * xi_in
        + alpha[17] * t_sol_in * xi_in
    )
    eff = apply_absorber_outlier_control(eff)
    w_air_out = max(0, min(w_oa - eff * (w_oa - w_eq), w_oa))
    t_air_out = ta - eff * (ta - t_sol_in)
    m_water_absorb = max(m_dot_oa * (w_oa - w_air_out), 0)
    m_sol_out = m_dot_sol_in + m_water_absorb
    xi_out = xi_in * m_dot_sol_in / max(m_sol_out, 1e-9)
    xi_out = max(0.20, min(0.60, xi_out))
    h_air_out = moist_air_enthalpy(t_air_out, w_air_out)
    h_sol_in = solution_enthalpy(xi_in, t_sol_in)
    h_sol_out = (h_sol_in * m_dot_sol_in + (h_oa - h_air_out) * eff_enthalpy * m_dot_oa) / max(
        m_sol_out, 1e-9
    )
    t_sol_out = solution_temperature_from_h(h_sol_out, xi_out)
    return {
        "w_eq": w_eq,
        "eff": eff,
        "T_air_out": t_air_out,
        "w_air_out": w_air_out,
        "m_water_absorb": m_water_absorb,
        "m_sol_out": m_sol_out,
        "xi_out": xi_out,
        "h_sol_out": h_sol_out,
        "T_sol_out": t_sol_out,
    }


def parallel_absorber_block(
    ta,
    rh,
    w_oa,
    h_oa,
    p_atm,
    total_air_kg_s,
    total_solution_kg_s,
    module_count,
    t_sol_in,
    xi_in,
    eff_enthalpy,
):
    module_result = absorber_block(
        ta,
        rh,
        w_oa,
        h_oa,
        p_atm,
        total_air_kg_s / module_count,
        total_solution_kg_s / module_count,
        t_sol_in,
        xi_in,
        eff_enthalpy,
    )
    result = dict(module_result)
    result["m_water_absorb"] *= module_count
    result["m_sol_out"] *= module_count
    result["module_count"] = module_count
    return result


def apply_absorber_target_control(
    result,
    target_w_kgkg,
    inlet_air_t_c,
    inlet_air_w_kgkg,
    inlet_air_h_kjkg,
    total_air_kg_s,
    total_solution_kg_s,
    solution_xi,
    solution_t_c,
    eff_enthalpy,
):
    """Mix untreated bypass air so the delivered air does not exceed the moisture target."""
    raw_out_w = float(result["w_air_out"])
    if raw_out_w >= target_w_kgkg or inlet_air_w_kgkg <= target_w_kgkg:
        result["process_air_fraction"] = 1.0
        return result

    removable_raw = max(inlet_air_w_kgkg - raw_out_w, 1e-12)
    process_fraction = float(np.clip(
        (inlet_air_w_kgkg - target_w_kgkg) / removable_raw,
        0.0,
        1.0,
    ))
    controlled = dict(result)
    controlled["process_air_fraction"] = process_fraction
    controlled["eff"] = float(result["eff"]) * process_fraction
    controlled["w_air_out"] = target_w_kgkg
    controlled["T_air_out"] = inlet_air_t_c + process_fraction * (
        float(result["T_air_out"]) - inlet_air_t_c
    )
    controlled["m_water_absorb"] = total_air_kg_s * max(
        inlet_air_w_kgkg - target_w_kgkg,
        0.0,
    )
    controlled["m_sol_out"] = total_solution_kg_s + controlled["m_water_absorb"]
    controlled["xi_out"] = float(np.clip(
        solution_xi * total_solution_kg_s / max(controlled["m_sol_out"], 1e-9),
        0.20,
        0.60,
    ))
    h_air_out = moist_air_enthalpy(controlled["T_air_out"], controlled["w_air_out"])
    h_sol_in = solution_enthalpy(solution_xi, solution_t_c)
    controlled["h_sol_out"] = (
        h_sol_in * total_solution_kg_s
        + (inlet_air_h_kjkg - h_air_out) * eff_enthalpy * total_air_kg_s
    ) / max(controlled["m_sol_out"], 1e-9)
    controlled["T_sol_out"] = solution_temperature_from_h(
        controlled["h_sol_out"], controlled["xi_out"]
    )
    return controlled


def controlled_parallel_absorber_block(
    ta,
    rh,
    w_oa,
    h_oa,
    p_atm,
    total_air_kg_s,
    total_solution_kg_s,
    module_count,
    requested_solution_t_c,
    xi_in,
    eff_enthalpy,
    target_w_kgkg,
    auto_temperature_control=True,
    solution_t_min_c=8.05,
    solution_t_max_c=31.4,
    auto_lg_control=False,
    lg_ratio_min=1.09,
    lg_ratio_max=2.00,
):
    """Control L/G first, then optionally solution temperature, with bypass as safeguard."""

    def evaluate(solution_t_c, solution_flow_kg_s=total_solution_kg_s):
        result = parallel_absorber_block(
            ta,
            rh,
            w_oa,
            h_oa,
            p_atm,
            total_air_kg_s,
            solution_flow_kg_s,
            module_count,
            solution_t_c,
            xi_in,
            eff_enthalpy,
        )
        result["ABS_SOL_IN_T_CONTROLLED_degC"] = float(solution_t_c)
        result["ABS_TEMP_CONTROL_ACTIVE"] = bool(auto_temperature_control)
        result["ABS_LG_CONTROLLED"] = float(solution_flow_kg_s / max(total_air_kg_s, 1e-9))
        result["ABS_LG_CONTROL_ACTIVE"] = bool(auto_lg_control)
        result["ABS_SOL_IN_mdot_kg_s"] = float(solution_flow_kg_s)
        return result

    requested_solution_t_c = float(np.clip(
        requested_solution_t_c,
        solution_t_min_c,
        solution_t_max_c,
    ))
    if auto_lg_control:
        low_lg = float(lg_ratio_min)
        high_lg = float(lg_ratio_max)
        low_result = evaluate(requested_solution_t_c, low_lg * total_air_kg_s)
        high_result = evaluate(requested_solution_t_c, high_lg * total_air_kg_s)
        if float(low_result["w_air_out"]) <= target_w_kgkg:
            selected = low_result
        elif float(high_result["w_air_out"]) > target_w_kgkg:
            selected = high_result
        else:
            selected = high_result
            for _ in range(18):
                mid_lg = (low_lg + high_lg) / 2
                mid_result = evaluate(requested_solution_t_c, mid_lg * total_air_kg_s)
                if float(mid_result["w_air_out"]) <= target_w_kgkg:
                    high_lg = mid_lg
                    selected = mid_result
                else:
                    low_lg = mid_lg
            selected = evaluate(requested_solution_t_c, high_lg * total_air_kg_s)
    elif not auto_temperature_control:
        selected = evaluate(requested_solution_t_c)
    else:
        low_t = float(solution_t_min_c)
        high_t = float(solution_t_max_c)
        low_result = evaluate(low_t)
        high_result = evaluate(high_t)
        low_w = float(low_result["w_air_out"])
        high_w = float(high_result["w_air_out"])

        if low_w > target_w_kgkg:
            # Even the coldest permitted solution cannot reach the target.
            selected = low_result
        elif high_w < target_w_kgkg:
            # Even the warmest permitted solution over-dehumidifies; use it,
            # then apply the bypass safeguard below.
            selected = high_result
        else:
            selected = evaluate(requested_solution_t_c)
            for _ in range(18):
                mid_t = (low_t + high_t) / 2
                mid_result = evaluate(mid_t)
                if float(mid_result["w_air_out"]) < target_w_kgkg:
                    low_t = mid_t
                else:
                    high_t = mid_t
                selected = mid_result
            selected = evaluate(high_t)

    # L/G is the primary variable. When it reaches a permitted boundary without
    # meeting the target, optionally use absorber solution temperature as the
    # secondary control selected by the user.
    if auto_lg_control and auto_temperature_control and abs(float(selected["w_air_out"]) - target_w_kgkg) > 1e-7:
        selected_solution_flow = float(selected["ABS_LG_CONTROLLED"] * total_air_kg_s)
        low_t = float(solution_t_min_c)
        high_t = float(solution_t_max_c)
        low_result = evaluate(low_t, selected_solution_flow)
        high_result = evaluate(high_t, selected_solution_flow)
        if float(low_result["w_air_out"]) > target_w_kgkg:
            selected = low_result
        elif float(high_result["w_air_out"]) < target_w_kgkg:
            selected = high_result
        else:
            for _ in range(18):
                mid_t = (low_t + high_t) / 2
                mid_result = evaluate(mid_t, selected_solution_flow)
                if float(mid_result["w_air_out"]) < target_w_kgkg:
                    low_t = mid_t
                else:
                    high_t = mid_t
                selected = mid_result
            selected = evaluate(high_t, selected_solution_flow)

    controlled_t = float(selected["ABS_SOL_IN_T_CONTROLLED_degC"])
    controlled_solution_flow = float(selected["ABS_LG_CONTROLLED"] * total_air_kg_s)
    controlled = apply_absorber_target_control(
        selected,
        target_w_kgkg,
        ta,
        w_oa,
        h_oa,
        total_air_kg_s,
        controlled_solution_flow,
        xi_in,
        controlled_t,
        eff_enthalpy,
    )
    controlled["ABS_SOL_IN_T_CONTROLLED_degC"] = controlled_t
    controlled["ABS_TEMP_CONTROL_ACTIVE"] = bool(auto_temperature_control)
    controlled["ABS_LG_CONTROLLED"] = float(selected["ABS_LG_CONTROLLED"])
    controlled["ABS_LG_CONTROL_ACTIVE"] = bool(auto_lg_control)
    controlled["ABS_SOL_IN_mdot_kg_s"] = controlled_solution_flow
    return controlled


def regenerator_block(
    ta,
    rh,
    w_oa,
    h_oa,
    p_atm,
    m_dot_oa_reg,
    m_dot_sol_in,
    t_sol_in,
    xi_in,
    m_water_absorb_ref,
    eff_enthalpy,
):
    a3, a4, a5 = 16.294, -0.8893, 0.01927
    b3, b4, b5 = 74.3, -1.8035, -0.01875
    c3, c4, c5 = -226.4, 7.49, -0.039
    p_sol = (a3 + a4 * t_sol_in + a5 * t_sol_in**2)
    p_sol += (b3 + b4 * t_sol_in + b5 * t_sol_in**2) * xi_in
    p_sol += (c3 + c4 * t_sol_in + c5 * t_sol_in**2) * xi_in**2
    p_sol = max(1e-6, min(p_sol, 0.98 * p_atm))
    w_eq = 0.622 * p_sol / (p_atm - p_sol)
    if (m_dot_sol_in <= 0) or (m_dot_oa_reg <= 0) or (w_eq <= w_oa):
        return {
            "w_eq": w_eq,
            "eff": 0.0,
            "T_air_out": ta,
            "w_air_out": w_oa,
            "m_water_desorb": 0.0,
            "m_sol_out": m_dot_sol_in,
            "xi_out": xi_in,
            "h_sol_out": solution_enthalpy(xi_in, t_sol_in),
            "T_sol_out": t_sol_in,
        }

    m_reg_g_s = (
        6.602e-8
        * max(m_dot_oa_reg, 1e-9) ** 0.1649
        * max(w_oa, 1e-9) ** (-0.4617)
        * max(m_dot_sol_in, 1e-9) ** 0.4818
        * max(t_sol_in, 1e-9) ** 3.223
        * max(xi_in, 1e-9) ** (-2.9341)
    )
    m_water_desorb = max(m_reg_g_s / 1000, 0)
    if np.isfinite(m_water_absorb_ref) and m_water_absorb_ref > 0:
        m_water_desorb = min(m_water_desorb, 1.2 * m_water_absorb_ref)
    m_water_desorb = min(m_water_desorb, 0.8 * m_dot_sol_in)
    m_sol_out = max(m_dot_sol_in - m_water_desorb, 1e-9)
    xi_out = max(0.20, min(0.60, xi_in * m_dot_sol_in / m_sol_out))
    w_air_out = w_oa + m_water_desorb / m_dot_oa_reg
    eff = max(0, min(1.0, safe_div(w_air_out - w_oa, w_eq - w_oa)))
    t_air_out = max(ta, min(ta + eff * (t_sol_in - ta), t_sol_in))
    h_air_out = moist_air_enthalpy(t_air_out, w_air_out)
    h_sol_in = solution_enthalpy(xi_in, t_sol_in)
    h_sol_out = (h_sol_in * m_dot_sol_in - (h_air_out - h_oa) * eff_enthalpy * m_dot_oa_reg) / max(
        m_sol_out, 1e-9
    )
    t_sol_out = solution_temperature_from_h(h_sol_out, xi_out)
    return {
        "w_eq": w_eq,
        "eff": eff,
        "T_air_out": t_air_out,
        "w_air_out": w_air_out,
        "m_water_desorb": m_water_desorb,
        "m_sol_out": m_sol_out,
        "xi_out": xi_out,
        "h_sol_out": h_sol_out,
        "T_sol_out": t_sol_out,
    }


def parallel_regenerator_block(
    ta,
    rh,
    w_oa,
    h_oa,
    p_atm,
    total_air_kg_s,
    total_solution_kg_s,
    module_count,
    t_sol_in,
    xi_in,
    total_water_absorb_ref,
    eff_enthalpy,
):
    module_reference = total_water_absorb_ref
    if np.isfinite(total_water_absorb_ref):
        module_reference = total_water_absorb_ref / module_count
    module_result = regenerator_block(
        ta,
        rh,
        w_oa,
        h_oa,
        p_atm,
        total_air_kg_s / module_count,
        total_solution_kg_s / module_count,
        t_sol_in,
        xi_in,
        module_reference,
        eff_enthalpy,
    )
    result = dict(module_result)
    result["m_water_desorb"] *= module_count
    result["m_sol_out"] *= module_count
    result["module_count"] = module_count
    return result


def read_asos_weather(filename: str | Path) -> pd.DataFrame:
    df = pd.read_csv(filename, sep="\t", encoding="cp949")
    df.columns = [str(c).strip() for c in df.columns]
    dt = pd.to_datetime(df["일시"].astype(str).str.strip(), errors="coerce")
    out = pd.DataFrame(
        {
            "time": dt,
            "Ta_degC": pd.to_numeric(df["기온(°C)"], errors="coerce").interpolate(),
            "RH_pct": pd.to_numeric(df["습도(%)"], errors="coerce").interpolate().clip(0, 100),
            "GHI_Wh_m2": pd.to_numeric(df["일사(MJ/m2)"], errors="coerce").fillna(0).clip(lower=0) * 277.7778,
        }
    )
    return out.dropna(subset=["time", "Ta_degC", "RH_pct", "GHI_Wh_m2"]).reset_index(drop=True)


def read_epw_weather(filename: str | Path) -> pd.DataFrame:
    epw = pd.read_csv(filename, skiprows=8, header=None)
    # TMYx may use a different representative year for each month. Normalize it
    # to one non-leap year so timestep differences remain hourly at month edges.
    year = pd.Series(2001, index=epw.index)
    month = pd.to_numeric(epw.iloc[:, 1], errors="coerce")
    day = pd.to_numeric(epw.iloc[:, 2], errors="coerce")
    hour = pd.to_numeric(epw.iloc[:, 3], errors="coerce").clip(1, 24) - 1
    time = pd.to_datetime(
        {"year": year, "month": month, "day": day, "hour": hour},
        errors="coerce",
    )
    out = pd.DataFrame(
        {
            "time": time,
            "Ta_degC": pd.to_numeric(epw.iloc[:, 6], errors="coerce"),
            "RH_pct": pd.to_numeric(epw.iloc[:, 8], errors="coerce").clip(0, 100),
            "GHI_Wh_m2": pd.to_numeric(epw.iloc[:, 13], errors="coerce").fillna(0).clip(lower=0),
        }
    )
    return out.dropna(subset=["time", "Ta_degC", "RH_pct", "GHI_Wh_m2"]).reset_index(drop=True)


def read_weather(filename: str | Path) -> pd.DataFrame:
    path = Path(filename)
    is_epw = path.name.lower().endswith((".epw", ".epw.gz"))
    return read_epw_weather(path) if is_epw else read_asos_weather(path)


def decompose_ghi_erbs(time, ghi_wh_m2, lat_deg=37.5665, lon_deg=126.9780, tz=9):
    dt = pd.DatetimeIndex(time)
    n = dt.dayofyear.to_numpy()
    hour_mid = dt.hour.to_numpy() + dt.minute.to_numpy() / 60 - 0.5
    phi = np.deg2rad(lat_deg)
    b = np.deg2rad(360 * (n - 81) / 364)
    eot_min = 9.87 * np.sin(2 * b) - 7.53 * np.cos(b) - 1.5 * np.sin(b)
    solar_time = hour_mid + (4 * (lon_deg - 15 * tz) + eot_min) / 60
    omega = np.deg2rad(15 * (solar_time - 12))
    delta = np.deg2rad(23.45 * sind(360 * (284 + n) / 365))
    cos_zenith = np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.cos(omega)
    cos_zenith = np.maximum(cos_zenith, 0)
    e0 = 1 + 0.033 * cosd(360 * n / 365)
    i0h = 1367 * e0 * cos_zenith
    i0h[cos_zenith <= 1e-6] = 0
    kt = np.zeros_like(ghi_wh_m2, dtype=float)
    sun_up = i0h > 1e-6
    kt[sun_up] = ghi_wh_m2[sun_up] / i0h[sun_up]
    kt = np.clip(kt, 0, 1.2)
    diffuse_fraction = np.ones_like(kt)
    low = kt <= 0.22
    mid = (kt > 0.22) & (kt <= 0.80)
    high = kt > 0.80
    diffuse_fraction[low] = 1 - 0.09 * kt[low]
    diffuse_fraction[mid] = (
        0.9511
        - 0.1604 * kt[mid]
        + 4.388 * kt[mid] ** 2
        - 16.638 * kt[mid] ** 3
        + 12.336 * kt[mid] ** 4
    )
    diffuse_fraction[high] = 0.165
    diffuse_fraction = np.clip(diffuse_fraction, 0, 1)
    dhi = ghi_wh_m2 * diffuse_fraction
    beam_horizontal = np.maximum(ghi_wh_m2 - dhi, 0)
    dni = np.zeros_like(ghi_wh_m2, dtype=float)
    dni[sun_up] = beam_horizontal[sun_up] / np.maximum(cos_zenith[sun_up], 1e-6)
    return np.maximum(dni, 0), dhi


def tilted_irradiance_isotropic(
    time,
    ghi_wh_m2,
    dni_wh_m2,
    dhi_wh_m2,
    tilt_deg=30,
    azimuth_from_south_deg=0,
    ground_reflectance=0.20,
    lat_deg=37.5665,
    lon_deg=126.9780,
    tz=9,
):
    dt = pd.DatetimeIndex(time)
    n = dt.dayofyear.to_numpy()
    hour_local = dt.hour.to_numpy() + dt.minute.to_numpy() / 60 - 0.5
    beta = np.deg2rad(tilt_deg)
    gamma = np.deg2rad(azimuth_from_south_deg)
    phi = np.deg2rad(lat_deg)
    b = np.deg2rad(360 * (n - 81) / 364)
    eot_min = 9.87 * np.sin(2 * b) - 7.53 * np.cos(b) - 1.5 * np.sin(b)
    solar_time = hour_local + (4 * (lon_deg - 15 * tz) + eot_min) / 60
    omega = np.deg2rad(15 * (solar_time - 12))
    delta = np.deg2rad(23.45 * sind(360 * (284 + n) / 365))
    cos_zenith = np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.cos(omega)
    cos_zenith = np.maximum(cos_zenith, 0)
    cos_incidence = (
        np.sin(delta) * np.sin(phi) * np.cos(beta)
        - np.sin(delta) * np.cos(phi) * np.sin(beta) * np.cos(gamma)
        + np.cos(delta) * np.cos(phi) * np.cos(beta) * np.cos(omega)
        + np.cos(delta) * np.sin(phi) * np.sin(beta) * np.cos(gamma) * np.cos(omega)
        + np.cos(delta) * np.sin(beta) * np.sin(gamma) * np.sin(omega)
    )
    cos_incidence = np.maximum(cos_incidence, 0)
    beam_tilt = dni_wh_m2 * cos_incidence
    diffuse_tilt = dhi_wh_m2 * (1 + np.cos(beta)) / 2
    ground_tilt = ghi_wh_m2 * ground_reflectance * (1 - np.cos(beta)) / 2
    return np.maximum(beam_tilt + diffuse_tilt + ground_tilt, 0)


def prepare_weather(weather_file: str | Path, collector: CollectorConfig, config: SystemConfig) -> pd.DataFrame:
    weather = read_weather(weather_file)
    dni, dhi = decompose_ghi_erbs(weather["time"], weather["GHI_Wh_m2"].to_numpy())
    it = tilted_irradiance_isotropic(
        weather["time"],
        weather["GHI_Wh_m2"].to_numpy(),
        dni,
        dhi,
        collector.tilt_deg,
        collector.azimuth_from_south_deg,
        collector.ground_reflectance,
    )
    weather["DNI_Wh_m2"] = dni
    weather["DHI_Wh_m2"] = dhi
    weather["IT_COLLECTOR_Wh_m2"] = it
    selected_months = tuple(dict.fromkeys(int(month) for month in config.sim_months))
    if not selected_months or any(month < 1 or month > 12 for month in selected_months):
        raise ValueError("시뮬레이션 월은 1~12월 중 하나 이상이어야 합니다.")
    mask = weather["time"].dt.month.isin(selected_months)
    weather = weather.loc[mask].reset_index(drop=True)
    if weather.empty:
        raise ValueError("선택한 월에 해당하는 기상 데이터가 없습니다.")
    dt_h = weather["time"].diff().dt.total_seconds().shift(-1) / 3600
    median_dt = dt_h[dt_h > 0].median()
    weather["dt_h"] = dt_h.fillna(median_dt).where(lambda s: (s > 0) & np.isfinite(s), 1.0)
    weather["dt_s"] = weather["dt_h"] * 3600
    weather["GT_COLLECTOR_W_m2"] = weather["IT_COLLECTOR_Wh_m2"] / weather["dt_h"]
    return weather


def collector_output_w_m2(collector: CollectorConfig, gt_w_m2, t_tes_c, ta_c):
    s_abs = collector.tau_alpha * gt_w_m2
    if collector.collector_type == "evacuated_tube":
        if gt_w_m2 <= 1:
            return 0.0, s_abs, 0.0
        dt_collector = max(t_tes_c - ta_c, 0)
        eta = collector.eta0_evacuated
        eta -= collector.a1_evacuated * dt_collector / gt_w_m2
        eta -= collector.a2_evacuated * dt_collector**2 / gt_w_m2
        eta = max(eta, 0.0)
        return gt_w_m2 * eta, s_abs, eta
    q_raw = collector.fr * (s_abs - collector.ul_w_m2k * (t_tes_c - ta_c))
    return max(q_raw, 0.0) if gt_w_m2 > 1 else 0.0, s_abs, np.nan


def run_simulation(
    weather_file: str | Path,
    collector_type: CollectorType,
    config: SystemConfig | None = None,
    collector: CollectorConfig | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    config = config or SystemConfig()
    collector = collector or CollectorConfig.for_type(collector_type)
    weather = prepare_weather(weather_file, collector, config)

    m_dot_oa_abs = config.sa_abs_m3h / 3600 * config.rho_air_kg_m3
    m_dot_sol_abs_cmd = config.lg_ratio_abs * m_dot_oa_abs
    m_dot_oa_reg = config.sa_abs_m3h / 3600 * config.sa_reg_factor * config.rho_air_kg_m3
    m_dot_sol_reg_design = config.lg_ratio_reg_design * m_dot_oa_reg
    abs_module_count = required_parallel_modules(
        m_dot_oa_abs,
        m_dot_sol_abs_cmd,
        config.abs_module_air_min_kg_s,
        config.abs_module_air_max_kg_s,
        config.abs_module_solution_min_kg_s,
        config.abs_module_solution_max_kg_s,
        "흡수기",
    )
    reg_module_count = required_parallel_modules(
        m_dot_oa_reg,
        m_dot_sol_reg_design,
        config.reg_module_air_min_kg_s,
        config.reg_module_air_max_kg_s,
        config.reg_module_solution_min_kg_s,
        config.reg_module_solution_max_kg_s,
        "재생기",
    )
    m_dot_sol_abs_cmd = bounded_solution_flow(
        m_dot_sol_abs_cmd,
        abs_module_count,
        config.abs_module_solution_min_kg_s,
        config.abs_module_solution_max_kg_s,
    )
    m_dot_sol_reg_design = bounded_solution_flow(
        m_dot_sol_reg_design,
        reg_module_count,
        config.reg_module_solution_min_kg_s,
        config.reg_module_solution_max_kg_s,
    )
    lg_ratio_abs_actual = m_dot_sol_abs_cmd / m_dot_oa_abs
    lg_ratio_reg_actual = m_dot_sol_reg_design / m_dot_oa_reg
    a_outlet = np.pi * config.d_outlet_m**2 / 4
    v_outlet = (config.sa_abs_m3h / 3600) / a_outlet

    solution_tank_mass_kg = max(
        config.m_solution_tank_init_kg,
        m_dot_sol_abs_cmd * config.solution_tank_residence_time_s,
    )
    solution_tank_ua_w_k = config.ua_solution_tank_w_k * (
        solution_tank_mass_kg / config.m_solution_tank_init_kg
    ) ** (2 / 3)
    state_sol_m_salt = solution_tank_mass_kg * config.xi_tank_init
    state_sol_m_water = solution_tank_mass_kg * (1 - config.xi_tank_init)
    state_sol_t = config.t_solution_tank_init_c
    state_tes_m = config.rho_w_kg_m3 * config.v_tes_l / 1000
    state_tes_t = config.t_tes_init_c

    rows = []
    for k, row in weather.iterrows():
        ta = float(row.Ta_degC)
        rh = float(row.RH_pct)
        w_oa = humidity_ratio_from_trh(ta, rh, config.p_atm_kpa)
        h_oa = moist_air_enthalpy(ta, w_oa)
        dt_s = float(row.dt_s)
        dt_h = float(row.dt_h)
        n_sub = max(1, round(dt_s / config.dt_internal_s))
        dt_sub_s = dt_s / n_sub
        dt_sub_h = dt_sub_s / 3600

        m_sol_start = state_sol_m_salt + state_sol_m_water
        xi_start = state_sol_m_salt / m_sol_start
        t_sol_start = state_sol_t
        t_tes_start = state_tes_t
        tes_avail_start = state_tes_m * config.cp_w_j_kgk * max(state_tes_t - config.t_tes_min_c, 0) / 3600 / 1000
        schedule_on = is_operation_hour(row.time, config)
        accepted_upper_w_kgkg = (
            config.target_supply_w_g_kg + config.target_humidity_tolerance_g_kg
        ) / 1000
        ld_needed_hour = schedule_on and w_oa > accepted_upper_w_kgkg
        target_moisture_removal_kg_h = (
            m_dot_oa_abs * max(w_oa - config.target_supply_w_g_kg / 1000, 0) * 3600
            if schedule_on
            else 0.0
        )
        acceptable_min_moisture_removal_kg_h = (
            m_dot_oa_abs * max(w_oa - accepted_upper_w_kgkg, 0) * 3600
            if schedule_on
            else 0.0
        )
        acc = {
            "abs_water": 0.0,
            "des_water": 0.0,
            "abs_cooling_kWh": 0.0,
            "reg_need_kWh": 0.0,
            "tes_kWh": 0.0,
            "aux_kWh": 0.0,
            "latent_kWh": 0.0,
            "reg_mdot_time": 0.0,
            "reg_air_mdot_time": 0.0,
            "reg_module_time": 0.0,
            "reg_temp_time": 0.0,
            "reg_active_time": 0.0,
            "abs_lg_time": 0.0,
            "abs_active_time": 0.0,
            "incident_kWh": 0.0,
            "absorbed_kWh": 0.0,
            "collector_kWh": 0.0,
            "tes_loss_kWh": 0.0,
            "tes_dump_kWh": 0.0,
            "tes_net_kWh": 0.0,
            "res_tes_kWh": 0.0,
            "res_sol_kJ": 0.0,
        }
        last_abs = empty_absorber_result()
        last_reg = empty_regenerator_result()
        hour_abs_on = False
        hour_reg_on = False
        hour_aux_on = False
        regen_reason = ""

        for _ in range(n_sub):
            m_salt_0 = state_sol_m_salt
            m_water_0 = state_sol_m_water
            m_sol_0 = m_salt_0 + m_water_0
            xi_0 = m_salt_0 / m_sol_0
            t_sol_0 = state_sol_t
            h_sol_0 = solution_enthalpy(xi_0, t_sol_0)
            u_sol_0 = m_sol_0 * h_sol_0
            t_tes_0 = state_tes_t

            qu_w_m2, s_abs_w_m2, _eta = collector_output_w_m2(collector, float(row.GT_COLLECTOR_W_m2), t_tes_0, ta)
            qcollector_w = collector.area_m2 * qu_w_m2
            qincident_w = collector.area_m2 * float(row.GT_COLLECTOR_W_m2)
            qabsorbed_w = collector.area_m2 * s_abs_w_m2
            qloss_tes_w = config.ua_tes_w_k * (t_tes_0 - ta)

            abs_on = ld_needed_hour and (xi_0 >= config.xi_abs_stop)
            regen_by_solar = (xi_0 < config.xi_regen_on) and (
                (qcollector_w > 50) or (t_tes_0 > config.t_tes_min_c + 1)
            )
            # In the phase-1 ideal-TES model, request regeneration as soon as
            # concentration leaves the normal band. Waiting for the deeper
            # emergency threshold causes peak-season dehumidification loss.
            regen_by_aux = xi_0 < config.xi_target
            reg_on_request = regen_by_solar or regen_by_aux

            abs_ret_m, abs_ret_xi, abs_ret_h = 0.0, xi_0, h_sol_0
            reg_ret_m, reg_ret_xi, reg_ret_h = 0.0, xi_0, h_sol_0
            m_abs_in = 0.0
            m_reg_in = 0.0
            m_reg_air_active = 0.0
            reg_active_modules = 0
            reg_solution_t_controlled = config.t_reg_in_target_c
            qreg_need_w = 0.0
            qtes_to_reg_w = 0.0
            qaux_w = 0.0

            if abs_on:
                m_abs_in = m_dot_sol_abs_cmd
                abs_res = controlled_parallel_absorber_block(
                    ta,
                    rh,
                    w_oa,
                    h_oa,
                    config.p_atm_kpa,
                    m_dot_oa_abs,
                    m_abs_in,
                    abs_module_count,
                    config.t_abs_in_target_c,
                    xi_0,
                    config.eff_enthalpy,
                    config.target_supply_w_g_kg / 1000,
                    config.abs_temp_auto_control,
                    auto_lg_control=config.lg_auto_control,
                    lg_ratio_min=config.lg_ratio_min,
                    lg_ratio_max=config.lg_ratio_max,
                )
                abs_solution_t_controlled = abs_res["ABS_SOL_IN_T_CONTROLLED_degC"]
                m_abs_in = abs_res["ABS_SOL_IN_mdot_kg_s"]
                h_abs_in = solution_enthalpy(xi_0, abs_solution_t_controlled)
                qcool_abs_w = m_abs_in * max(h_sol_0 - h_abs_in, 0) * 1000
                abs_ret_m, abs_ret_xi, abs_ret_h = abs_res["m_sol_out"], abs_res["xi_out"], abs_res["h_sol_out"]
                acc["abs_water"] += abs_res["m_water_absorb"] * dt_sub_s
                acc["abs_cooling_kWh"] += qcool_abs_w * dt_sub_h / 1000
                acc["abs_lg_time"] += abs_res["ABS_LG_CONTROLLED"] * dt_sub_s
                acc["abs_active_time"] += dt_sub_s
                last_abs = abs_res
                hour_abs_on = True

            if reg_on_request:
                if config.reg_temp_auto_control:
                    concentration_deficit = max(config.xi_target - xi_0, 0.0)
                    control_band = max(config.xi_target - config.xi_regen_on, 1e-9)
                    control_fraction = float(np.clip(concentration_deficit / control_band, 0.0, 1.0))
                    reg_solution_t_controlled = (
                        config.reg_temp_min_c
                        + control_fraction * (config.reg_temp_max_c - config.reg_temp_min_c)
                    )
                else:
                    reg_solution_t_controlled = float(np.clip(
                        config.t_reg_in_target_c,
                        config.reg_temp_min_c,
                        config.reg_temp_max_c,
                    ))
                cp_reg = cp_licl_solution_kjkgk(xi_0, (t_sol_0 + reg_solution_t_controlled) / 2)
                m_water_at_target = m_salt_0 * (1 / config.xi_target - 1)
                water_removable_to_target = max(m_water_0 - m_water_at_target, 0)
                if abs_on:
                    water_removable_to_target += last_abs["m_water_absorb"] * dt_sub_s
                m_desorb_cap_kg_s = water_removable_to_target / dt_sub_s

                qtes_energy_limit_w = qcollector_w - qloss_tes_w
                qtes_energy_limit_w += state_tes_m * config.cp_w_j_kgk * max(t_tes_0 - config.t_tes_min_c, 0) / dt_sub_s
                qtes_energy_limit_w = max(qtes_energy_limit_w, 0)
                dt_reg_est = max(reg_solution_t_controlled - t_sol_0, 0)
                t_after_tes_limit = t_sol_0 + config.eps_tes_reg_hx * max(t_tes_0 - t_sol_0, 0)
                t_after_tes_limit = min(t_after_tes_limit, reg_solution_t_controlled)
                m_reg_heat_limit = (
                    m_dot_sol_reg_design
                    if dt_reg_est <= 1e-9
                    else qtes_energy_limit_w / (cp_reg * 1000 * dt_reg_est)
                )
                if config.reg_flow_control_by_tes and not regen_by_aux:
                    if t_after_tes_limit < reg_solution_t_controlled - 1e-9:
                        m_reg_in = 0.0
                    else:
                        m_reg_in = min(m_dot_sol_reg_design, m_reg_heat_limit)
                else:
                    m_reg_in = m_dot_sol_reg_design
                m_reg_in, m_reg_air_active, reg_active_modules = staged_regenerator_flow(
                    m_reg_in,
                    lg_ratio_reg_actual,
                    reg_module_count,
                    config,
                )
                qreg_need_est_w = m_reg_in * cp_reg * 1000 * dt_reg_est
                qtes_temp_limit_est_w = m_reg_in * cp_reg * 1000 * max(t_after_tes_limit - t_sol_0, 0)
                qtes_possible_est_w = min(qreg_need_est_w, qtes_energy_limit_w, qtes_temp_limit_est_w)
                if (m_desorb_cap_kg_s <= 1e-10) or (m_reg_in <= 1e-10):
                    reg_on_request = False
                    m_reg_in = 0.0
                elif regen_by_aux:
                    qreg_need_w = qreg_need_est_w
                elif qtes_possible_est_w >= qreg_need_est_w - 1e-9:
                    qreg_need_w = qreg_need_est_w
                else:
                    reg_on_request = False
                    m_reg_in = 0.0

            if reg_on_request:
                reg_res = parallel_regenerator_block(
                    ta,
                    rh,
                    w_oa,
                    h_oa,
                    config.p_atm_kpa,
                    m_reg_air_active,
                    m_reg_in,
                    reg_active_modules,
                    reg_solution_t_controlled,
                    xi_0,
                    np.nan,
                    config.eff_enthalpy,
                )
                if reg_res["m_water_desorb"] > m_desorb_cap_kg_s:
                    reg_res = parallel_regenerator_block(
                        ta,
                        rh,
                        w_oa,
                        h_oa,
                        config.p_atm_kpa,
                        m_reg_air_active,
                        m_reg_in,
                        reg_active_modules,
                        reg_solution_t_controlled,
                        xi_0,
                        m_desorb_cap_kg_s / 1.2,
                        config.eff_enthalpy,
                    )
                cp_reg_actual = cp_licl_solution_kjkgk(xi_0, (t_sol_0 + reg_solution_t_controlled) / 2)
                qreg_need_w = m_reg_in * cp_reg_actual * 1000 * max(reg_solution_t_controlled - t_sol_0, 0)
                t_after_tes_actual = t_sol_0 + config.eps_tes_reg_hx * max(t_tes_0 - t_sol_0, 0)
                t_after_tes_actual = min(t_after_tes_actual, reg_solution_t_controlled)
                qtes_temp_limit_w = m_reg_in * cp_reg_actual * 1000 * max(t_after_tes_actual - t_sol_0, 0)
                qtes_possible_w = min(qreg_need_w, qtes_energy_limit_w, qtes_temp_limit_w)
                if regen_by_aux:
                    qtes_to_reg_w = qtes_possible_w
                    qaux_w = max(qreg_need_w - qtes_to_reg_w, 0)
                elif qtes_possible_w >= qreg_need_w - 1e-9:
                    qtes_to_reg_w = qreg_need_w
                    qaux_w = 0.0
                else:
                    reg_on_request = False
                    m_reg_in = 0.0
                    qreg_need_w = qtes_to_reg_w = qaux_w = 0.0

            if reg_on_request:
                reg_ret_m, reg_ret_xi, reg_ret_h = reg_res["m_sol_out"], reg_res["xi_out"], reg_res["h_sol_out"]
                qlatent_w = reg_res["m_water_desorb"] * latent_heat_vaporization_water_kjkg(reg_solution_t_controlled) * 1000
                acc["des_water"] += reg_res["m_water_desorb"] * dt_sub_s
                acc["reg_need_kWh"] += qreg_need_w * dt_sub_h / 1000
                acc["tes_kWh"] += qtes_to_reg_w * dt_sub_h / 1000
                acc["aux_kWh"] += qaux_w * dt_sub_h / 1000
                acc["latent_kWh"] += qlatent_w * dt_sub_h / 1000
                acc["reg_mdot_time"] += m_reg_in * dt_sub_s
                acc["reg_air_mdot_time"] += m_reg_air_active * dt_sub_s
                acc["reg_module_time"] += reg_active_modules * dt_sub_s
                acc["reg_temp_time"] += reg_solution_t_controlled * dt_sub_s
                acc["reg_active_time"] += dt_sub_s
                last_reg = reg_res
                hour_reg_on = True
                hour_aux_on = hour_aux_on or (qaux_w > 1e-6)
                regen_reason = "LD_need_low_xi_aux" if regen_by_aux else (regen_reason or "solar_TES_concentration_recovery")

            m_salt_in = abs_ret_m * abs_ret_xi + reg_ret_m * reg_ret_xi
            m_water_in = abs_ret_m * (1 - abs_ret_xi) + reg_ret_m * (1 - reg_ret_xi)
            m_salt_out = (m_abs_in + m_reg_in) * xi_0
            m_water_out = (m_abs_in + m_reg_in) * (1 - xi_0)
            m_salt_next = max(m_salt_0 + (m_salt_in - m_salt_out) * dt_sub_s, 1e-9)
            m_water_next = max(m_water_0 + (m_water_in - m_water_out) * dt_sub_s, 1e-9)
            u_expected = u_sol_0 + (abs_ret_m * abs_ret_h + reg_ret_m * reg_ret_h - (m_abs_in + m_reg_in) * h_sol_0) * dt_sub_s
            qloss_sol_kj = solution_tank_ua_w_k * max(t_sol_0 - ta, 0) * dt_sub_s / 1000
            m_sol_next = m_salt_next + m_water_next
            xi_next = m_salt_next / m_sol_next
            h_next = (u_expected - qloss_sol_kj) / m_sol_next
            t_sol_next = solution_temperature_from_h(h_next, xi_next)
            state_sol_m_salt, state_sol_m_water, state_sol_t = m_salt_next, m_water_next, t_sol_next
            acc["res_sol_kJ"] += m_sol_next * solution_enthalpy(xi_next, t_sol_next) - (u_expected - qloss_sol_kj)

            qnet_tes_w = qcollector_w - qtes_to_reg_w - qloss_tes_w
            t_tes_raw = t_tes_0 + qnet_tes_w * dt_sub_s / (state_tes_m * config.cp_w_j_kgk)
            qdump_kwh_sub = 0.0
            if t_tes_raw > config.t_tes_max_c:
                t_tes_next = config.t_tes_max_c
                qdump_kwh_sub = state_tes_m * config.cp_w_j_kgk * (t_tes_raw - config.t_tes_max_c) / 3600 / 1000
            else:
                t_tes_next = t_tes_raw
            du_tes_kwh = state_tes_m * config.cp_w_j_kgk * (t_tes_next - t_tes_0) / 3600 / 1000
            qcollector_kwh = qcollector_w * dt_sub_h / 1000
            qloss_tes_kwh = qloss_tes_w * dt_sub_h / 1000
            qtes_kwh = qtes_to_reg_w * dt_sub_h / 1000
            res_tes_kwh = du_tes_kwh - (qcollector_kwh - qtes_kwh - qloss_tes_kwh - qdump_kwh_sub)
            state_tes_t = t_tes_next
            acc["collector_kWh"] += qcollector_kwh
            acc["tes_loss_kWh"] += qloss_tes_kwh
            acc["tes_dump_kWh"] += qdump_kwh_sub
            acc["tes_net_kWh"] += du_tes_kwh
            acc["res_tes_kWh"] += res_tes_kwh
            acc["incident_kWh"] += qincident_w * dt_sub_h / 1000
            acc["absorbed_kWh"] += qabsorbed_w * dt_sub_h / 1000

        supply_t = ta
        supply_rh = rh
        supply_w = w_oa
        supply_h = h_oa
        if hour_abs_on:
            supply_t = last_abs["T_air_out"]
            # Use the water removed over every internal substep, not only the
            # final substep outlet, for the hourly delivered humidity.
            hourly_water_removed_kg_s = acc["abs_water"] / max(dt_s, 1e-9)
            supply_w = max(w_oa - hourly_water_removed_kg_s / max(m_dot_oa_abs, 1e-9), 0.0)
            supply_rh = rh_from_tw(supply_t, supply_w, config.p_atm_kpa)
            supply_h = moist_air_enthalpy(supply_t, supply_w)

        m_sol_end = state_sol_m_salt + state_sol_m_water
        rows.append(
            {
                "step": k + 1,
                "time": row.time,
                "dt_h": dt_h,
                "Ta_degC": ta,
                "RH_pct": rh,
                "GHI_Wh_m2": row.GHI_Wh_m2,
                "DNI_Wh_m2": row.DNI_Wh_m2,
                "DHI_Wh_m2": row.DHI_Wh_m2,
                "IT_COLLECTOR_Wh_m2": row.IT_COLLECTOR_Wh_m2,
                "GT_COLLECTOR_W_m2": row.GT_COLLECTOR_W_m2,
                "mode": 1 if hour_abs_on else (2 if hour_reg_on else 3),
                "ABS_ON": hour_abs_on,
                "REG_ON": hour_reg_on,
                "AUX_ON": hour_aux_on,
                "LD_NEED": ld_needed_hour,
                "SCHEDULE_ON": schedule_on,
                "REGEN_REASON": regen_reason,
                "OA_w_kgkg": w_oa,
                "OA_h_kJkg": h_oa,
                "ABS_AIR_IN_m3_h": config.sa_abs_m3h,
                "ABS_MODULE_COUNT": abs_module_count,
                "ABS_MODULE_AIR_mdot_kg_s": m_dot_oa_abs / abs_module_count,
                "ABS_MODULE_SOL_mdot_kg_s": m_dot_sol_abs_cmd / abs_module_count,
                "TANK_T_START_degC": t_sol_start,
                "TANK_xi_START": xi_start,
                "TANK_T_NEXT_degC": state_sol_t,
                "TANK_xi_NEXT": state_sol_m_salt / m_sol_end,
                "TANK_Msol_NEXT_kg": m_sol_end,
                "ABS_WATER_ABSORB_kg_h": acc["abs_water"] / dt_s * 3600,
                "TARGET_MOISTURE_REMOVAL_kg_h": target_moisture_removal_kg_h,
                "ACCEPTABLE_MIN_MOISTURE_REMOVAL_kg_h": acceptable_min_moisture_removal_kg_h,
                "REG_WATER_DESORB_kg_h": acc["des_water"] / dt_s * 3600,
                "WATER_GAP_kg_h": (acc["abs_water"] - acc["des_water"]) / dt_s * 3600,
                "ABS_AIR_OUT_T_degC": last_abs["T_air_out"],
                "ABS_AIR_OUT_w_kgkg": supply_w,
                "ABS_AIR_OUT_h_kJkg": moist_air_enthalpy(last_abs["T_air_out"], supply_w),
                "ABS_AIR_OUT_RH_pct": rh_from_tw(last_abs["T_air_out"], supply_w, config.p_atm_kpa),
                "ABS_DELTA_w_g_kg": (w_oa - supply_w) * 1000,
                "ABS_PROCESS_AIR_FRACTION": last_abs.get("process_air_fraction", 0.0),
                "ABS_SOL_IN_T_CONTROLLED_degC": last_abs.get("ABS_SOL_IN_T_CONTROLLED_degC", np.nan),
                "ABS_TEMP_CONTROL_ACTIVE": last_abs.get("ABS_TEMP_CONTROL_ACTIVE", False),
                "ABS_LG_CONTROL_ACTIVE": last_abs.get("ABS_LG_CONTROL_ACTIVE", False),
                "ABS_LG_CONTROLLED": safe_div(acc["abs_lg_time"], acc["abs_active_time"]),
                "ABS_AIR_OUT_m3_h": dry_air_volume_flow_m3h(m_dot_oa_abs, last_abs["T_air_out"], last_abs["w_air_out"], config.p_atm_kpa),
                "ABS_SOL_OUT_T_degC": last_abs["T_sol_out"],
                "ABS_SOL_OUT_xi": last_abs["xi_out"],
                "REG_SOL_OUT_T_degC": last_reg["T_sol_out"],
                "REG_SOL_OUT_xi": last_reg["xi_out"],
                "REG_SOL_IN_mdot_kg_s": acc["reg_mdot_time"] / dt_s,
                "REG_AIR_IN_mdot_kg_s": acc["reg_air_mdot_time"] / dt_s,
                "REG_ACTIVE_MODULE_COUNT": acc["reg_module_time"] / dt_s,
                "REG_SOL_IN_T_CONTROLLED_degC": safe_div(
                    acc["reg_temp_time"], acc["reg_active_time"]
                ) if acc["reg_active_time"] > 0 else np.nan,
                "REG_SOL_IN_LG": safe_div(acc["reg_mdot_time"], acc["reg_air_mdot_time"]),
                "REG_AIR_OUT_T_degC": last_reg["T_air_out"],
                "REG_AIR_OUT_w_kgkg": last_reg["w_air_out"],
                "SUPPLY_AIR_T_degC": supply_t,
                "SUPPLY_AIR_RH_pct": supply_rh,
                "SUPPLY_AIR_w_kgkg": supply_w,
                "SUPPLY_AIR_h_kJkg": supply_h,
                "ABS_SOLUTION_COOLING_kWh": acc["abs_cooling_kWh"],
                "REG_HX_HEAT_NEED_kWh": acc["reg_need_kWh"],
                "REG_HX_HEAT_FROM_TES_kWh": acc["tes_kWh"],
                "REG_HX_HEAT_FROM_AUX_kWh": acc["aux_kWh"],
                "REG_LATENT_LOAD_kWh": acc["latent_kWh"],
                "COLLECTOR_INCIDENT_TOTAL_kWh": acc["incident_kWh"],
                "COLLECTOR_ABSORBED_TOTAL_kWh": acc["absorbed_kWh"],
                "COLLECTOR_QU_TOTAL_kWh": acc["collector_kWh"],
                "COLLECTOR_EFF_INCIDENT": safe_div(acc["collector_kWh"], acc["incident_kWh"]),
                "COLLECTOR_EFF_ABSORBED": safe_div(acc["collector_kWh"], acc["absorbed_kWh"]),
                "TES_LOSS_kWh": acc["tes_loss_kWh"],
                "TES_DUMP_kWh": acc["tes_dump_kWh"],
                "TES_T_START_degC": t_tes_start,
                "TES_T_NEXT_degC": state_tes_t,
                "TES_AVAILABLE_START_kWh": tes_avail_start,
                "TES_AVAILABLE_NEXT_kWh": state_tes_m * config.cp_w_j_kgk * max(state_tes_t - config.t_tes_min_c, 0) / 3600 / 1000,
                "TES_ENERGY_IN_COLLECTOR_kWh": acc["collector_kWh"],
                "TES_ENERGY_OUT_REGEN_kWh": acc["tes_kWh"],
                "TES_ENERGY_OUT_LOSS_kWh": acc["tes_loss_kWh"],
                "TES_ENERGY_DUMP_kWh": acc["tes_dump_kWh"],
                "TES_NET_kWh": acc["tes_net_kWh"],
                "RES_TES_kWh": acc["res_tes_kWh"],
                "RES_SOLTANK_kJ": acc["res_sol_kJ"],
            }
        )

    result = pd.DataFrame(rows)
    summary = build_summary(
        result,
        config,
        collector,
        m_dot_oa_abs,
        m_dot_oa_reg,
        m_dot_sol_abs_cmd,
        m_dot_sol_reg_design,
        abs_module_count,
        reg_module_count,
        a_outlet,
        v_outlet,
    )
    return result, summary


def build_summary(
    result,
    config,
    collector,
    m_dot_oa_abs,
    m_dot_oa_reg,
    m_dot_sol_abs_cmd,
    m_dot_sol_reg_design,
    abs_module_count,
    reg_module_count,
    a_outlet,
    v_outlet,
):
    abs_on = result["ABS_ON"].astype(bool)
    reg_on = result["REG_ON"].astype(bool)
    summary = {
        "collector_type": collector.collector_type,
        "SA_abs_m3h": config.sa_abs_m3h,
        "SA_abs_m3s": config.sa_abs_m3h / 3600,
        "m_dot_oa_abs_kg_s": m_dot_oa_abs,
        "ABS_module_count": abs_module_count,
        "ABS_module_air_kg_s": m_dot_oa_abs / abs_module_count,
        "ABS_module_solution_kg_s": m_dot_sol_abs_cmd / abs_module_count,
        "LG_ratio_abs": m_dot_sol_abs_cmd / m_dot_oa_abs,
        "LG_control_mode": "auto" if config.lg_auto_control else "fixed",
        "LG_control_mean": result.loc[abs_on, "ABS_LG_CONTROLLED"].mean(),
        "LG_control_min": result.loc[abs_on, "ABS_LG_CONTROLLED"].min(),
        "LG_control_max": result.loc[abs_on, "ABS_LG_CONTROLLED"].max(),
        "SA_reg_factor": config.sa_reg_factor,
        "SA_reg_m3h": config.sa_abs_m3h * config.sa_reg_factor,
        "LG_ratio_reg_design": m_dot_sol_reg_design / m_dot_oa_reg,
        "REG_module_count": reg_module_count,
        "REG_module_air_design_kg_s": m_dot_oa_reg / reg_module_count,
        "REG_module_solution_design_kg_s": m_dot_sol_reg_design / reg_module_count,
        "REG_active_modules_mean": result.loc[reg_on, "REG_ACTIVE_MODULE_COUNT"].mean(),
        "REG_mdot_actual_mean_kg_s": result.loc[reg_on, "REG_SOL_IN_mdot_kg_s"].mean(),
        "REG_LG_actual_mean": result.loc[reg_on, "REG_SOL_IN_LG"].mean(),
        "D_outlet_m": config.d_outlet_m,
        "A_outlet_m2": a_outlet,
        "v_outlet_m_s": v_outlet,
        "fan_static_pressure_design_Pa": config.fan_static_pressure_design_pa,
        "T_abs_in_target": config.t_abs_in_target_c,
        "T_reg_in_target": config.t_reg_in_target_c,
        "REG_temperature_mode": "auto" if config.reg_temp_auto_control else "fixed",
        "REG_solution_in_control_mean_degC": result.loc[reg_on, "REG_SOL_IN_T_CONTROLLED_degC"].mean(),
        "REG_solution_in_control_min_degC": result.loc[reg_on, "REG_SOL_IN_T_CONTROLLED_degC"].min(),
        "REG_solution_in_control_max_degC": result.loc[reg_on, "REG_SOL_IN_T_CONTROLLED_degC"].max(),
        "T_sol_tank_init": config.t_solution_tank_init_c,
        "xi_tank_init": config.xi_tank_init,
        "xi_regen_on": config.xi_regen_on,
        "xi_aux_on": config.xi_aux_on,
        "xi_abs_stop": config.xi_abs_stop,
        "ABS_ON_hours": int(abs_on.sum()),
        "REG_ON_hours": int(reg_on.sum()),
        "AUX_ON_hours": int(result["AUX_ON"].sum()),
        "ABSORB_total_kg": (result["ABS_WATER_ABSORB_kg_h"] * result["dt_h"]).sum(skipna=True),
        "DESORB_total_kg": (result["REG_WATER_DESORB_kg_h"] * result["dt_h"]).sum(skipna=True),
        "min_tank_xi": result["TANK_xi_NEXT"].min(skipna=True),
        "end_tank_xi": result["TANK_xi_NEXT"].iloc[-1],
        "COLLECTOR_INCIDENT_total_kWh": result["COLLECTOR_INCIDENT_TOTAL_kWh"].sum(skipna=True),
        "COLLECTOR_ABSORBED_total_kWh": result["COLLECTOR_ABSORBED_TOTAL_kWh"].sum(skipna=True),
        "collector_total_kWh": result["COLLECTOR_QU_TOTAL_kWh"].sum(skipna=True),
        "collector_eff_incident_annual": safe_div(result["COLLECTOR_QU_TOTAL_kWh"].sum(skipna=True), result["COLLECTOR_INCIDENT_TOTAL_kWh"].sum(skipna=True)),
        "time_start": result["time"].min(),
        "time_end": result["time"].max(),
        "n_hours": len(result),
        "operation_hours_per_day": config.operation_hours_per_day,
        "scheduled_hours": int(result["SCHEDULE_ON"].sum()),
        "REG_HX_NEED_total_kWh": result["REG_HX_HEAT_NEED_kWh"].sum(skipna=True),
        "TES_TO_REG_total_kWh": result["REG_HX_HEAT_FROM_TES_kWh"].sum(skipna=True),
        "AUX_TO_REG_total_kWh": result["REG_HX_HEAT_FROM_AUX_kWh"].sum(skipna=True),
        "max_abs_RES_TES_kWh": result["RES_TES_kWh"].abs().max(skipna=True),
        "max_abs_RES_SOLTANK_kJ": result["RES_SOLTANK_kJ"].abs().max(skipna=True),
        "ABSORB_mean_kg_h_when_on": result.loc[abs_on, "ABS_WATER_ABSORB_kg_h"].mean(),
        "ABS_mean_delta_w_g_kg_when_on": result.loc[abs_on, "ABS_DELTA_w_g_kg"].mean(),
        "ABS_air_out_mean_m3h_when_on": result.loc[abs_on, "ABS_AIR_OUT_m3_h"].mean(),
        "ABS_air_out_mean_T_degC_when_on": result.loc[abs_on, "ABS_AIR_OUT_T_degC"].mean(),
        "ABS_air_out_mean_RH_pct_when_on": result.loc[abs_on, "ABS_AIR_OUT_RH_pct"].mean(),
        "ABS_solution_in_control_mean_degC": result.loc[abs_on, "ABS_SOL_IN_T_CONTROLLED_degC"].mean(),
        "ABS_solution_in_control_min_degC": result.loc[abs_on, "ABS_SOL_IN_T_CONTROLLED_degC"].min(),
        "ABS_solution_in_control_max_degC": result.loc[abs_on, "ABS_SOL_IN_T_CONTROLLED_degC"].max(),
        "ABS_bypass_hours": int((abs_on & (result["ABS_PROCESS_AIR_FRACTION"] < 1 - 1e-9)).sum()),
        "SUPPLY_mean_T_LD_degC": result.loc[abs_on, "SUPPLY_AIR_T_degC"].mean(),
        "SUPPLY_mean_RH_LD_pct": result.loc[abs_on, "SUPPLY_AIR_RH_pct"].mean(),
        "TARGET_HUMIDITY_UNMET_hours": (
            result.loc[
                abs_on
                & (
                    result["SUPPLY_AIR_w_kgkg"] * 1000
                    > config.target_supply_w_g_kg + config.target_humidity_tolerance_g_kg + 1e-9
                ),
                "dt_h",
            ].sum()
        ),
    }
    return pd.DataFrame([summary])


def write_outputs(result: pd.DataFrame, summary: pd.DataFrame, outfile: str | Path) -> None:
    outfile = Path(outfile)
    outfile.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(outfile) as writer:
        result.to_excel(writer, sheet_name="01_MAIN_DEBUG", index=False)
        summary.to_excel(writer, sheet_name="99_SUMMARY", index=False)
