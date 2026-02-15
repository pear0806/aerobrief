import { useState } from "react";

export const useVatsim = (icao) => {
	const [controller, setController] = useState([]);
	const [vatsimLoading, setVatsimLoading] = useState(false);
	const [vatsimError, setVatsimError] = useState(null);

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
		} catch (err) {
			console.error(err);
			setVatsimError(err.message);
		} finally {
			setVatsimLoading(false);
		}
	};

	return { controller, vatsimLoading, vatsimError, fetchVatsimData };
};
