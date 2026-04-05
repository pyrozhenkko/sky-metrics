import { useState, useCallback, useRef } from 'react';
import { MessageSquare, Loader, RotateCcw, Zap, AlertTriangle, ExternalLink, Gauge } from 'lucide-react';
import { computeSpeeds, computeAccels } from '../utils/mathUtils';
import { MONO, API_BASE } from '../utils/constants';
import { authHeadersJson } from '../utils/authHeaders';

const GEMINI_QUOTAS_URL = 'https://ai.google.dev/gemini-api/docs/rate-limits';

function buildFlightJsonForLlm({ metrics, meta, aiSummary }) {
  const anomalies =
    typeof aiSummary === 'string' && aiSummary.trim()
      ? aiSummary.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];
  const safeMeta =
    meta && typeof meta === 'object' && !Array.isArray(meta)
      ? meta
      : { firmware_string: null };
  return {
    status: 'success',
    meta: safeMeta,
    mission_analysis: {
      mission_status: 'Unknown',
      anomalies,
    },
    data: {
      metrics: {
        flight_duration_sec: metrics?.flight_duration_sec ?? null,
        total_distance_m: metrics?.total_distance_m ?? null,
        max_altitude_m: metrics?.max_altitude_m ?? null,
        max_horizontal_speed_m_s: metrics?.max_horizontal_speed_m_s ?? null,
        max_vertical_speed_m_s: metrics?.max_vertical_speed_m_s ?? null,
        max_acceleration_m_s2: metrics?.max_acceleration_m_s2 ?? null,
      },
    },
  };
}

function extractFirstUrl(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/https:\/\/[^\s)\]'"<>]+/);
  if (!m) return null;
  return m[0].replace(/[.,;:]+$/, '');
}

function stripUrls(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/https:\/\/[^\s]+/g, '').replace(/\s+/g, ' ').trim();
}

function shortenBlobSummary(s) {
  if (typeof s !== 'string') return '';
  if (s.length < 500) return s;
  const cut = s.split(/\bviolations\s*\{/i)[0]?.trim();
  if (cut && cut.length >= 80) return cut;
  return 'Сталася технічна помилка при зверненні до AI. Деталі приховані через обʼєм службового тексту.';
}

function formatAiReportBody(data) {
  const lines = [];
  if (data.title) lines.push(`**${data.title}**`);
  if (data.overall_status && data.overall_status !== 'error') {
    lines.push(`Стан: ${data.overall_status}`);
  }
  if (data.summary) lines.push(data.summary);
  const an = Array.isArray(data.anomalies) ? data.anomalies : [];
  if (an.length) {
    lines.push('');
    lines.push('Аномалії:');
    for (const a of an) {
      const sev = a.severity ?? '—';
      const comp = a.component ?? '—';
      const issue = a.issue ?? '';
      const act = a.action_required ?? '';
      lines.push(`- [${sev}] ${comp}: ${issue}${act ? ` → ${act}` : ''}`);
    }
  }
  if (data.recommendation) {
    lines.push('');
    lines.push(`Рекомендації: ${data.recommendation}`);
  }
  return lines.join('\n');
}

function buildReportView(data) {
  const status = data?.overall_status;
  const title = typeof data?.title === 'string' ? data.title : '';
  const summary = typeof data?.summary === 'string' ? data.summary : '';
  const recommendation = typeof data?.recommendation === 'string' ? data.recommendation : '';
  const errorKind = typeof data?.error_kind === 'string' ? data.error_kind : '';
  const docUrlRaw = typeof data?.doc_url === 'string' ? data.doc_url : '';

  if (status === 'error') {
    const quota =
      errorKind === 'quota_exceeded' ||
      /429|quota|free_tier|generativelanguage\.googleapis/i.test(summary + recommendation);
    const docUrl = docUrlRaw || extractFirstUrl(`${recommendation}\n${summary}`) || GEMINI_QUOTAS_URL;
    const messy = summary.length > 800 && (/violations\s*\{|quota_metric:/i.test(summary) || summary.length > 1200);
    const cleanedSummary = messy ? shortenBlobSummary(summary) : summary;
    return {
      kind: 'error',
      tone: quota ? 'quota' : 'generic',
      title: title || (quota ? 'Ліміт API Gemini' : 'Не вдалося згенерувати звіт'),
      summary: cleanedSummary || (quota ? 'Досягнуто обмеження API Gemini.' : 'Спробуйте пізніше або перевірте налаштування.'),
      recommendation,
      docUrl,
      docLabel: quota ? 'Квоти та ліміти Gemini' : 'Довідка Google',
    };
  }

  return { kind: 'text', text: formatAiReportBody(data) };
}

export default function AIAssistantPanel({ metrics, trajectory, meta, aiSummary }) {
  const [reportView, setReportView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(false);
  const busyRef = useRef(false);

  const generateReport = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    setReportView(null);

    if (typeof localStorage !== 'undefined' && !localStorage.getItem('jwt_token')) {
      setError('Увійдіть у систему, щоб згенерувати AI-звіт.');
      busyRef.current = false;
      setLoading(false);
      return;
    }

    const speeds = computeSpeeds(trajectory);
    const accels = computeAccels(trajectory);
    const maxSpeed = Math.max(...speeds, 0);
    const maxAccel = Math.max(...accels.map(Math.abs), 0);
    const altitudes = trajectory?.z_up ?? [];

    const altDrops = [];
    for (let i = 1; i < altitudes.length; i++) {
      const drop = altitudes[i - 1] - altitudes[i];
      if (drop > 5) altDrops.push({ t: trajectory.time[i], drop: drop.toFixed(1) });
    }

    const flightPayload = buildFlightJsonForLlm({ metrics, meta, aiSummary });
    flightPayload.data.extra_context = {
      computed_max_speed_m_s: Number(maxSpeed.toFixed(2)),
      computed_max_accel_m_s2: Number(maxAccel.toFixed(2)),
      sharp_altitude_drops: altDrops.slice(0, 5),
    };

    try {
      const response = await fetch(`${API_BASE}/api/llm/ai-report`, {
        method: 'POST',
        headers: authHeadersJson(),
        body: JSON.stringify(flightPayload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok && data.summary == null && data.title == null) {
        throw new Error(typeof data.detail === 'string' ? data.detail : `HTTP ${response.status}`);
      }

      const view = buildReportView(data);
      if (view.kind === 'text' && !view.text.trim()) {
        throw new Error('Порожня відповідь від сервера');
      }
      if (view.kind === 'error' && !view.summary && !view.recommendation) {
        throw new Error('Порожня відповідь від сервера');
      }

      setReportView(view);
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося отримати звіт');
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [metrics, trajectory, meta, aiSummary]);

  const renderReportLines = (text) => {
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
      const isBold = line.startsWith('**') || /^\d+\./.test(line);
      const isWarning = line.includes('WARNING') || line.includes('ПОПЕРЕДЖЕННЯ');
      const isCritical = line.includes('CRITICAL') || line.includes('КРИТИЧНО');
      const cleaned = line.replace(/\*\*/g, '');
      return (
        <div key={i} style={{
          fontFamily: MONO, fontSize: 11, lineHeight: 1.7,
          color: isCritical ? '#f87171' : isWarning ? '#fbbf24' : isBold ? '#94a3b8' : '#cbd5e1',
          fontWeight: (isBold || isWarning || isCritical) ? 500 : 400,
          paddingLeft: line.startsWith('  ') || line.startsWith('- ') ? 12 : 0,
        }}>
          {cleaned}
        </div>
      );
    });
  };

  const errorRecPlain = reportView?.kind === 'error' ? stripUrls(reportView.recommendation) : '';

  const outcomeBadge =
    !generated ? null : reportView?.kind === 'error' ? (
      <span style={{
        fontSize: 8, fontFamily: MONO, color: '#fbbf24',
        background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
        borderRadius: 4, padding: '1px 6px', letterSpacing: '0.06em',
      }}>
        {reportView.tone === 'quota' ? 'ЛІМІТ API' : 'ПОМИЛКА'}
      </span>
    ) : (
      <span style={{
        fontSize: 8, fontFamily: MONO, color: '#22c55e',
        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: 4, padding: '1px 6px', letterSpacing: '0.06em',
      }}>ГОТОВО</span>
    );

  const quotaAccent = 'rgba(251,191,36,0.22)';
  const genericErrorAccent = 'rgba(248,113,113,0.2)';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.018)',
      border: '1px solid rgba(96,165,250,0.15)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(96,165,250,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={12} color="#60a5fa" />
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#cbd5e1', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            AI Аналітик · Звіт про політ
          </span>
          {outcomeBadge}
        </div>
        <button
          type="button"
          onClick={generateReport}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: loading ? 'rgba(96,165,250,0.06)' : 'rgba(96,165,250,0.12)',
            border: '1px solid rgba(96,165,250,0.25)',
            borderRadius: 7, padding: '5px 12px', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: MONO, fontSize: 10, color: '#60a5fa',
            transition: 'all 0.2s',
          }}
        >
          {loading
            ? <><Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> Генерую…</>
            : generated ? <><RotateCcw size={10} /> Оновити</>
              : <><Zap size={10} /> Згенерувати звіт</>
          }
        </button>
      </div>

      <div style={{ padding: '14px 16px', minHeight: 80 }}>
        {!generated && !loading && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1', fontFamily: MONO, fontSize: 11 }}>
            <MessageSquare size={14} color="#1e3a5f" />
            <span>Натисніть «Згенерувати звіт» для AI-аналізу польоту (Gemini через бекенд)</span>
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[100, 80, 90, 60].map((w, i) => (
              <div key={i} style={{
                height: 10, width: `${w}%`, borderRadius: 5,
                background: 'rgba(96,165,250,0.08)',
                animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontFamily: MONO, fontSize: 11 }}>
            <AlertTriangle size={12} />
            {error}
          </div>
        )}
        {reportView?.kind === 'error' && !loading && (
          <div
            role="alert"
            style={{
              border: `1px solid ${reportView.tone === 'quota' ? quotaAccent : genericErrorAccent}`,
              background: reportView.tone === 'quota' ? 'rgba(251,191,36,0.06)' : 'rgba(248,113,113,0.06)',
              borderRadius: 12,
              padding: '16px 18px',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: reportView.tone === 'quota' ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${reportView.tone === 'quota' ? 'rgba(251,191,36,0.35)' : 'rgba(248,113,113,0.3)'}`,
              }}>
                {reportView.tone === 'quota'
                  ? <Gauge size={20} color="#fbbf24" aria-hidden />
                  : <AlertTriangle size={20} color="#f87171" aria-hidden />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  margin: '0 0 10px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: reportView.tone === 'quota' ? '#fef9c3' : '#fecaca',
                  letterSpacing: '-0.01em',
                }}>
                  {reportView.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: '#e2e8f0',
                }}>
                  {reportView.summary}
                </p>
                {errorRecPlain ? (
                  <p style={{
                    margin: '12px 0 0',
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: '#94a3b8',
                  }}>
                    {errorRecPlain}
                  </p>
                ) : null}
                <a
                  href={reportView.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 14,
                    fontFamily: MONO,
                    fontSize: 11,
                    color: '#7dd3fc',
                    textDecoration: 'none',
                    borderBottom: '1px solid rgba(125,211,252,0.35)',
                    paddingBottom: 1,
                  }}
                >
                  <ExternalLink size={13} aria-hidden />
                  {reportView.docLabel}
                </a>
              </div>
            </div>
          </div>
        )}
        {reportView?.kind === 'text' && !loading && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #1e3a5f, #0c4a6e)',
              border: '1px solid rgba(96,165,250,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2,
            }}>
              <MessageSquare size={12} color="#38bdf8" />
            </div>
            <div style={{
              flex: 1,
              background: 'rgba(10,20,40,0.6)',
              border: '1px solid rgba(96,165,250,0.12)',
              borderRadius: '4px 12px 12px 12px',
              padding: '12px 14px',
            }}>
              {renderReportLines(reportView.text)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
