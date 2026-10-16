import { useMemo } from "react";

import { calculateCrosswind } from "../utils/calcRWYwind.js";
import { toKnots } from "../utils/units.js";

const EMPTY = {
	processedRunways: [],
	windDir: null,
	windSpeed: 0,
	windGust: null,
	isVariable: false,
	noSafeRunway: false,
};

const angleDiff = (a, b) => {
	const d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
};

export const useRunwayAnalysis = (data, limits) => {
	const { CrossWindLimit, TailWindLimit, HeadWindLimit } = limits;

	return useMemo(() => {
		if (!data?.common || !data.runways?.length) return EMPTY;

		const c = data.common;
		const unit = c.units?.wind_speed;
		const windSpeed = toKnots(c.wind_speed?.value ?? 0, unit);
		const windGust =
			c.wind_gust?.value != null ? toKnots(c.wind_gust.value, unit) : null;
		const peak = Math.max(windSpeed, windGust ?? 0);
		const rawDir = c.wind_direction?.value;
		const windDir = rawDir == null ? null : Number(rawDir);
		// 風向不定 (VRB) 且有風：無法算分量，採最壞情況（風速本身視為側風）
		const isVariable = windDir === null && peak > 0;

		const processed = data.runways.map((rwy, index) => {
			if (windDir === null) {
				const danger = isVariable && peak > CrossWindLimit;
				return {
					name: rwy.name,
					heading: rwy.heading,
					crosswind: null,
					headwind: null,
					crosswindGust: null,
					headwindGust: null,
					isDanger: danger,
					dangerMessage: danger ? "⚠️ 風向不定，風速超過側風限制" : "",
					index,
				};
			}

			const steady = calculateCrosswind(rwy.heading, windDir, windSpeed);
			const gusty =
				windGust !== null
					? calculateCrosswind(rwy.heading, windDir, windGust)
					: steady;

			const worstCross = Math.max(steady.crosswind, gusty.crosswind);
			const worstHead = Math.max(steady.headwind, gusty.headwind);
			const worstTail = Math.max(0, -steady.headwind, -gusty.headwind);

			const isCrossWindDanger = worstCross > CrossWindLimit;
			const isTailWindDanger = worstTail > TailWindLimit;
			const isHeadWindDanger = worstHead > HeadWindLimit;
			const isDanger =
				isCrossWindDanger || isTailWindDanger || isHeadWindDanger;

			const parts = [];
			if (isCrossWindDanger) parts.push("側風");
			if (isTailWindDanger) parts.push("尾風");
			if (isHeadWindDanger) parts.push("頂風");
			const gustTriggered =
				windGust !== null &&
				((isCrossWindDanger && steady.crosswind <= CrossWindLimit) ||
					(isTailWindDanger && -steady.headwind <= TailWindLimit));

			return {
				name: rwy.name,
				heading: rwy.heading,
				crosswind: steady.crosswind,
				headwind: steady.headwind,
				crosswindGust: windGust !== null ? gusty.crosswind : null,
				headwindGust: windGust !== null ? gusty.headwind : null,
				isDanger,
				dangerMessage: isDanger
					? `⚠️ ${parts.join("、")}超限${gustTriggered ? "（陣風）" : ""}`
					: "",
				index,
			};
		});

		const sorted = [...processed].sort(
			(a, b) => (b.headwind ?? -999) - (a.headwind ?? -999),
		);

		// 只從「未超限」的跑道挑推薦；全部超限時不推薦任何一條
		const safe = sorted.filter((r) => !r.isDanger && r.headwind !== null);
		const best = safe[0];
		const finalRunways = sorted.map((rwy) => ({
			...rwy,
			isFirst:
				!!best &&
				!rwy.isDanger &&
				rwy.headwind !== null &&
				rwy.headwind >= best.headwind - 2 &&
				angleDiff(rwy.heading, best.heading) < 90,
		}));

		return {
			processedRunways: finalRunways,
			windDir,
			windSpeed,
			windGust,
			isVariable,
			noSafeRunway: !best && !(windDir === null && !isVariable),
		};
	}, [data, CrossWindLimit, HeadWindLimit, TailWindLimit]);
};
