// 雷達底圖圖磚來源。
//
// CARTO 自 2026/8 下旬起要求 basemaps.cartocdn.com 帶免費 API key，
// 沒帶 key 的請求會被蓋上「API KEY REQUIRED」浮水印。
// - 設了 VITE_CARTO_KEY → 使用 CARTO dark_all（含 key）
// - 沒設            → 退回免 key 的 Esri 深色灰階底圖，地圖仍可正常使用
// 申請免費 key（免註冊、免審核）：https://carto.com/basemaps/apikey
// 注意：VITE_ 變數會打包進前端、瀏覽器看得到，這是圖磚 key 的正常用法，不是機密。

const CARTO_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
	'&copy; <a href="https://carto.com/attributions">CARTO</a>';

const ESRI_ATTRIBUTION =
	"Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ";

export const getTileConfig = (env = import.meta.env) => {
	const key = String(env?.VITE_CARTO_KEY ?? "").trim();

	if (key) {
		return {
			provider: "carto",
			url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
			attribution: CARTO_ATTRIBUTION,
			subdomains: "abcd",
			maxZoom: 20,
		};
	}

	return {
		provider: "esri",
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
		attribution: ESRI_ATTRIBUTION,
		subdomains: "abc", // 此來源不使用 {s}，保留預設值即可
		maxZoom: 16,
	};
};
