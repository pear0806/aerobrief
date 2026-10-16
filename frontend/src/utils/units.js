// AVWX 的 units 欄位可能是 kt / mps / kmh 等；跑道風分量一律以 knots 計算。
const TO_KT = {
	kt: 1,
	kts: 1,
	mps: 1.94384,
	"m/s": 1.94384,
	kmh: 0.539957,
	"km/h": 0.539957,
};

export const toKnots = (value, unit) => {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	const f = TO_KT[String(unit ?? "kt").toLowerCase()];
	return Math.round(n * (f ?? 1));
};

export const windUnitLabel = (unit) => {
	const u = String(unit ?? "kt").toLowerCase();
	return u === "mps" || u === "m/s"
		? "m/s"
		: u === "kmh" || u === "km/h"
			? "km/h"
			: "kts";
};

export const visibilityLabel = (unit) => (unit ? unit : "");
