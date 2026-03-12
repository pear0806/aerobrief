import { useState } from "react";

export const useVatsim = (icao) => {
	const [controller, setController] = useState([]);
	const [vatsimLoading, setVatsimLoading] = useState(false);
	const [vatsimError, setVatsimError] = useState(null);
	const [arrivals, setArrivals] = useState([]);
	const [departures, setDepartures] = useState([]);

	const fetchVatsimData = async (overrideIcao) => {
		const targetIcao = overrideIcao || icao;

		if (!targetIcao) return;

		setVatsimLoading(true);
		setVatsimError(null);
		try {
			const API_BASE_URL =
				import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
			const response = await fetch(
				`${API_BASE_URL}/api/vatsim/${targetIcao}`,
			);
			if (!response.ok) throw new Error("fetch VATSIM data error");

			const data = await response.json();
			if (data.error) {
				throw new Error(data.error);
			}

			setController(data.controllers || []);
			setArrivals(data.arrivals || []);
			setDepartures(data.departures || []);
		} catch (err) {
			console.error(err);
			setVatsimError(err.message);
			setController([]);
			setArrivals([]);
			setDepartures([]);
		} finally {
			setVatsimLoading(false);
		}
	};

	return {
		controller,
		arrivals,
		departures,
		vatsimLoading,
		vatsimError,
		fetchVatsimData,
	};
};
