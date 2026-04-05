import { API_BASE } from "./constants";
import { authHeaders } from "./authHeaders";

export function normaliseTraj(traj) {
  if (!traj) return traj;
  return {
    time:                 traj.time     ?? traj.time_s    ?? [],
    x_east:               traj.x_east   ?? traj.x_east_m  ?? [],
    y_north:              traj.y_north  ?? traj.y_north_m ?? [],
    z_up:                 traj.z_up     ?? traj.z_up_m    ?? [],
    lat_deg:              traj.lat_deg  ?? [],
    lon_deg:              traj.lon_deg  ?? [],
    alt_m:                traj.alt_m    ?? [],
    speed_horizontal_m_s: traj.speed_horizontal_m_s ?? [],
    reference:            traj.reference ?? null,
  };
}

export async function callApi(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/flights/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const ct = response.headers.get("content-type") ?? "";
    let msg = `Помилка сервера: ${response.status}`;
    if (ct.includes("application/json")) {
      const errorData = await response.json().catch(() => ({}));
      if (typeof errorData.message === "string" && errorData.message.trim()) {
        msg = errorData.message.trim();
      }
    } else {
      const text = await response.text().catch(() => "");
      if (text.trim()) {
        msg = text.trim().length > 500 ? `${text.trim().slice(0, 500)}…` : text.trim();
      }
    }
    throw new Error(msg);
  }

  const data = await response.json();

  if (!data.metrics || !data.trajectory) {
    throw new Error('Невірний формат відповіді від сервера (відсутні метрики або траєкторія)');
  }

  // Wrap in the format FlightDashboard.jsx expects: response.data.{ metrics, trajectory }
  return {
    status: "success",
    data: {
      ...data,
      trajectory: normaliseTraj(data.trajectory),
    }
  };
}

export function wrapFlightDetailForDashboard(detail) {
  if (!detail) return null;
  return {
    status: "success",
    data: {
      metrics: detail.metrics,
      trajectory: normaliseTraj(detail.trajectory),
      aiSummary: detail.aiSummary,
      meta: detail.meta,
      methodology: detail.methodology,
    },
  };
}

export function detailSupportsDashboard(detail) {
  if (!detail?.metrics || !detail?.trajectory) return false;
  const traj = normaliseTraj(detail.trajectory);
  const n = traj.time?.length ?? 0;
  if (n < 2) return false;
  const same = (arr) => Array.isArray(arr) && arr.length === n;
  if (!same(traj.z_up) || !same(traj.x_east) || !same(traj.y_north)) {
    return false;
  }
  return true;
}

export function describeTrajectoryAfterNormalize(rawTraj) {
  const t = normaliseTraj(rawTraj);
  if (!t?.time?.length) return null;
  const last = t.time.length - 1;
  const pick = (arr, i) => (Array.isArray(arr) ? arr[i] : undefined);
  return {
    point_count: t.time.length,
    reference: t.reference,
    time_s_from: pick(t.time, 0),
    time_s_to: pick(t.time, last),
    first_enu_m: {
      x_east: pick(t.x_east, 0),
      y_north: pick(t.y_north, 0),
      z_up: pick(t.z_up, 0),
    },
    last_enu_m: {
      x_east: pick(t.x_east, last),
      y_north: pick(t.y_north, last),
      z_up: pick(t.z_up, last),
    },
  };
}
