import { convertPressure } from "../utils/converter.js";
import "../assets/styles/WeatherDashboard.css";

const WeatherDashboard = ({ data, pressureUnit, setPressureUnit }) => {
	if (!data) return null;

	const toggleUnit = () => {
		setPressureUnit((prev) => {
			return prev === "hPa" ? "inHg" : "hPa";
		});
	};

	return (
		<div className="weather-dashboard">
			<div className="dashboard-header">
				<h2>
					{data.station}
					{data.iata ? `(${data.iata})` : ""} 機場氣象
				</h2>
				<span className={`flight-rules rule-${data.flight_rules}`}>
					{data.flight_rules}
				</span>
			</div>

			<div className="metrics-grid">
				<div className="metric-item">
					<label>風向</label>
					<div className="value">
						{data.wind_direction.value == null
							? "VRB"
							: `${data.wind_direction.value}°`}
					</div>
				</div>
				<div className="metric-item">
					<label>風速</label>
					<div className="value">
						{data.wind_speed?.value}
						<small className="metricUnit">kts</small>
					</div>
				</div>
				<div className="metric-item">
					<label>能見度</label>
					<div className="value">
						{data.visibility?.value}
						<small className="metricUnit">sm</small>
					</div>
				</div>
				<div className="metric-item">
					<label>
						高度計
						<span
							className="togglePressureUnit"
							onClick={toggleUnit}
						>
							(切換單位)
						</span>
					</label>

					<div className="value">
						{convertPressure(data.altimeter?.value, pressureUnit)}
						<small className="metricUnit">{pressureUnit}</small>
					</div>
				</div>
			</div>

			<div className="raw-metar">
				<small>RAW METAR:</small>
				<code>{data.raw}</code>
			</div>
		</div>
	);
};

export default WeatherDashboard;
