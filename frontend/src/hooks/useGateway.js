import { useCallback, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// 使用者主動查詢給較長的時間（後端若在會休眠的主機上，冷啟動可能要十幾秒到數十秒）；
// 背景輪詢仍用短逾時，失敗就靜默保留舊資料。
export const FOREGROUND_TIMEOUT_MS = 20_000;
export const BACKGROUND_TIMEOUT_MS = 12_000;
export const SLOW_HINT_MS = 4_000; // 超過這個時間仍在等 → 顯示「伺服器較慢 / 喚醒中」
export const RETRY_DELAY_MS = 1_500;

const PROXY_RETRYABLE = new Set([502, 503, 504]);

class GatewayError extends Error {
	constructor(message, status, fromEnvelope) {
		super(message);
		this.status = status;
		this.fromEnvelope = fromEnvelope; // true = 後端自己回的 {success:false,error}（是明確答案，不重試）
	}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function requestOnce(action, payload, timeoutMs) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
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
			throw new GatewayError(
				body?.error?.message || `伺服器回應錯誤 (HTTP ${res.status})`,
				res.status,
				!!body?.error,
			);
		}
		return body.data;
	} finally {
		clearTimeout(timer);
	}
}

/** 連不上（TypeError）或 proxy 在後端喚醒期間回的 502/503/504（沒有我們的 JSON 外殼）才值得重試一次。 */
const isRetryable = (err) =>
	err instanceof TypeError ||
	(err instanceof GatewayError && !err.fromEnvelope && PROXY_RETRYABLE.has(err.status));

export function useGateway() {
	const [loading, setLoading] = useState(false);
	const [slow, setSlow] = useState(false);
	const [error, setError] = useState(null);

	// isBackground=true：背景輪詢，不顯示 loading、失敗時靜默（保留舊資料）、不重試
	const callGateway = useCallback(async (action, payload, isBackground = false) => {
		let slowTimer = null;
		if (!isBackground) {
			setLoading(true);
			setError(null);
			slowTimer = setTimeout(() => setSlow(true), SLOW_HINT_MS);
		}
		const timeout = isBackground ? BACKGROUND_TIMEOUT_MS : FOREGROUND_TIMEOUT_MS;

		try {
			try {
				return await requestOnce(action, payload, timeout);
			} catch (err) {
				if (isBackground || !isRetryable(err)) throw err;
				await sleep(RETRY_DELAY_MS);
				return await requestOnce(action, payload, timeout);
			}
		} catch (err) {
			if (!isBackground) {
				setError(err.name === "AbortError" ? "連線逾時，請稍後再試" : err.message);
			}
			return null;
		} finally {
			clearTimeout(slowTimer);
			if (!isBackground) {
				setLoading(false);
				setSlow(false);
			}
		}
	}, []);

	return { callGateway, loading, slow, error };
}
