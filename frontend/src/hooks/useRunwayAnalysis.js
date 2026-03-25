import { useMemo } from "react";

import { calculateCrosswind } from "../utils/calcRWYwind.js";

export const useRunwayAnalysis = (data, limits) => {
	const { CrossWindLimit, TailWindLimit, HeadWindLimit } = limits;

	return useMemo(() => {
		if (!data || !data.runways || data.runways.length === 0) {
			return { processedRunways: [], windDir: 0 };
		}

		const windSpd = data.common.wind_speed?.value || 0;
		const windDir = data.common.wind_direction?.value || 0;

		const proccessed = data.runways.map((rwy, index) => {
			const { crosswind, headwind } = calculateCrosswind(
				rwy.heading,
				windDir,
				windSpd,
			);

			let isDanger = false,
				isCrossWindDanger = false,
				isTailWindDanger = false,
				isHeadWindDanger = false,
				dangerMessage = "";

			if (crosswind > CrossWindLimit) isCrossWindDanger = true;
			if (headwind > 0 && headwind > HeadWindLimit)
				isHeadWindDanger = true;
			if (headwind < 0 && Math.abs(headwind) > TailWindLimit)
				isTailWindDanger = true;

			if (isCrossWindDanger || isTailWindDanger || isHeadWindDanger)
				isDanger = true;

			if (isCrossWindDanger && isTailWindDanger)
				dangerMessage = "⚠️ 側風、尾風超限";
			else if (isCrossWindDanger && isHeadWindDanger)
				dangerMessage = "⚠️ 側風、頂風超限";
			else if (isCrossWindDanger) dangerMessage = "⚠️ 側風超限";
			else if (isTailWindDanger) dangerMessage = "⚠️ 尾風超限";
			else if (isHeadWindDanger) dangerMessage = "⚠️ 頂風超限";

			return {
				name: rwy.name,
				heading: rwy.heading,
				crosswind,
				headwind,
				isDanger,
				dangerMessage,
				index,
			};
		});

		const sortedRunway = [...proccessed].sort(
			(a, b) => b.headwind - a.headwind,
		);
		const maxHeading =
			sortedRunway.length > 0 ? sortedRunway[0].headwind : 0;
		const bestHeading =
			sortedRunway.length > 0 ? sortedRunway[0].heading : 0;

		const finalRunways = sortedRunway.map((rwy) => {
			let diff = Math.abs(rwy.heading - bestHeading);
			if (diff > 180) diff = 360 - diff;
			return {
				...rwy,
				isFirst: rwy.headwind >= maxHeading - 2 && diff < 90,
			};
		});

		return { processedRunways: finalRunways, windDir };
	}, [data, CrossWindLimit, HeadWindLimit, TailWindLimit]);
};
