import { convertPressure } from "../utils/converter.js";
import {
	calculateDensityAltitude,
	getPerformanceImpact,
} from "../utils/physics.js";
import "../assets/styles/WeatherDashboard.css";

const WeatherDashboard = ({ data, pressureUnit, setPressureUnit }) => {
	if (!data) return null;

	const toggleUnit = () => {
		setPressureUnit((prev) => {
			return prev === "hPa" ? "inHg" : "hPa";
		});
	};

	const elev = data.common.elevation_ft;
	const qnh = data.common.altimeter?.value;
	const temp = data.common.temperature?.value;

	const da = calculateDensityAltitude(elev, qnh, temp);
	const impact = getPerformanceImpact(da, elev);

	return (
		<div className="weather-dashboard">
			<div className="dashboard-header">
				<h2>
					{data.common.station}
					{data.common.iata ? `(${data.common.iata})` : ""} 機場氣象
				</h2>
				<span
					className={`flight-rules rule-${data.common.flight_rules}`}
				>
					{data.common.flight_rules}
				</span>
			</div>

			<div className="metrics-grid">
				<div className="metric-item">
					<label>風向</label>
					<div className="value">
						{data.common.wind_direction.value == null
							? "VRB"
							: `${data.common.wind_direction.value}°`}
					</div>
				</div>
				<div className="metric-item">
					<label>風速</label>
					<div className="value">
						{data.common.wind_speed?.value}
						<small className="metricUnit">kts</small>
					</div>
				</div>
				<div className="metric-item">
					<label>能見度</label>
					<div className="value">
						{data.common.visibility?.value}
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
							切換單位
						</span>
					</label>

					<div className="value">
						{convertPressure(
							data.common.altimeter?.value,
							pressureUnit,
						)}
						<small className="metricUnit">{pressureUnit}</small>
					</div>
				</div>

				<div className="metric-item">
					<label>溫度</label>
					<div className="value">
						{data.common.temperature?.value}
						<small className="metricUnit">°c</small>
					</div>
				</div>

				<div
					className="metric-item"
					style={{ borderLeft: `4px solid ${impact.color}` }}
				>
					<label>密度高度 (DA)</label>
					<div className="value">
						{da ? da.toLocaleString() : "N/A"}
						<small className="metricUnit">ft</small>
					</div>
					<div
						style={{
							fontSize: "0.8rem",
							color: impact.color,
							marginTop: "4px",
						}}
					>
						{impact.text}
					</div>
				</div>
			</div>

			<div className="raw-info">
				<small>RAW METAR:</small>
				<code>{data.common.raw}</code>
			</div>
		</div>
	);
};

export default WeatherDashboard;
