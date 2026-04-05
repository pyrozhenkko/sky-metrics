import { API_BASE } from "./constants";
import { authHeaders, authHeadersJson } from "./authHeaders";

async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Помилка ${res.status}`
    );
  }
  return data;
}

async function readApiResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Помилка ${res.status}`
    );
  }
  if (data && typeof data.success === "boolean" && data.success === false) {
    throw new Error(data.message || "Помилка операції");
  }
  return data;
}

export async function fetchAdminUsers() {
  const res = await fetch(`${API_BASE}/api/users/admin/all`, {
    headers: authHeaders(),
  });
  return readJson(res);
}

export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/api/users/admin/stats`, {
    headers: authHeaders(),
  });
  return readJson(res);
}

export async function adminCreateUser(body) {
  const res = await fetch(`${API_BASE}/api/users/admin/create`, {
    method: "POST",
    headers: authHeadersJson(),
    body: JSON.stringify({
      username: body.username,
      email: body.email,
      password: body.password,
      roles: Array.from(new Set(body.roles ?? [])),
    }),
  });
  return readApiResponse(res);
}

export async function adminUpdateUser(userId, body) {
  const res = await fetch(`${API_BASE}/api/users/admin/${userId}`, {
    method: "PUT",
    headers: authHeadersJson(),
    body: JSON.stringify(body),
  });
  return readApiResponse(res);
}

export async function adminUpdateRoles(userId, roles) {
  const res = await fetch(`${API_BASE}/api/users/admin/${userId}/roles`, {
    method: "PUT",
    headers: authHeadersJson(),
    body: JSON.stringify({ roles: Array.from(new Set(roles ?? [])) }),
  });
  return readApiResponse(res);
}

export async function adminDeleteUser(userId) {
  const res = await fetch(`${API_BASE}/api/users/admin/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return readApiResponse(res);
}

export async function fetchAllFlightsAdmin(status) {
  const q =
    status && String(status).trim()
      ? `?status=${encodeURIComponent(status.trim())}`
      : "";
  const res = await fetch(`${API_BASE}/api/flights/admin/all${q}`, {
    headers: authHeaders(),
  });
  return readJson(res);
}

export async function fetchFlightDetailAdmin(id) {
  const res = await fetch(`${API_BASE}/api/flights/admin/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Помилка ${res.status}`);
  }
  return res.json();
}
