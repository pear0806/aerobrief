const headingOf = (ident, bearing) => {
	if (Number.isFinite(bearing)) return Math.round(bearing) % 360;
	const m = String(ident).match(/^\d{1,2}/);
	return m ? (parseInt(m[0], 10) * 10) % 360 : null;
};

export const formatRunways = (rawRunways) => {
	if (!rawRunways || !Array.isArray(rawRunways)) return [];

	const formatted = [];
	rawRunways.forEach((rwy) => {
		for (const n of ["1", "2"]) {
			const name = rwy[`ident${n}`];
			if (!name) continue;
			const heading = headingOf(name, rwy[`bearing${n}`]);
			if (heading !== null) formatted.push({ name, heading });
		}
	});

	return formatted.sort((a, b) => a.name.localeCompare(b.name));
};
