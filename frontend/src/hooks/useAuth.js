import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../utils/constants";
import { authHeaders } from "../utils/authHeaders";

const ROLES_KEY = "jwt_roles";

function loadRoles() {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isAdminRole(roles) {
  return roles.some(
    (r) => r === "ROLE_ADMIN" || r === "ADMIN" || String(r).toUpperCase() === "ROLE_ADMIN"
  );
}

function rolesKeyPresent() {
  return localStorage.getItem(ROLES_KEY) !== null;
}

export function useAuth() {
  const getToken = () => localStorage.getItem("jwt_token");
  const [token, setToken] = useState(getToken);
  const [roles, setRoles] = useState(loadRoles);
  const [rolesHydrated, setRolesHydrated] = useState(
    () => !getToken() || rolesKeyPresent()
  );

  const login = (jwt, rolesFromLogin = []) => {
    localStorage.setItem("jwt_token", jwt);
    localStorage.setItem(ROLES_KEY, JSON.stringify(rolesFromLogin));
    setToken(jwt);
    setRoles(rolesFromLogin);
    setRolesHydrated(true);
  };

  const logout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem(ROLES_KEY);
    setToken(null);
    setRoles([]);
    setRolesHydrated(true);
  };

  const isAdmin = useMemo(() => isAdminRole(roles), [roles]);

  useEffect(() => {
    if (!token) {
      setRolesHydrated(true);
      return;
    }
    if (rolesKeyPresent()) {
      setRoles(loadRoles());
      setRolesHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, {
          headers: authHeaders(),
        });
        if (cancelled) return;
        let arr = [];
        if (res.ok) {
          try {
            const profile = await res.json();
            const raw = profile?.roles;
            if (Array.isArray(raw)) arr = raw;
            else if (raw && typeof raw === "object") arr = Object.values(raw);
          } catch {
            arr = [];
          }
        }
        localStorage.setItem(ROLES_KEY, JSON.stringify(arr));
        if (!cancelled) setRoles(arr);
      } catch {
        if (!cancelled) {
          localStorage.setItem(ROLES_KEY, JSON.stringify([]));
          setRoles([]);
        }
      } finally {
        if (!cancelled) setRolesHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { token, roles, isAdmin, rolesHydrated, login, logout };
}
