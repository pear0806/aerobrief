export const calculateDensityAltitude = (elev, qnh, temp) => {
	if (elev === null || elev === undefined || !qnh || temp === null) {
		return null;
	} else {
		const qnhInHpa = qnh < 200 ? qnh * 33.8639 : qnh;
		const pressureAltitude = elev + (1013.25 - qnhInHpa) * 30;
		const isaTemp = 15 - (2 * elev) / 1000;
		const densityAltitude = pressureAltitude + 120 * (temp - isaTemp);
		return Math.round(densityAltitude);
	}
};

export const getPerformanceImpact = (da, elev) => {
	if (da === null || da === undefined)
		return { text: "N/A", color: "#64748b" };

	const diff = da - elev;

	if (diff > 2000) {
		return { text: "⚠️ 嚴重 (推力大減)", color: "#ef4444" };
	} else if (diff > 1000) {
		return { text: "🔸 注意 (效能下降)", color: "#f59e0b" };
	} else {
		return { text: "✅ 良好 (正常)", color: "#22c55e" };
	}
};
