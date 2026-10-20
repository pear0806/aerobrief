// 頁首「決策摘要」：把風、建議跑道、NOTAM 關閉、ATC 在線整合成一眼可讀的結論。
import { windUnitLabel } from "./units.js";

export const REASON_TEXT = {
	aerodrome: "NOTAM 公告機場關閉",
	closed: "所有跑道都被 NOTAM 公告關閉",
	wind: "所有跑道都超出風速限制",
};

export const formatWind = ({ windDir, windSpeed, windGust, isVariable }, unit) => {
	if (windSpeed == null) return "風資料不可用";
	if (!windSpeed && !isVariable) return "靜風";
	const dir =
		isVariable || windDir == null
			? "VRB"
			: `${String(Math.round(windDir)).padStart(3, "0")}°`;
	return `${dir} ${windSpeed}${windGust ? `G${windGust}` : ""} ${windUnitLabel(unit)}`;
};

export const closedRunwayText = (closures) => {
	if (!closures) return null;
	if (closures.aerodrome_closed) return "機場關閉";
	const list = closures.closed_runways || [];
	if (list.includes("ALL")) return "全部跑道";
	return list.length ? list.join(" / ") : null;
};

const num = (v) => (Number.isFinite(v) ? Math.round(Math.abs(v)) : null);

export const buildSummary = ({ weather, analysis, closures, atcCount }) => {
	const best = (analysis?.processedRunways || []).find((r) => r.isFirst) || null;
	const reason = analysis?.noSafeReason || null;
	const closedText = closedRunwayText(closures);
	const rules = String(weather?.flight_rules || "").toUpperCase();

	const tone = reason ? "danger" : closedText || rules === "IFR" || rules === "LIFR" ? "warn" : "ok";

	return {
		tone,
		flightRules: rules || null,
		windText: formatWind(analysis || {}, weather?.units?.wind_speed),
		runway: best && {
			name: best.name,
			wind:
				best.headwind == null
					? null
					: `${best.headwind >= 0 ? "頂風" : "順風"} ${num(best.headwind)} · 側風 ${num(best.crosswind) ?? 0}`,
		},
		reason: reason ? REASON_TEXT[reason] : null,
		closedText,
		atcCount: atcCount || 0,
	};
};
