import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./pages/LoginScreen";
import UploadScreen from "./pages/UploadScreen";
import FlightDashboard from "./pages/FlightDashboard";
import FlightDetailSimple from "./pages/FlightDetailSimple";
import AccountPage from "./pages/AccountPage";
import AdminPanel from "./pages/AdminPanel";
import { MONO } from "./utils/constants";
import "./App.css";

function RequireAuth({ token }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function LoginRoute({ login, token }) {
  const navigate = useNavigate();
  if (token) {
    return <Navigate to="/" replace />;
  }
  return (
    <LoginScreen
      onLogin={(jwt, roles) => {
        login(jwt, roles);
        navigate("/", { replace: true });
      }}
    />
  );
}

function UploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const adminDenied = Boolean(location.state?.adminDenied);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {adminDenied ? (
        <div
          role="alert"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            margin: 0,
            padding: "12px 20px",
            background: "rgba(248,113,113,0.12)",
            borderBottom: "1px solid rgba(248,113,113,0.35)",
            color: "#fecaca",
            fontFamily: MONO,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span>
            Доступ заборонено (403): для адмін-панелі потрібна роль ROLE_ADMIN.
          </span>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true, state: {} })}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(248,113,113,0.45)",
              background: "rgba(0,0,0,0.25)",
              color: "#fecaca",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 11,
            }}
          >
            Закрити
          </button>
        </div>
      ) : null}
      <UploadScreen
      isAdmin={isAdmin}
      onAnalyzed={(name, response) =>
        navigate("/dashboard", {
          state: { fileName: name, apiResponse: response, returnTo: "/" },
        })
      }
      onAccount={() => navigate("/account")}
      onAdmin={() => navigate("/admin/users")}
    />
    </div>
  );
}

function AccountPageRoute() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();
  return (
    <AccountPage
      isAdmin={isAdmin}
      onAdmin={() => navigate("/admin/users")}
      onBack={() => navigate("/")}
      onLogout={() => {
        logout();
        navigate("/login", { replace: true });
      }}
      onOpenDashboard={(name, response) =>
        navigate("/dashboard", {
          state: { fileName: name, apiResponse: response, returnTo: "/account" },
        })
      }
    />
  );
}

function DashboardRoute() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const returnTo = state?.returnTo ?? "/";
  const fileName = state?.fileName;
  const apiResponse = state?.apiResponse;
  const view = state?.view;
  const flightDetail = state?.flightDetail;

  if (view === "simple" && flightDetail && fileName) {
    return (
      <FlightDetailSimple
        detail={flightDetail}
        fileName={fileName}
        onBack={() => navigate(returnTo)}
      />
    );
  }

  if (!fileName || !apiResponse) {
    return <Navigate to="/" replace />;
  }
  return (
    <FlightDashboard
      fileName={fileName}
      apiResponse={apiResponse}
      onBack={() => navigate(returnTo)}
      onAccount={() => navigate("/account")}
    />
  );
}

function RequireAdmin({ isAdmin, rolesHydrated }) {
  if (!rolesHydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0f1a",
          color: "#64748b",
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: "0.04em",
        }}
      >
        Перевірка доступу…
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/" replace state={{ adminDenied: true }} />;
  }
  return <Outlet />;
}

function AdminUsersPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <AdminPanel
      activeTab="users"
      onLogout={() => {
        logout();
        navigate("/login", { replace: true });
      }}
    />
  );
}

function AdminFlightsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <AdminPanel
      activeTab="flights"
      onLogout={() => {
        logout();
        navigate("/login", { replace: true });
      }}
    />
  );
}

export default function App() {
  const { token, login, isAdmin, rolesHydrated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginRoute login={login} token={token} />}
      />
      <Route element={<RequireAuth token={token} />}>
        <Route index element={<UploadPage />} />
        <Route path="account" element={<AccountPageRoute />} />
        <Route path="dashboard" element={<DashboardRoute />} />
        <Route element={<RequireAdmin isAdmin={isAdmin} rolesHydrated={rolesHydrated} />}>
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/flights" element={<AdminFlightsPage />} />
          <Route path="admin" element={<Navigate to="/admin/users" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
