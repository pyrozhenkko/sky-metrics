import { ChevronLeft, FileWarning } from "lucide-react";
import { MONO } from "../utils/constants";
import { describeTrajectoryAfterNormalize } from "../utils/api";

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

function JsonBlock({ value, label }) {
  if (value === undefined || value === null) return null;
  let text;
  try {
    text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.08em", marginBottom: 8 }}>
        {label}
      </div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 10,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#94a3b8",
          fontSize: 10,
          overflow: "auto",
          maxHeight: 280,
        }}
      >
        {text}
      </pre>
    </div>
  );
}

export default function FlightDetailSimple({ detail, fileName, onBack }) {
  const metrics = detail?.metrics;
  const metricEntries = metrics
    ? Object.entries(metrics).filter(([, v]) => v != null)
    : [];
  const trajectoryDescription = detail?.trajectory
    ? describeTrajectoryAfterNormalize(detail.trajectory)
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        backgroundImage:
          "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(29,58,138,0.22) 0%, transparent 55%)",
        color: "#f1f5f9",
        fontFamily: MONO,
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.045)",
          background: "rgba(10,15,26,0.88)",
          backdropFilter: "blur(14px)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
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
        <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
          {fileName}
        </span>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: 16,
            borderRadius: 12,
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.2)",
            marginBottom: 24,
          }}
        >
          <FileWarning size={22} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fde68a", marginBottom: 6 }}>
              Спрощений перегляд
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
              Немає повного набору траєкторії для звичного дашборду. Нижче — дані з деталей, отриманих
              через GET /api/flights/admin за id запису.
            </p>
          </div>
        </div>

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr",
            gap: "8px 16px",
            fontSize: 11,
            margin: "0 0 24px",
          }}
        >
          <dt style={{ color: "#64748b" }}>id</dt>
          <dd style={{ margin: 0, color: "#e2e8f0", wordBreak: "break-all" }}>{detail?.id}</dd>
          <dt style={{ color: "#64748b" }}>status</dt>
          <dd style={{ margin: 0 }}>{detail?.status}</dd>
          <dt style={{ color: "#64748b" }}>uploadedAt</dt>
          <dd style={{ margin: 0 }}>{fmtDate(detail?.uploadedAt)}</dd>
          <dt style={{ color: "#64748b" }}>originalFilename</dt>
          <dd style={{ margin: 0 }}>{detail?.originalFilename}</dd>
        </dl>

        {detail?.aiSummary ? (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.08em", marginBottom: 8 }}>
              aiSummary
            </div>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#cbd5e1",
                fontSize: 11,
                whiteSpace: "pre-wrap",
              }}
            >
              {detail.aiSummary}
            </pre>
          </div>
        ) : null}

        {metricEntries.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.08em", marginBottom: 10 }}>
              metrics
            </div>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {metricEntries.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr minmax(0, 1fr)",
                    gap: 12,
                    padding: "8px 12px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 10,
                  }}
                >
                  <span style={{ color: "#64748b" }}>{k}</span>
                  <span style={{ color: "#e2e8f0", textAlign: "right" }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 24 }}>metrics: немає даних</p>
        )}

        {trajectoryDescription ? (
          <JsonBlock label="trajectory (після normaliseTraj, як у Flight)" value={trajectoryDescription} />
        ) : detail?.trajectory ? (
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 24 }}>
            trajectory: є у відповіді, але після normaliseTraj немає жодної точки
          </p>
        ) : (
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 24 }}>trajectory: немає</p>
        )}

        <JsonBlock label="meta" value={detail?.meta} />
        <JsonBlock label="methodology" value={detail?.methodology} />
      </div>
    </div>
  );
}
