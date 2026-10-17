// 資料新鮮度與時間顯示。

export const ageMinutes = (iso, nowMs = Date.now()) => {
	const t = Date.parse(iso);
	return Number.isFinite(t) ? Math.max(0, Math.round((nowMs - t) / 60000)) : null;
};

export const formatAge = (min) => {
	if (min == null) return "未知";
	if (min < 1) return "剛剛";
	if (min < 60) return `${min} 分鐘前`;
	const h = Math.floor(min / 60);
	const m = min % 60;
	return m ? `${h} 小時 ${m} 分鐘前` : `${h} 小時前`;
};

/** AVWX TAF 的 repr 是 ddhh（例如 "1606" = 16 日 06Z）。直接加 "z" 容易被誤讀成 hhmm。 */
export const formatTafTime = (repr) => {
	const m = String(repr ?? "").match(/^(\d{2})(\d{2})$/);
	return m ? `${m[1]}日 ${m[2]}Z` : repr ? `${repr}Z` : "?";
};

export const METAR_WARN_MIN = 70; // METAR 通常每 30~60 分鐘一次
export const METAR_STALE_MIN = 90;
export const FETCH_STALE_MIN = 10; // 背景更新連續失敗的提示門檻
