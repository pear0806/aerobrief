import { useCallback, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const TIMEOUT_MS = 12000;

export function useGateway() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// isBackground=true：背景輪詢，不顯示 loading、失敗時靜默（保留舊資料）
	const callGateway = useCallback(
		async (action, payload, isBackground = false) => {
			if (!isBackground) {
				setLoading(true);
				setError(null);
			}

			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

			try {
				const res = await fetch(`${API_BASE_URL}/api/gateway`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action, payload }),
					signal: ctrl.signal,
				});

				let body = null;
				try {
					body = await res.json();
				} catch {
					/* 非 JSON 回應，交給下方錯誤處理 */
				}

				if (!res.ok || !body?.success) {
					throw new Error(
						body?.error?.message || `伺服器回應錯誤 (HTTP ${res.status})`,
					);
				}
				return body.data;
			} catch (err) {
				if (!isBackground) {
					setError(
						err.name === "AbortError" ? "連線逾時，請稍後再試" : err.message,
					);
				}
				return null;
			} finally {
				clearTimeout(timer);
				if (!isBackground) setLoading(false);
			}
		},
		[],
	);

	return { callGateway, loading, error };
}
