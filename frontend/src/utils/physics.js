const isNum = (x) => typeof x === "number" && Number.isFinite(x);

export const calculateDensityAltitude = (elev, qnh, temp) => {
	if (!isNum(elev) || !isNum(qnh) || qnh <= 0 || !isNum(temp)) return null;

	const qnhInHpa = qnh < 200 ? qnh * 33.8639 : qnh;
	const pressureAltitude = elev + (1013.25 - qnhInHpa) * 30;
	const isaTemp = 15 - (2 * elev) / 1000;
	return Math.round(pressureAltitude + 120 * (temp - isaTemp));
};

export const getPerformanceImpact = (da, elev) => {
	if (!isNum(da)) return { text: "N/A", color: "#64748b" };

	const diff = da - (isNum(elev) ? elev : 0);
	if (diff > 2000) return { text: "⚠️ 嚴重 (推力大減)", color: "#ef4444" };
	if (diff > 1000) return { text: "🔸 注意 (效能下降)", color: "#f59e0b" };
	return { text: "✅ 良好 (正常)", color: "#22c55e" };
};
