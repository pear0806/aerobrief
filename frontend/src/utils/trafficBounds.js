// 雷達初始視野：涵蓋機場 + 附近的抵達 / 離場航班（排除遠方巡航機，否則會把地圖縮到看不清楚）。

export const FIT_RADIUS_KM = 300;

export const distanceKm = ([lat1, lon1], [lat2, lon2]) => {
	const rad = (d) => (d * Math.PI) / 180;
	const a =
		Math.sin(rad(lat2 - lat1) / 2) ** 2 +
		Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
	return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** 回傳要放進視野的座標陣列 [[lat,lon],…]（含機場）；附近沒有航班時回傳 null。 */
export const computeTrafficBounds = (center, pilots, radiusKm = FIT_RADIUS_KM) => {
	const near = (pilots || [])
		.filter((p) => !p.isCruising && p.latitude != null && p.longitude != null)
		.map((p) => [p.latitude, p.longitude])
		.filter((pt) => distanceKm(center, pt) <= radiusKm);
	return near.length ? [center, ...near] : null;
};
