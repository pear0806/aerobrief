import "../assets/styles/AircraftSelector.css";

import { AIRCRAFT_LIMITS_NOTICE, aircraftDatabase } from "../data/aircrafts";

const AircraftSelector = ({ aircraft, onSelect }) => (
	<div className="aircraft-dropdown">
		<label htmlFor="aircraft-select">✈️ 快速載入機型限制：</label>
		<select
			id="aircraft-select"
			value={aircraft}
			onChange={(e) => onSelect(e.target.value)}
			className="aircraft-select"
		>
			{Object.entries(aircraftDatabase).map(([key, aircraftData]) => (
				<option key={key} value={key}>
					{aircraftData.name}({key})
				</option>
			))}
		</select>
		<small className="aircraft-notice">{AIRCRAFT_LIMITS_NOTICE}</small>
	</div>
);

export default AircraftSelector;
