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

		const token = "fbS-Td1ocFhLxSMbwkJ6Aw7QKuRI4DBxYv0pKaB-uMo";
		const headers = { Authorization: token };

		try {
			const [metarRes, stationRes] = await Promise.all([
				fetch(`https://avwx.rest/api/metar/${icaoCode}`, { headers }),
				fetch(`https://avwx.rest/api/station/${icaoCode}`, { headers }),
			]);

			if (!metarRes.ok) {
				throw new Error("fetch airport weather error");
			}

			if (!stationRes.ok) {
				throw new Error("fetch runway infomation error");
			}

			const metarData = await metarRes.json();
			const stationData = await stationRes.json();

			setData({
				...stationData,
				...metarData,
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
