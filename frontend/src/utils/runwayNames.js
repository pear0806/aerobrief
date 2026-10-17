// 跑道名稱工具：對向跑道、NOTAM 關閉比對。

const IDENT = /^(\d{1,2})([LRC]?)$/i;

export const normalizeIdent = (s) => {
	const m = String(s ?? "")
		.trim()
		.match(IDENT);
	return m ? `${m[1].padStart(2, "0")}${m[2].toUpperCase()}` : null;
};

/** 05L → 23R、36 → 18、09C → 27C；無法解析回傳 null */
export const reciprocal = (name) => {
	const id = normalizeIdent(name);
	if (!id) return null;
	const n = parseInt(id.slice(0, 2), 10);
	const r = ((n + 17) % 36) + 1;
	const suffix = { L: "R", R: "L", C: "C" }[id.slice(2)] ?? "";
	return `${String(r).padStart(2, "0")}${suffix}`;
};

const base = (id) => id.replace(/[LRC]$/, "");

/**
 * 這條跑道（某一端）是否被 NOTAM 公告關閉？
 * closures = { aerodrome_closed, closed_runways: ["05L","23R"] | ["ALL"] }（後端 summarize_closures）
 * 跑道關閉是整條關閉：公告寫 05L 時，23R（對向）也視為關閉。
 */
export const isRunwayClosed = (name, closures) => {
	if (!closures) return false;
	if (closures.aerodrome_closed) return true;
	const list = (closures.closed_runways || []).map((x) =>
		x === "ALL" ? "ALL" : normalizeIdent(x),
	);
	if (list.includes("ALL")) return true;

	const set = new Set(list.filter(Boolean));
	const id = normalizeIdent(name);
	if (!id) return false;
	const rec = reciprocal(id);
	if (set.has(id) || (rec && set.has(rec))) return true;
	// 公告只寫 "RWY 05"（沒有 L/R）→ 視為整組 05x 與其對向
	return set.has(base(id)) || (rec ? set.has(base(rec)) : false);
};
