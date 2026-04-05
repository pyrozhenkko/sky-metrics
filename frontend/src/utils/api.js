/**
 * Normalise the trajectory object coming from the Java backend.
 * Java serialises TrajectoryDto with @JsonProperty names (time_s, x_east_m, ...)
 * while the Dashboard / mathUtils expect  { time, x_east, y_north, z_up, ... }.
 */
function normaliseTraj(traj) {
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

  const token = localStorage.getItem("jwt_token");

  const response = await fetch('http://localhost:8080/api/flights/upload', {
    method: 'POST',
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Помилка сервера: ${response.status}`);
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
