export function authHeaders(additional = {}) {
  const token = localStorage.getItem("jwt_token");
  return {
    ...additional,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function authHeadersJson() {
  return authHeaders({ "Content-Type": "application/json" });
}
