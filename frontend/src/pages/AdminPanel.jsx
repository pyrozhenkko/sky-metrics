import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  LogOut,
  Users,
  Plane,
  Loader,
  AlertCircle,
  Shield,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Activity,
  RefreshCw,
} from "lucide-react";
import { MONO } from "../utils/constants";
import Panel from "../components/ui/Panel";
import SectionLabel from "../components/ui/SectionLabel";
import {
  detailSupportsDashboard,
  wrapFlightDetailForDashboard,
} from "../utils/api";
import {
  adminCreateUser,
  adminDeleteUser,
  adminUpdateRoles,
  adminUpdateUser,
  fetchAdminStats,
  fetchAdminUsers,
  fetchAllFlightsAdmin,
  fetchFlightDetailAdmin,
} from "../utils/adminApi";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleSetToArray(roles) {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles;
  if (typeof roles === "object") return Object.values(roles);
  return [];
}

export default function AdminPanel({ activeTab, onLogout }) {
  const navigate = useNavigate();
  const tab = activeTab === "flights" ? "flights" : "users";
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [users, setUsers] = useState([]);
  const [flights, setFlights] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [tableBusy, setTableBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [mutationPending, setMutationPending] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [openingFlightId, setOpeningFlightId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    roleUser: true,
    roleAdmin: false,
  });

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: "", email: "" });

  const [rolesTarget, setRolesTarget] = useState(null);
  const [rolesForm, setRolesForm] = useState({
    roleUser: true,
    roleAdmin: false,
  });

  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const s = await fetchAdminStats();
        if (!cancelled) setStats(s);
      } catch (e) {
        if (!cancelled) {
          setStatsError(e.message || "Не вдалося завантажити статистику");
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, tab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError(null);
      try {
        if (tab === "users") {
          const u = await fetchAdminUsers();
          if (!cancelled) setUsers(Array.isArray(u) ? u : []);
        } else {
          const f = await fetchAllFlightsAdmin(statusFilter || undefined);
          if (!cancelled) setFlights(Array.isArray(f) ? f : []);
        }
      } catch (e) {
        if (!cancelled) {
          setListError(e.message || "Не вдалося завантажити список");
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, tab, statusFilter]);

  const retryAll = () => {
    setReloadKey((k) => k + 1);
  };

  const refreshUsers = async () => {
    setTableBusy(true);
    setActionError(null);
    try {
      const u = await fetchAdminUsers();
      setUsers(Array.isArray(u) ? u : []);
      const s = await fetchAdminStats();
      setStats(s);
      setStatsError(null);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setTableBusy(false);
    }
  };

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleCreate = async () => {
    clearFeedback();
    const roles = [];
    if (createForm.roleUser) roles.push("ROLE_USER");
    if (createForm.roleAdmin) roles.push("ROLE_ADMIN");
    if (roles.length === 0) {
      setActionError("Оберіть хоча б одну роль (ROLE_USER та/або ROLE_ADMIN)");
      return;
    }
    if (!createForm.username.trim() || !createForm.email.trim()) {
      setActionError("Заповніть username та email");
      return;
    }
    if (!createForm.password) {
      setActionError("Вкажіть пароль");
      return;
    }
    setMutationPending(true);
    try {
      const res = await adminCreateUser({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        roles,
      });
      setActionSuccess(res?.message || "Користувача створено");
      setCreateOpen(false);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        roleUser: true,
        roleAdmin: false,
      });
      await refreshUsers();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setMutationPending(false);
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ username: u.username ?? "", email: u.email ?? "" });
    clearFeedback();
  };

  const saveEdit = async () => {
    if (!editUser) return;
    clearFeedback();
    setMutationPending(true);
    try {
      const res = await adminUpdateUser(editUser.id, {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
      });
      setActionSuccess(res?.message || "Профіль оновлено");
      setEditUser(null);
      await refreshUsers();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setMutationPending(false);
    }
  };

  const openRoles = (u) => {
    const rs = new Set(roleSetToArray(u.roles).map((r) => String(r)));
    setRolesTarget(u);
    setRolesForm({
      roleUser: rs.has("ROLE_USER"),
      roleAdmin: rs.has("ROLE_ADMIN"),
    });
    clearFeedback();
  };

  const saveRoles = async () => {
    if (!rolesTarget) return;
    clearFeedback();
    const roles = [];
    if (rolesForm.roleUser) roles.push("ROLE_USER");
    if (rolesForm.roleAdmin) roles.push("ROLE_ADMIN");
    if (roles.length === 0) {
      setActionError("Оберіть хоча б одну роль (ROLE_USER та/або ROLE_ADMIN)");
      return;
    }
    setMutationPending(true);
    try {
      const res = await adminUpdateRoles(rolesTarget.id, roles);
      setActionSuccess(res?.message || "Ролі оновлено");
      setRolesTarget(null);
      await refreshUsers();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setMutationPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    clearFeedback();
    setMutationPending(true);
    try {
      const res = await adminDeleteUser(deleteTarget.id);
      setActionSuccess(res?.message || "Користувача видалено");
      setDeleteTarget(null);
      await refreshUsers();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setMutationPending(false);
    }
  };

  const openFlight = async (log) => {
    setOpeningFlightId(log.id);
    clearFeedback();
    try {
      const detail = await fetchFlightDetailAdmin(log.id);
      const fileName = detail.originalFilename ?? log.originalFilename;
      if (detailSupportsDashboard(detail)) {
        navigate("/dashboard", {
          state: {
            fileName,
            apiResponse: wrapFlightDetailForDashboard(detail),
            returnTo: "/admin/flights",
          },
        });
      } else {
        navigate("/dashboard", {
          state: {
            fileName,
            returnTo: "/admin/flights",
            view: "simple",
            flightDetail: detail,
          },
        });
      }
    } catch (e) {
      setActionError(e.message);
    } finally {
      setOpeningFlightId(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        backgroundImage:
          "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(29,58,138,0.22) 0%, transparent 55%)",
        color: "#f1f5f9",
        fontFamily: MONO,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.045)",
          background: "rgba(10,15,26,0.88)",
          backdropFilter: "blur(14px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              padding: "5px 10px",
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "#cbd5e1",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: MONO,
            }}
          >
            <ChevronLeft size={13} /> Назад
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={18} color="#38bdf8" />
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Адмін-панель
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "rgba(248,113,113,0.07)",
            border: "1px solid rgba(248,113,113,0.18)",
            borderRadius: 8,
            padding: "6px 13px",
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 10,
            color: "#f87171",
          }}
        >
          <LogOut size={12} /> Вийти
        </button>
      </nav>

      <div style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            style={{
              ...tabBtnStyle,
              ...(tab === "users" ? tabBtnActive : {}),
            }}
          >
            <Users size={14} /> Користувачі
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/flights")}
            style={{
              ...tabBtnStyle,
              ...(tab === "flights" ? tabBtnActive : {}),
            }}
          >
            <Plane size={14} /> Польоти (усі)
          </button>
        </div>

        <SectionLabel
          text="Зведення · статистика системи"
          gradient="linear-gradient(180deg,#3b82f6,#0ea5e9)"
        />
        <Panel
          title="Ключові метрики"
          icon={Activity}
          color="#38bdf8"
          style={{ marginBottom: 22 }}
        >
          {statsLoading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                padding: 16,
              }}
              aria-busy="true"
              aria-label="Завантаження статистики"
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 72,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    animation: "pulse 1.4s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          )}
          {!statsLoading && statsError && (
            <div
              role="alert"
              style={{
                margin: 16,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                background: "rgba(248,113,113,0.07)",
                border: "1px solid rgba(248,113,113,0.18)",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 11,
                color: "#f87171",
              }}
            >
              <AlertCircle size={14} aria-hidden />
              <span style={{ flex: "1 1 200px" }}>{statsError}</span>
              <button
                type="button"
                onClick={retryAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(248,113,113,0.35)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fecaca",
                  cursor: "pointer",
                  fontFamily: MONO,
                  fontSize: 10,
                }}
              >
                <RefreshCw size={12} /> Повторити
              </button>
            </div>
          )}
          {!statsLoading && !statsError && stats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                padding: 16,
              }}
            >
              {[
                { label: "Користувачів", val: stats.totalUsers },
                { label: "Польотів", val: stats.totalFlights },
                {
                  label: "Годин польоту (сум.)",
                  val:
                    stats.totalFlightHours != null
                      ? Number(stats.totalFlightHours).toFixed(1)
                      : "—",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.08em" }}>
                    {c.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, color: "#e2e8f0" }}>
                    {c.val}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {actionSuccess && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.22)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 11,
              color: "#34d399",
            }}
          >
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(248,113,113,0.07)",
              border: "1px solid rgba(248,113,113,0.18)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 11,
              color: "#f87171",
            }}
          >
            <AlertCircle size={13} /> {actionError}
          </div>
        )}

        <SectionLabel
          text={
            tab === "users"
              ? "Облікові записи · користувачі"
              : "Польоти · повний журнал (admin)"
          }
          gradient={
            tab === "users"
              ? "linear-gradient(180deg,#60a5fa,#818cf8)"
              : "linear-gradient(180deg,#38bdf8,#06b6d4)"
          }
        />
        <Panel
          title={tab === "users" ? "Таблиця користувачів" : "Таблиця польотів"}
          icon={tab === "users" ? Users : Plane}
          color={tab === "users" ? "#818cf8" : "#38bdf8"}
        >
          <div style={{ position: "relative", minHeight: 120 }}>
            {tableBusy && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(10,15,26,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 4,
                  borderRadius: "0 0 12px 12px",
                }}
              >
                <Loader size={24} color="#60a5fa" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}
            {listLoading && (
              <div
                style={{ display: "flex", justifyContent: "center", padding: 48 }}
                aria-busy="true"
                aria-label="Завантаження таблиці"
              >
                <Loader size={28} color="#60a5fa" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}
            {!listLoading && listError && (
              <div
                role="alert"
                style={{
                  margin: 16,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(248,113,113,0.07)",
                  border: "1px solid rgba(248,113,113,0.18)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 11,
                  color: "#f87171",
                }}
              >
                <AlertCircle size={14} aria-hidden />
                <span style={{ flex: "1 1 200px" }}>{listError}</span>
                <button
                  type="button"
                  onClick={retryAll}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(248,113,113,0.35)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fecaca",
                    cursor: "pointer",
                    fontFamily: MONO,
                    fontSize: 10,
                  }}
                >
                  <RefreshCw size={12} /> Повторити
                </button>
              </div>
            )}
            {!listLoading && !listError && tab === "users" ? (
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => { setCreateOpen(true); clearFeedback(); }}
                disabled={tableBusy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  cursor: tableBusy ? "not-allowed" : "pointer",
                  opacity: tableBusy ? 0.6 : 1,
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "#fff",
                  background: "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
                }}
              >
                <Plus size={14} /> Новий користувач
              </button>
            </div>
            <div
              style={{
                overflowX: "auto",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
              }}
            >
              <table
                aria-label="Користувачі системи"
                style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
              >
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                    {[
                      { key: "id", label: "id" },
                      { key: "username", label: "username" },
                      { key: "email", label: "email" },
                      { key: "roles", label: "roles" },
                      { key: "totalFlights", label: "totalFlights" },
                      { key: "actions", label: "Дії" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <td style={{ padding: "10px 12px", color: "#cbd5e1" }}>{u.id}</td>
                      <td style={{ padding: "10px 12px" }}>{u.username}</td>
                      <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{u.email}</td>
                      <td style={{ padding: "10px 12px", color: "#94a3b8" }}>
                        {roleSetToArray(u.roles).join(", ")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{u.totalFlights ?? "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <IconTextBtn disabled={tableBusy} icon={<Pencil size={12} />} label="Профіль" title="Редагувати профіль" onClick={() => openEdit(u)} />
                          <IconTextBtn disabled={tableBusy} icon={<KeyRound size={12} />} label="Ролі" title="Змінити ролі (ROLE_USER / ROLE_ADMIN)" onClick={() => openRoles(u)} />
                          <IconTextBtn disabled={tableBusy} icon={<Trash2 size={12} />} label="Видалити" title="Видалити користувача" danger onClick={() => { setDeleteTarget(u); clearFeedback(); }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: "#64748b" }}>Статус:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={tableBusy}
                aria-label="Фільтр за статусом польоту"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                  padding: "6px 10px",
                  fontFamily: MONO,
                  fontSize: 11,
                  opacity: tableBusy ? 0.6 : 1,
                }}
              >
                <option value="">Усі</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
                <option value="PROCESSING">PROCESSING</option>
              </select>
            </div>
            <div
              style={{
                overflowX: "auto",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
              }}
            >
              <table
                aria-label="Усі польоти (admin)"
                style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
              >
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                    {[
                      { key: "id", label: "id" },
                      { key: "userId", label: "userId" },
                      { key: "username", label: "username" },
                      { key: "ownerEmail", label: "ownerEmail" },
                      { key: "filename", label: "filename" },
                      { key: "uploadedAt", label: "uploadedAt" },
                      { key: "status", label: "status" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flights.map((f) => {
                    const rowOpening = openingFlightId === f.id;
                    return (
                      <tr
                        key={f.id}
                        tabIndex={0}
                        role="button"
                        aria-busy={rowOpening}
                        aria-label={`Деталі польоту ${f.originalFilename}`}
                        onClick={() => !rowOpening && !tableBusy && openFlight(f)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && !rowOpening && !tableBusy) {
                            e.preventDefault();
                            openFlight(f);
                          }
                        }}
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          cursor: rowOpening || tableBusy ? "wait" : "pointer",
                          opacity: rowOpening || tableBusy ? 0.65 : 1,
                          outline: "none",
                        }}
                      >
                        <td
                          title={String(f.id)}
                          style={{ padding: "10px 12px", color: "#cbd5e1", maxWidth: 120 }}
                        >
                          <span style={{ display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}>
                            {String(f.id)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{f.userId ?? "—"}</td>
                        <td style={{ padding: "10px 12px", color: "#cbd5e1" }}>{f.username ?? "—"}</td>
                        <td
                          title={f.ownerEmail ?? ""}
                          style={{ padding: "10px 12px", color: "#94a3b8", maxWidth: 160 }}
                        >
                          <span style={{ display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}>
                            {f.ownerEmail ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>{f.originalFilename}</td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>
                          {fmtDate(f.uploadedAt)}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{f.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </div>
        </Panel>
      </div>

      {createOpen && (
        <Modal title="Новий користувач" onClose={() => setCreateOpen(false)}>
          <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 14px", lineHeight: 1.45 }}>
            Тіло запиту як <code style={{ color: "#94a3b8" }}>SignupRequest</code>
            : username, email, password, roles (ROLE_USER / ROLE_ADMIN).
          </p>
          <Field
            label="username"
            value={createForm.username}
            onChange={(v) => setCreateForm((p) => ({ ...p, username: v }))}
            autoComplete="username"
          />
          <Field
            label="email"
            type="email"
            value={createForm.email}
            onChange={(v) => setCreateForm((p) => ({ ...p, email: v }))}
            autoComplete="email"
          />
          <Field
            label="password"
            type="password"
            value={createForm.password}
            onChange={(v) => setCreateForm((p) => ({ ...p, password: v }))}
            autoComplete="new-password"
          />
          <div style={{ fontSize: 9, color: "#64748b", marginBottom: 6, letterSpacing: "0.06em" }}>
            roles
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 11 }}>
            <input
              type="checkbox"
              checked={createForm.roleUser}
              onChange={(e) => setCreateForm((p) => ({ ...p, roleUser: e.target.checked }))}
            />
            ROLE_USER
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 11 }}>
            <input
              type="checkbox"
              checked={createForm.roleAdmin}
              onChange={(e) => setCreateForm((p) => ({ ...p, roleAdmin: e.target.checked }))}
            />
            ROLE_ADMIN
          </label>
          <ModalActions
            onCancel={() => setCreateOpen(false)}
            onConfirm={handleCreate}
            confirmLabel="Створити"
            confirmPending={mutationPending}
          />
        </Modal>
      )}

      {editUser && (
        <Modal title={`Редагування профілю · ${editUser.username}`} onClose={() => setEditUser(null)}>
          <Field label="username" value={editForm.username} onChange={(v) => setEditForm((p) => ({ ...p, username: v }))} />
          <Field label="email" type="email" value={editForm.email} onChange={(v) => setEditForm((p) => ({ ...p, email: v }))} />
          <ModalActions
            onCancel={() => setEditUser(null)}
            onConfirm={saveEdit}
            confirmLabel="Зберегти"
            confirmPending={mutationPending}
          />
        </Modal>
      )}

      {rolesTarget && (
        <Modal title={`Зміна ролей · ${rolesTarget.username}`} onClose={() => setRolesTarget(null)}>
          <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 12px" }}>
            Поле <code style={{ color: "#94a3b8" }}>roles</code> у тілі PUT (ROLE_USER / ROLE_ADMIN).
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 11 }}>
            <input
              type="checkbox"
              checked={rolesForm.roleUser}
              onChange={(e) => setRolesForm((p) => ({ ...p, roleUser: e.target.checked }))}
            />
            ROLE_USER
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 11 }}>
            <input
              type="checkbox"
              checked={rolesForm.roleAdmin}
              onChange={(e) => setRolesForm((p) => ({ ...p, roleAdmin: e.target.checked }))}
            />
            ROLE_ADMIN
          </label>
          <ModalActions
            onCancel={() => setRolesTarget(null)}
            onConfirm={saveRoles}
            confirmLabel="Зберегти"
            confirmPending={mutationPending}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Видалити користувача?" onClose={() => setDeleteTarget(null)}>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
            {deleteTarget.username} ({deleteTarget.email})
          </p>
          <ModalActions
            onCancel={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
            confirmLabel="Видалити"
            danger
            confirmPending={mutationPending}
          />
        </Modal>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

const tabBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  color: "#94a3b8",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 11,
};

const tabBtnActive = {
  background: "rgba(96,165,250,0.12)",
  borderColor: "rgba(96,165,250,0.35)",
  color: "#e2e8f0",
};

function IconTextBtn({ icon, label, onClick, danger, disabled, title: titleAttr }) {
  return (
    <button
      type="button"
      title={titleAttr}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 6,
        border: `1px solid ${danger ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.12)"}`,
        background: danger ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.04)",
        color: danger ? "#f87171" : "#cbd5e1",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontFamily: MONO,
        fontSize: 9,
      }}
    >
      {icon} {label}
    </button>
  );
}

function Field({ label, type = "text", value, onChange, autoComplete }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, color: "#64748b", marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.25)",
          color: "#f1f5f9",
          fontFamily: MONO,
          fontSize: 12,
        }}
      />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-modal-title" style={{ margin: "0 0 16px", fontSize: 14 }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onConfirm, confirmLabel, danger, confirmPending }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
      <button
        type="button"
        onClick={onCancel}
        disabled={confirmPending}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "transparent",
          color: "#cbd5e1",
          cursor: confirmPending ? "not-allowed" : "pointer",
          opacity: confirmPending ? 0.55 : 1,
          fontFamily: MONO,
          fontSize: 11,
        }}
      >
        Скасувати
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmPending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: danger
            ? "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)"
            : "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
          color: "#fff",
          cursor: confirmPending ? "not-allowed" : "pointer",
          opacity: confirmPending ? 0.75 : 1,
          fontFamily: MONO,
          fontSize: 11,
        }}
      >
        {confirmPending ? (
          <Loader size={14} color="#fff" style={{ animation: "spin 1s linear infinite" }} aria-hidden />
        ) : null}
        {confirmLabel}
      </button>
    </div>
  );
}
