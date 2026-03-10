import "../assets/styles/AircraftSelector.css";

import { aircraftDatabase } from "../data/aircrafts";

const AircraftSelector = ({
	aircraft,
	setAircraft,
	setCrossWindLimit,
	setTailWindLimit,
	setHeadWindLimit,
}) => {
	const handleAirCraftChange = (e) => {
		const selected = e.target.value;
		setAircraft(selected);
		const data = aircraftDatabase[selected];
		if (selected !== "CUSTOM") {
			setCrossWindLimit(data.cross);
			setTailWindLimit(data.tail);
			setHeadWindLimit(data.head);
		}
	};

	return (
		<div className="aircraft-dropdown">
			<label>✈️ 快速載入機型限制：</label>
			<select
				value={aircraft}
				onChange={handleAirCraftChange}
				className="aircraft-select"
			>
				{Object.entries(aircraftDatabase).map(([key, aircraftData]) => (
					<option key={key} value={key}>
						{aircraftData.name}({key})
					</option>
				))}
			</select>
		</div>
	);
};

export default AircraftSelector;
