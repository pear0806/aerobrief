import "../assets/styles/TafTimeline.css";

import { formatTafRange } from "../utils/time.js";
import { windUnitLabel } from "../utils/units.js";

const cloudText = (c) =>
	c.repr ?? `${c.type ?? ""}${String(c.altitude ?? "").padStart(3, "0")}`;
const isCeiling = (c) => c.type === "BKN" || c.type === "OVC" || c.type === "VV";

const TafTimeline = ({ tafData }) => {
	if (!tafData || !tafData.forecast || tafData.forecast.length === 0) {
		return null;
	}

	return (
		<div className="taf-section">
			<h2 className="section-title">⏱️ 機場天氣預報 (TAF)</h2>

			<div className="timeline-container">
				{tafData.forecast.map((period, index) => {
					const flightRules = period.flight_rules || "UNKNOWN";

					return (
						<div key={index} className="timeline-item">
							<div className="timeline-time">
								<div className="time-text">
									{formatTafRange(period.start_time?.repr, period.end_time?.repr)}
								</div>
								<div className="time-type">
									{period.type || "FM"}
									{period.probability?.value
										? ` PROB${period.probability.value}`
										: ""}
								</div>
							</div>

							<div className="timeline-divider">
								<div className={`timeline-dot rule-${flightRules}`}></div>
								{index !== tafData.forecast.length - 1 && (
									<div className="timeline-line"></div>
								)}
							</div>

							<div className="timeline-content">
								<div className="forecast-detail">
									<span className="icon">💨</span>
									{period.wind_direction?.value != null
										? `${period.wind_direction.repr ?? period.wind_direction.value}°`
										: "VRB"}{" "}
									/ {period.wind_speed?.value ?? 0}
									{period.wind_gust ? `G${period.wind_gust.value}` : ""}{" "}
									{windUnitLabel(tafData.units?.wind_speed)}
								</div>

								<div className="forecast-detail">
									<span className="icon">👁️</span>
									{period.visibility?.repr ?? "-"}
								</div>

								{period.clouds && period.clouds.length > 0 && (
									<div className="forecast-detail">
										<span className="icon">☁️</span>
										{period.clouds.map((c, i) => (
											<span
												key={i}
												className={isCeiling(c) ? "ceiling-layer" : ""}
												style={{ marginRight: 6 }}
											>
												{cloudText(c)}
											</span>
										))}
									</div>
								)}

								{period.wx_codes && period.wx_codes.length > 0 && (
									<div className="forecast-detail wx-warning">
										<span className="icon">⚠️</span>
										{period.wx_codes.map((wx) => wx.repr).join(", ")}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<div className="raw-info">
				<small>RAW TAF:</small>
				<code>{tafData.raw}</code>
			</div>
		</div>
	);
};

export default TafTimeline;
