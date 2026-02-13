import { useState } from "react";
import { formatRunways } from "../utils/RWYformatter.js";

export const useAvwx = (icaoCode) => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchWeather = async () => {
		if (!icaoCode) return;

		setLoading(true);
		setError(null);
		setData(null);

		const token = import.meta.env.VITE_AVWX_TOKEN;
		const headers = { Authorization: token };

		try {
			const [tafRes, metarRes, stationRes] = await Promise.all([
				fetch(`https://avwx.rest/api/taf/${icaoCode}`, { headers }),
				fetch(`https://avwx.rest/api/metar/${icaoCode}`, { headers }),
				fetch(`https://avwx.rest/api/station/${icaoCode}`, { headers }),
			]);

			if (!metarRes.ok) {
				throw new Error("fetch airport metar error");
			}

			if (!stationRes.ok) {
				throw new Error("fetch runway infomation error");
			}

			const metarData = await metarRes.json();
			const stationData = await stationRes.json();
			let tafData;

			if (tafRes.ok) {
				tafData = await tafRes.json();
			} else {
				tafData = null;
			}

			const temp = {
				taf: tafData,
				common: { ...stationData, ...metarData },
				runways: formatRunways(stationData.runways),
			};
			console.log(temp);

			setData({
				taf: tafData,
				common: { ...stationData, ...metarData },
				runways: formatRunways(stationData.runways),
			});
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return { data, loading, error, fetchWeather };
};
