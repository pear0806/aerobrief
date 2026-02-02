export const formatRunways = (rawRunways) => {
	if (!rawRunways || !Array.isArray(rawRunways)) return [];

	const formatted = [];

	rawRunways.forEach((rwy) => {
		if (rwy.ident1) {
			formatted.push({
				name: rwy.ident1,
				heading: Math.round(rwy.bearing1),
			});
		}
		if (rwy.ident2) {
			formatted.push({
				name: rwy.ident2,
				heading: Math.round(rwy.bearing2),
			});
		}
	});

	return formatted.sort((a, b) => a.name.localeCompare(b.name));
};
