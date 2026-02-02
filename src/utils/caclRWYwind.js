export const calculateCrossWind = (runwayHeading, windDirection, windSpeed) => {
	const angleDiff = windDirection - runwayHeading;

	const radians = angleDiff * (Math.PI / 180);

	const crosswind = Math.abs(Math.sin(radians) * windSpeed);
	const headwind = Math.cos(radians) * windSpeed;

	return {
		crosswind: Math.round(crosswind),
		headwind: Math.round(headwind),
	};
};
