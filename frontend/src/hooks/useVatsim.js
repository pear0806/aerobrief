import { useEffect, useRef, useState } from "react";

export const useVatsim = (icao) => {
	const [controller, setController] = useState();
	const [vatsimLoading, setVatsimLoading] = useState(false);
	const [vatsimError, setVatsimError] = useState(null);
	const [arrivals, setArrivals] = useState();
	const [departures, setDepartures] = useState();
	const [cruisings, setCruisings] = useState();
	const currentIcaoRef = useRef(icao);

	useEffect(() => {
		currentIcaoRef.current = icao;
	}, [icao]);

	const fetchVatsimData = async (isBackgroundUpdate = false) => {
		const targetIcao = currentIcaoRef.current;
		if (!targetIcao) return;

		if (!isBackgroundUpdate) {
			setVatsimLoading(true);
		}

		setVatsimError(null);

		try {
			const API_BASE_URL =
				import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
			const response = await fetch(
				`${API_BASE_URL}/api/vatsim/${targetIcao}`,
			);

			if (!response.ok)
				throw new Error("failed to fetch vatsim data from backend");

			const data = await response.json();
			if (data.error) {
				throw new Error(data.error);
			}

			const arrivals = data.arrivals || [];
			const departures = data.departures || [];
			const cruisings = data.cruisings || [];

			const arrAndDepCids = new Set([
				...arrivals.map((p) => p.cid),
				...departures.map((p) => p.cid),
			]);

			cruisings.filter((p) => !arrAndDepCids.has(p.cid));

			setController(data.controllers || []);
			setArrivals(arrivals);
			setDepartures(departures);
			setCruisings(cruisings);
		} catch (err) {
			console.error(err);
			setVatsimError(err.message);
			setController([]);
			setArrivals([]);
			setDepartures([]);
			setCruisings([]);
		} finally {
			if (!isBackgroundUpdate) {
				setVatsimLoading(false);
			}
		}
	};

	useEffect(() => {
		if (!currentIcaoRef.current) return;

		const intervalId = setInterval(() => {
			fetchVatsimData(currentIcaoRef.current, true);
		}, 15000);

		return () => clearInterval(intervalId);
	}, [icao]);

	return {
		controller,
		arrivals,
		departures,
		cruisings,
		vatsimLoading,
		vatsimError,
		fetchVatsimData,
	};
};
