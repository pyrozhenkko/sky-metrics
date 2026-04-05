import google.generativeai as genai
import json
import re
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os

load_dotenv()

_GENAI_KEY = os.getenv("GENAI_API_KEY")
if _GENAI_KEY:
    genai.configure(api_key=_GENAI_KEY)

_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")


class Anomaly(BaseModel):
    component: str = Field(description="Назва системи чи вузла (наприклад, 'Двигун 2').")
    issue: str = Field(description="Опис проблеми.")
    severity: str = Field(description="Рівень загрози: 'low', 'medium', 'high' або 'critical'.")
    action_required: str = Field(description="Що потрібно зробити для усунення.")


class FlightReport(BaseModel):
    title: str = Field(description="Коротка та ємна назва звіту.")
    overall_status: str = Field(description="Загальний стан: 'ok', 'warning' або 'error'.")
    summary: str = Field(description="Загальний опис результату аналізу.")
    anomalies: list[Anomaly] = Field(description="Список аномалій. Порожній список, якщо все добре.")
    recommendation: str = Field(description="Загальна порада для екіпажу.")


prompt1 = '''
Ти — експертна ШІ-система аналізу та діагностики польотних даних дрона. 
Твоє завдання: глибоко проаналізувати надані "сирі" метрики польоту та згенерувати структурований, 
зрозумілий системний звіт для секції "Відповідь від ШІ" на панелі керування.

ІНСТРУКЦІЇ З АНАЛІЗУ:
1. Оціни всі показники (швидкість, висоту, температуру, тиск, стан двигунів тощо).
2. Вияви будь-які відхилення від норми, помилки або критичні поломки.
3. Сформуй чіткий висновок та рекомендації.
'''


def _error_json(
    title: str,
    summary: str,
    recommendation: str = "",
) -> str:
    payload = {
        "title": title,
        "overall_status": "error",
        "summary": summary,
        "anomalies": [],
        "recommendation": recommendation,
        "error_kind": "generic",
    }
    return json.dumps(payload, ensure_ascii=False)


def _parse_retry_seconds(msg: str) -> int | None:
    m = re.search(r"retry in ([\d.]+)\s*s", msg, re.IGNORECASE)
    if not m:
        m = re.search(r"retry_delay\s*\{\s*seconds:\s*(\d+)", msg, re.IGNORECASE)
    if not m:
        return None
    try:
        return max(0, int(float(m.group(1))))
    except ValueError:
        return None


def _is_quota_or_rate_limit(msg: str) -> bool:
    low = msg.lower()
    return (
        "429" in msg
        or "quota" in low
        or "resource exhausted" in low
        or "rate limit" in low
        or "exceeded your current quota" in low
        or "free_tier" in low
        or "generativelanguage.googleapis.com" in low
    )


def _friendly_gemini_error(exc: BaseException) -> str:
    raw = f"{exc!s}"
    if _is_quota_or_rate_limit(raw):
        wait = _parse_retry_seconds(raw)
        summary = (
            "У межах безкоштовного тарифу Google Gemini для цієї моделі тимчасово недоступні нові запити: "
            "можливо, досягнуто денний ліміт або обмеження запитів за хвилину."
        )
        if wait is not None and wait > 0:
            summary += f" Спробуйте ще раз приблизно через {wait} с."
        rec = (
            "Перевірте квоти та білінг у Google AI Studio. За потреби увімкніть оплату, оберіть інший проєкт API або змініть модель (змінна GEMINI_MODEL)."
        )
        doc = "https://ai.google.dev/gemini-api/docs/rate-limits"
        payload = {
            "title": "Ліміт API Gemini",
            "overall_status": "error",
            "summary": summary,
            "anomalies": [],
            "recommendation": f"{rec} Документація: {doc}",
            "error_kind": "quota_exceeded",
            "doc_url": doc,
        }
        return json.dumps(payload, ensure_ascii=False)
    short = raw if len(raw) <= 480 else raw[:477] + "…"
    return _error_json(
        "Недоступно",
        "Не вдалося отримати відповідь від Gemini.",
        short,
    )


def generate_ai_report(llm_payload: dict) -> str:
    if not _GENAI_KEY:
        return _error_json(
            "Ключ API не налаштовано",
            "Змінна GENAI_API_KEY не задана для сервісу flightlog.",
            "Додайте ключ у docker-compose, .env або змінні середовища контейнера.",
        )
    try:
        model = genai.GenerativeModel(_GEMINI_MODEL)

        generation_config = genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=FlightReport,
            temperature=0.2,
        )

        response = model.generate_content(
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt1},
                        {
                            "text": f"Дані польоту: {json.dumps(llm_payload, ensure_ascii=False, indent=2)}"
                        },
                    ],
                }
            ],
            generation_config=generation_config,
        )

        text = (response.text or "").strip()
        if not text:
            return _error_json(
                "Немає відповіді",
                "Модель Gemini повернула порожній текст.",
                "",
            )
        return text
    except Exception as e:
        return _friendly_gemini_error(e)


def _safe_round_metric(value: object) -> float | None:
    if value is None:
        return None
    try:
        x = float(value)
    except (TypeError, ValueError):
        return None
    if x != x:
        return None
    return round(x, 1)


def prepare_llm_payload(flight_json: dict) -> dict:
    meta = flight_json.get("meta") or {}
    ma = flight_json.get("mission_analysis") or {}
    data = flight_json.get("data") or {}
    metrics = data.get("metrics") or {}

    out = {
        "system_info": {
            "firmware": meta.get("firmware_string"),
        },
        "mission_analysis": {
            "status": ma.get("mission_status", "Unknown"),
            "anomalies": ma.get("anomalies") or [],
        },
        "flight_metrics": {
            "duration_sec": _safe_round_metric(metrics.get("flight_duration_sec")),
            "total_distance_m": _safe_round_metric(metrics.get("total_distance_m")),
            "max_altitude_m": _safe_round_metric(metrics.get("max_altitude_m")),
            "max_horizontal_speed_m_s": _safe_round_metric(
                metrics.get("max_horizontal_speed_m_s")
            ),
            "max_vertical_speed_m_s": _safe_round_metric(
                metrics.get("max_vertical_speed_m_s")
            ),
            "max_acceleration_m_s2": _safe_round_metric(
                metrics.get("max_acceleration_m_s2")
            ),
        },
    }
    extra = data.get("extra_context")
    if isinstance(extra, dict) and extra:
        out["extra_context"] = extra
    return out
