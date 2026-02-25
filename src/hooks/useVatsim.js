import { useState } from "react";

export const useVatsim = (icao) => {
	const [controller, setController] = useState([]);
	const [vatsimLoading, setVatsimLoading] = useState(false);
	const [vatsimError, setVatsimError] = useState(null);
	const [arrivals, setArrivals] = useState([]);
	const [departures, setDepartures] = useState([]);

	const fetchVatsimData = async () => {
		if (!icao) return;

		setVatsimLoading(true);
		setVatsimError(null);
		try {
			const res = await fetch(
				"https://data.vatsim.net/v3/vatsim-data.json",
			);
			if (!res.ok) throw new Error("fetch VATSIM data error");

			const data = await res.json();
			console.log("vatsim data : ", data);

			// handle ATC list
			const airportController = data.controllers.filter((c) => {
				const callsign = c.callsign.toUpperCase();
				return callsign.startsWith(icao.toUpperCase() + "_");
			});

			const order = ["DEL", "GND", "TWR", "DEP", "APP", "CTR"];
			airportController.sort((a, b) => {
				const getSuffix = (cs) => cs.split("_").pop();
				const indexA = order.indexOf(getSuffix(a.callsign));
				const indexB = order.indexOf(getSuffix(b.callsign));
				return (
					(indexA === -1 ? 99 : indexA) -
					(indexB === -1 ? 99 : indexB)
				);
			});

			setController(airportController);

			// handle Pilot list
			const allPilots = data.pilots || [];
			let arrPilots = [];
			let depPilots = [];

			allPilots.forEach((pilot) => {
				if (pilot.flight_plan) {
					const FPL = pilot.flight_plan;
					const targetICAO = icao.toUpperCase();

					if (FPL.arrival === targetICAO) {
						arrPilots.push(pilot);
					}

					if (FPL.departure === targetICAO) {
						depPilots.push(pilot);
					}
				}
			});

			setArrivals(arrPilots);
			setDepartures(depPilots);
		} catch (err) {
			console.error(err);
			setVatsimError(err.message);
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
