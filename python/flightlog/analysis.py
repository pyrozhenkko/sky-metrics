from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from flightlog.config import CLEAN_EXPORT_MSG_TYPES
from flightlog.dataflash import collect_export_sources

_EARTH_R_M = 6_371_000.0
_WGS84_A = 6_378_137.0
_WGS84_F = 1.0 / 298.257223563
_WGS84_E2 = 2.0 * _WGS84_F - _WGS84_F * _WGS84_F
_G_NED = np.array([0.0, 0.0, 9.81])


def _haversine_m(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    r1 = math.radians(lat1)
    r2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    s = (
        math.sin(dphi / 2) ** 2
        + math.cos(r1) * math.cos(r2) * math.sin(dl / 2) ** 2
    )
    return 2 * _EARTH_R_M * math.asin(min(1.0, math.sqrt(s)))


def _geodetic_to_ecef(
    lat_deg: np.ndarray,
    lon_deg: np.ndarray,
    h_m: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    lat = np.radians(lat_deg.astype(np.float64))
    lon = np.radians(lon_deg.astype(np.float64))
    h = h_m.astype(np.float64)
    sin_lat = np.sin(lat)
    cos_lat = np.cos(lat)
    sin_lon = np.sin(lon)
    cos_lon = np.cos(lon)
    n = _WGS84_A / np.sqrt(1.0 - _WGS84_E2 * sin_lat * sin_lat)
    x = (n + h) * cos_lat * cos_lon
    y = (n + h) * cos_lat * sin_lon
    z = (n * (1.0 - _WGS84_E2) + h) * sin_lat
    return x, y, z


def _geodetic_to_ecef_scalar(
    lat_deg: float, lon_deg: float, h_m: float
) -> tuple[float, float, float]:
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    sin_lat = math.sin(lat)
    cos_lat = math.cos(lat)
    sin_lon = math.sin(lon)
    cos_lon = math.cos(lon)
    n = _WGS84_A / math.sqrt(1.0 - _WGS84_E2 * sin_lat * sin_lat)
    x = (n + h_m) * cos_lat * cos_lon
    y = (n + h_m) * cos_lat * sin_lon
    z = (n * (1.0 - _WGS84_E2) + h_m) * sin_lat
    return x, y, z


def _enu_from_wgs84(
    lat0_deg: float,
    lon0_deg: float,
    alt0_m: float,
    lat_deg: np.ndarray,
    lon_deg: np.ndarray,
    alt_m: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    lat0 = math.radians(lat0_deg)
    lon0 = math.radians(lon0_deg)
    sin_lat0 = math.sin(lat0)
    cos_lat0 = math.cos(lat0)
    sin_lon0 = math.sin(lon0)
    cos_lon0 = math.cos(lon0)
    x0, y0, z0 = _geodetic_to_ecef_scalar(lat0_deg, lon0_deg, alt0_m)
    x, y, z = _geodetic_to_ecef(lat_deg, lon_deg, alt_m)
    dx = x - x0
    dy = y - y0
    dz = z - z0
    east = -sin_lon0 * dx + cos_lon0 * dy
    north = -sin_lat0 * cos_lon0 * dx - sin_lat0 * sin_lon0 * dy + cos_lat0 * dz
    up = cos_lat0 * cos_lon0 * dx + cos_lat0 * sin_lon0 * dy + sin_lat0 * dz
    return east, north, up


def _rot_body_to_ned(r_deg: float, p_deg: float, y_deg: float) -> np.ndarray:
    r, p, y = map(math.radians, (r_deg, p_deg, y_deg))
    cr, sr = math.cos(r), math.sin(r)
    cp, sp = math.cos(p), math.sin(p)
    cy, sy = math.cos(y), math.sin(y)
    return np.array(
        [
            [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
            [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
            [-sp, cp * sr, cp * cr],
        ],
        dtype=np.float64,
    )


def _median_dt_s(time_us: np.ndarray) -> float | None:
    if time_us.size < 2:
        return None
    t = np.sort(time_us.astype(np.float64)) * 1e-6
    d = np.diff(t)
    d = d[d > 0]
    if d.size == 0:
        return None
    return float(np.median(d))


def _json_clean(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _json_clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_clean(v) for v in obj]
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, (np.floating,)):
        x = float(obj)
        if math.isnan(x) or math.isinf(x):
            return None
        return x
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, np.ndarray):
        return _json_clean(obj.tolist())
    return obj


def build_mission_json(bin_path: Path) -> dict[str, Any]:
    by_type, df_fmt = collect_export_sources(
        bin_path, msg_types=CLEAN_EXPORT_MSG_TYPES
    )
    msg_counts = {k: int(len(v)) for k, v in sorted(by_type.items())}

    ver_fw = None
    if "VER" in by_type and not by_type["VER"].empty:
        row = by_type["VER"].iloc[0]
        ver_fw = row.get("FWS")
        if pd.isna(ver_fw):
            ver_fw = None
        elif not isinstance(ver_fw, str):
            ver_fw = str(ver_fw)

    msg_snippets: list[str] = []
    if "MSG" in by_type and not by_type["MSG"].empty:
        col = by_type["MSG"]["Message"]
        for v in col.tail(15).tolist():
            if isinstance(v, str):
                msg_snippets.append(v)
            elif v is not None and not (isinstance(v, float) and math.isnan(v)):
                msg_snippets.append(str(v))

    gps = by_type.get("GPS")
    att = by_type.get("ATT")
    imu = by_type.get("IMU")

    metrics: dict[str, Any] = {
        "flight_duration_sec": None,
        "total_distance_m": None,
        "max_altitude_m": None,
        "altitude_gain_m": None,
        "max_horizontal_speed_m_s": None,
        "max_vertical_speed_m_s": None,
        "max_acceleration_m_s2": None,
        "max_speed_from_imu_trapz_m_s": None,
    }
    trajectory: dict[str, Any] = {
        "reference": None,
        "time_s": [],
        "lat_deg": [],
        "lon_deg": [],
        "alt_m": [],
        "x_east_m": [],
        "y_north_m": [],
        "z_up_m": [],
        "speed_horizontal_m_s": [],
    }

    anomalies: list[str] = []

    median_dt_gps_s: float | None = None
    median_dt_imu_s: float | None = None
    if gps is not None and not gps.empty:
        g = gps.copy()
        tu = pd.to_numeric(g["TimeUS"], errors="coerce").to_numpy()
        median_dt_gps_s = _median_dt_s(tu[~np.isnan(tu)])
        valid = ~np.isnan(tu)
        lat = pd.to_numeric(g["Lat"], errors="coerce").to_numpy()
        lng = pd.to_numeric(g["Lng"], errors="coerce").to_numpy()
        alt = pd.to_numeric(g["Alt"], errors="coerce").to_numpy()
        spd = pd.to_numeric(g["Spd"], errors="coerce").to_numpy()
        vz = pd.to_numeric(g["VZ"], errors="coerce").to_numpy()
        ok = valid & ~np.isnan(lat) & ~np.isnan(lng) & ~np.isnan(alt)
        tu, lat, lng, alt, spd, vz = (
            tu[ok],
            lat[ok],
            lng[ok],
            alt[ok],
            spd[ok],
            vz[ok],
        )
        if tu.size >= 2:
            t_s = tu * 1e-6
            metrics["flight_duration_sec"] = float(t_s.max() - t_s.min())
            dist = 0.0
            for i in range(1, lat.size):
                dist += _haversine_m(
                    float(lat[i - 1]),
                    float(lng[i - 1]),
                    float(lat[i]),
                    float(lng[i]),
                )
            metrics["total_distance_m"] = float(dist)
            metrics["max_altitude_m"] = float(np.nanmax(alt))
            metrics["altitude_gain_m"] = float(np.nanmax(alt) - alt[0])
            if spd.size:
                metrics["max_horizontal_speed_m_s"] = float(np.nanmax(spd))
            if vz.size:
                metrics["max_vertical_speed_m_s"] = float(
                    vz[np.nanargmax(np.abs(vz))]
                )
            lat0, lon0, alt0 = float(lat[0]), float(lng[0]), float(alt[0])
            xe, yn, zu = _enu_from_wgs84(lat0, lon0, alt0, lat, lng, alt)
            spd_plot = spd.copy()
            if np.all(np.isnan(spd_plot)):
                spd_plot = np.zeros_like(t_s)
            else:
                spd_plot = np.where(np.isnan(spd_plot), 0.0, spd_plot)
            trajectory["reference"] = {
                "lat0_deg": lat0,
                "lon0_deg": lon0,
                "alt0_m": alt0,
                "frame": "ENU",
            }
            trajectory["time_s"] = t_s.tolist()
            trajectory["lat_deg"] = lat.tolist()
            trajectory["lon_deg"] = lng.tolist()
            trajectory["alt_m"] = alt.tolist()
            trajectory["x_east_m"] = xe.tolist()
            trajectory["y_north_m"] = yn.tolist()
            trajectory["z_up_m"] = zu.tolist()
            trajectory["speed_horizontal_m_s"] = spd_plot.tolist()

    imu_acc_max = None
    if imu is not None and not imu.empty:
        im = imu.copy()
        if "I" in im.columns:
            im = im[im["I"] == im["I"].iloc[0]]
        im = im.sort_values("TimeUS")
        im_t = pd.to_numeric(im["TimeUS"], errors="coerce")
        ax = pd.to_numeric(im["AccX"], errors="coerce").to_numpy()
        ay = pd.to_numeric(im["AccY"], errors="coerce").to_numpy()
        az = pd.to_numeric(im["AccZ"], errors="coerce").to_numpy()
        ok_i = (
            ~np.isnan(im_t.to_numpy())
            & ~np.isnan(ax)
            & ~np.isnan(ay)
            & ~np.isnan(az)
        )
        im_t_np = im_t.to_numpy()[ok_i]
        median_dt_imu_s = _median_dt_s(im_t_np)
        ax, ay, az = ax[ok_i], ay[ok_i], az[ok_i]
        ab = np.stack([ax, ay, az], axis=1)
        mag = np.linalg.norm(ab, axis=1)
        if mag.size:
            imu_acc_max = float(np.nanmax(mag))
        metrics["max_acceleration_m_s2"] = imu_acc_max
    if (
        imu is not None
        and not imu.empty
        and att is not None
        and not att.empty
    ):
        im = imu.copy()
        if "I" in im.columns:
            im = im[im["I"] == im["I"].iloc[0]]
        at = att.sort_values("TimeUS")
        im = im.sort_values("TimeUS")
        at_t = pd.to_numeric(at["TimeUS"], errors="coerce")
        im_t = pd.to_numeric(im["TimeUS"], errors="coerce")
        ax = pd.to_numeric(im["AccX"], errors="coerce").to_numpy()
        ay = pd.to_numeric(im["AccY"], errors="coerce").to_numpy()
        az = pd.to_numeric(im["AccZ"], errors="coerce").to_numpy()
        ok_i = (
            ~np.isnan(im_t.to_numpy())
            & ~np.isnan(ax)
            & ~np.isnan(ay)
            & ~np.isnan(az)
        )
        im_t_np = im_t.to_numpy()[ok_i]
        ax, ay, az = ax[ok_i], ay[ok_i], az[ok_i]
        merged = pd.merge_asof(
            pd.DataFrame(
                {
                    "TimeUS": im_t_np.astype(np.float64),
                    "AccX": ax,
                    "AccY": ay,
                    "AccZ": az,
                }
            ).sort_values("TimeUS"),
            pd.DataFrame(
                {
                    "TimeUS": at_t.to_numpy(dtype=np.float64),
                    "Roll": pd.to_numeric(at["Roll"], errors="coerce"),
                    "Pitch": pd.to_numeric(at["Pitch"], errors="coerce"),
                    "Yaw": pd.to_numeric(at["Yaw"], errors="coerce"),
                }
            ).sort_values("TimeUS"),
            on="TimeUS",
            direction="nearest",
        )
        rpy_ok = (
            merged["Roll"].notna()
            & merged["Pitch"].notna()
            & merged["Yaw"].notna()
        )
        if rpy_ok.any():
            lin_n = np.zeros((len(merged), 3), dtype=np.float64)
            for i in range(len(merged)):
                if not rpy_ok.iloc[i]:
                    continue
                r = _rot_body_to_ned(
                    float(merged["Roll"].iloc[i]),
                    float(merged["Pitch"].iloc[i]),
                    float(merged["Yaw"].iloc[i]),
                )
                fb = np.array(
                    [
                        merged["AccX"].iloc[i],
                        merged["AccY"].iloc[i],
                        merged["AccZ"].iloc[i],
                    ],
                    dtype=np.float64,
                )
                lin_n[i] = r @ fb + _G_NED
            tu_m = merged["TimeUS"].to_numpy(dtype=np.float64) * 1e-6
            order = np.argsort(tu_m)
            tu_m = tu_m[order]
            lin_n = lin_n[order]
            ok_t = np.isfinite(tu_m) & (np.isfinite(lin_n).all(axis=1))
            tu_m = tu_m[ok_t]
            lin_n = lin_n[ok_t]
            if tu_m.size >= 2:
                vn = np.zeros(tu_m.size)
                ve = np.zeros(tu_m.size)
                vd = np.zeros(tu_m.size)
                for k in range(1, tu_m.size):
                    dt = tu_m[k] - tu_m[k - 1]
                    if dt <= 0:
                        continue
                    a0 = lin_n[k - 1]
                    a1 = lin_n[k]
                    vn[k] = vn[k - 1] + 0.5 * dt * (a0[0] + a1[0])
                    ve[k] = ve[k - 1] + 0.5 * dt * (a0[1] + a1[1])
                    vd[k] = vd[k - 1] + 0.5 * dt * (a0[2] + a1[2])
                sp = np.sqrt(vn * vn + ve * ve + vd * vd)
                metrics["max_speed_from_imu_trapz_m_s"] = float(np.nanmax(sp))

    mission_status = "Unknown"
    if "STAT" in by_type and not by_type["STAT"].empty:
        last = by_type["STAT"].iloc[-1]
        if last.get("Crash"):
            try:
                if int(last["Crash"]) != 0:
                    mission_status = "Crash"
            except (TypeError, ValueError):
                pass

    if imu_acc_max is not None and imu_acc_max > 40:
        anomalies.append(
            f"Високе прискорення за IMU: ~{imu_acc_max:.1f} м/с²"
        )
    anomalies.extend(msg_snippets[:5])

    fmt_summary = []
    if not df_fmt.empty:
        for _, r in df_fmt.iterrows():
            fmt_summary.append(
                {
                    "name": r.get("Name"),
                    "count": int(r["Count"])
                    if pd.notna(r.get("Count"))
                    else None,
                    "columns": r.get("Columns"),
                }
            )

    out = {
        "status": "success",
        "meta": {
            "message_types_used": sorted(CLEAN_EXPORT_MSG_TYPES),
            "firmware_string": ver_fw,
            "message_row_counts": msg_counts,
            "median_sample_interval_gps_s": median_dt_gps_s,
            "median_sample_interval_imu_s": median_dt_imu_s,
            "fmt_present": fmt_summary,
        },
        "mission_analysis": {
            "mission_status": mission_status,
            "anomalies": anomalies,
        },
        "data": {
            "metrics": metrics,
            "trajectory": trajectory,
            "methodology": {
                "horizontal_distance": "haversine over GPS Lat/Lng",
                "enu": "WGS-84 → ECEF, зміщення → ENU від першої точки GPS",
                "imu_speed": "трапеції по лінійному прискоренню в NED після merge ATT+IMU",
            },
        },
    }
    return _json_clean(out)
