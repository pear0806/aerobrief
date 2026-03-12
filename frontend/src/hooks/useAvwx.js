import { useState } from "react";

export const useAvwx = (icaoCode) => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchWeather = async (overrideIcao) => {
		const targetIcao = overrideIcao || icaoCode;
		if (!targetIcao) return;

		setLoading(true);
		setError(null);
		setData(null);

		try {
			const API_BASE_URL =
				import.meta.env.VITE_ENV_API_URL || "http://127.0.0.1:8000";
			const response = await fetch(
				`${API_BASE_URL}/api/weather/${targetIcao}`,
			);

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(
					errData.error || `無法獲取資料 (${response.status})`,
				);
			}

			const result = await response.json();
			setData(result);
		} catch (err) {
			setError(err.message);
			console.error("天氣 API 錯誤:", err);
		} finally {
			setLoading(false);
		}
	};

	return { data, loading, error, fetchWeather };
};
