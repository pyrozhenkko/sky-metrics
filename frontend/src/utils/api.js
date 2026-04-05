import { generateMockResponse } from './mockData';

export async function callApi(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("jwt_token");

    const response = await fetch('http://localhost:8080/api/flights/upload', {
      method: 'POST',
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Помилка сервера: ${response.status}`);
    }

    const data = await response.json();

    if (!data.metrics || !data.trajectory) {
      throw new Error('Невірний формат відповіді від сервера (відсутні метрики або траєкторія)');
    }

    // Wrap in standard response format for FlightDashboard.jsx which expects `response.data.metrics`
    return {
      status: "success",
      data: data
    };
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
}
