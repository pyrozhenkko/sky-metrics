import google.generativeai as genai
import json
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os

load_dotenv()

genai.configure(api_key=os.getenv("GENAI_API_KEY"))


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


def generate_ai_report(llm_payload: dict) -> str:
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        generation_config = genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=FlightReport,
            temperature=0.2
        )

        response = model.generate_content(contents=[
            {"role": "user", "parts": [
                {"text": prompt1},
                {"text": f"Дані польоту: {json.dumps(llm_payload, ensure_ascii=False, indent=2)}"}
            ]}
        ],
        generation_config=generation_config)

        return response.text
    except Exception as e:
        return f"AI-аналіз тимчасово недоступний. Помилка: {str(e)}"


def prepare_llm_payload(flight_json: dict) -> dict:
    llm_payload = {
        "system_info": {
            "firmware": flight_json["meta"]["firmware_string"]
        },
        "mission_analysis": {
            "status": flight_json["mission_analysis"]["mission_status"],
            "anomalies": flight_json["mission_analysis"]["anomalies"]
        },
        "flight_metrics": {
            "duration_sec": round(flight_json["data"]["metrics"]["flight_duration_sec"], 1),
            "total_distance_m": round(flight_json["data"]["metrics"]["total_distance_m"], 1),
            "max_altitude_m": round(flight_json["data"]["metrics"]["max_altitude_m"], 1),
            "max_horizontal_speed_m_s": round(flight_json["data"]["metrics"]["max_horizontal_speed_m_s"], 1),
            "max_vertical_speed_m_s": round(flight_json["data"]["metrics"]["max_vertical_speed_m_s"], 1),
            "max_acceleration_m_s2": round(flight_json["data"]["metrics"]["max_acceleration_m_s2"], 1)
        }
    }
    return llm_payload
