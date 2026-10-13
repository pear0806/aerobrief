import { useCallback, useState } from "react";

export function useGateway() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const callGateway = useCallback(
		async (action, payload, isBackground = false) => {
			if (!isBackground) setLoading(true);
			setError(null);

			try {
				const API_BASE_URL =
					import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

				const res = await fetch(`${API_BASE_URL}/api/gateway`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action, payload }),
				});

				const data = await res.json();

				if (!data.success) {
					throw new Error(data.error?.message || "資料獲取失敗");
				}
				return data.data;
			} catch (err) {
				setError(err.message);
				return null;
			} finally {
				if (!isBackground) setLoading(false);
			}
		},
		[],
	);

	return { callGateway, loading, error };
}
