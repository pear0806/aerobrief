const HPA_PER_INHG = 33.8639;

const normalize = (u) => {
	const s = String(u ?? "").toLowerCase();
	return s === "inhg"
		? "inHg"
		: s === "hpa" || s === "mb" || s === "mbar"
			? "hPa"
			: null;
};

/**
 * value: 氣壓數值；targetUnit: "hPa" | "inHg"；sourceUnit: 資料本身單位（AVWX units.altimeter）。
 * 沒給 sourceUnit 時以數值大小推斷（<200 視為 inHg）。
 */
export const convertPressure = (value, targetUnit, sourceUnit) => {
	if (value == null || value === "") return "-";
	const n = Number(value);
	if (!Number.isFinite(n)) return "-";

	const src = normalize(sourceUnit) || (n < 200 ? "inHg" : "hPa");
	if (src === targetUnit) return targetUnit === "inHg" ? n.toFixed(2) : n;
	return targetUnit === "inHg"
		? (n / HPA_PER_INHG).toFixed(2)
		: Math.round(n * HPA_PER_INHG);
};
