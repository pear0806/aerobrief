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
			// ✨ 直接打向我們剛寫好的 Python 本地端伺服器！
			// 不用再帶 Token，也不用 Promise.all 了
			const response = await fetch(
				`http://127.0.0.1:8000/api/weather/${targetIcao}`,
			);

			if (!response.ok) {
				// 捕捉後端傳來的 {"error": "..."} 訊息
				const errData = await response.json().catch(() => ({}));
				throw new Error(
					errData.error || `無法獲取資料 (${response.status})`,
				);
			}

			// 解析後端的 JSON
			const result = await response.json();

			// ✨ 因為 Python 後端已經把資料揉成前端要的形狀了，所以這裡只要一行！
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
