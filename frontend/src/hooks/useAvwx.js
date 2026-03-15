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
				import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
			const response = await fetch(
				`${API_BASE_URL}/api/weather/${targetIcao}`,
			);

			if (!response.ok) {
				throw new Error("failed to fetch AVWX data from backend");
			}

			const data = await response.json();
			if (data.error) {
				throw new Error(data.error);
			}

			setData(data);
		} catch (err) {
			console.error(err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return { data, loading, error, fetchWeather };
};
