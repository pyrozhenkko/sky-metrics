const rawApiBase = import.meta.env.VITE_API_BASE;
export const API_BASE =
  typeof rawApiBase === "string"
    ? rawApiBase.replace(/\/$/, "")
    : "http://localhost:8080";

export const SPEED_CS = [
  [0.0, "#1e40af"], [0.15, "#2563eb"], [0.3, "#0ea5e9"],
  [0.45, "#06b6d4"], [0.55, "#10b981"], [0.65, "#f59e0b"],
  [0.8, "#ef4444"],  [1.0, "#dc2626"],
];

export const MONO = "'DM Mono', 'Fira Mono', monospace";
