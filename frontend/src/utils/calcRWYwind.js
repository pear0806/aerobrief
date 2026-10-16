export const calculateCrosswind = (runwayHeading, windDirection, windSpeed) => {
	const radians = ((windDirection - runwayHeading) * Math.PI) / 180;
	// "+ 0" 把 -0 正規化成 0
	return {
		crosswind: Math.round(Math.abs(Math.sin(radians) * windSpeed)) + 0,
		headwind: Math.round(Math.cos(radians) * windSpeed) + 0,
	};
};
