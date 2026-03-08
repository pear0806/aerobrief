import "../assets/styles/TafTimeline.css";

const TafTimeline = ({ tafData }) => {
	if (!tafData || !tafData.forecast || tafData.forecast.length === 0) {
		return null;
	}

	return (
		<div className="taf-section">
			<h3 className="section-title">⏱️ 機場天氣預報 (TAF)</h3>

			<div className="timeline-container">
				{tafData.forecast.map((period, index) => {
					const flightRules = period.flight_rules || "UNKNOWN";

					return (
						<div key={index} className="timeline-item">
							<div className="timeline-time">
								<div className="time-text">
									{period.start_time?.repr}z -{" "}
									{period.end_time?.repr}z
								</div>
								<div className="time-type">
									{period.type || "FM"}{" "}
								</div>
							</div>

							<div className="timeline-divider">
								<div
									className={`timeline-dot rule-${flightRules}`}
								></div>
								{index !== tafData.forecast.length - 1 && (
									<div className="timeline-line"></div>
								)}
							</div>

							<div className="timeline-content">
								<div className="forecast-detail">
									<span className="icon">💨</span>
									{period.wind_direction?.repr || "VRB"}° /{" "}
									{period.wind_speed?.value || 0}
									{period.wind_gust
										? `G${period.wind_gust.value}`
										: ""}{" "}
									kts
								</div>

								<div className="forecast-detail">
									<span className="icon">👁️</span>
									{period.visibility?.repr || "9999"}
								</div>

								{period.wx_codes &&
									period.wx_codes.length > 0 && (
										<div className="forecast-detail wx-warning">
											<span className="icon">⚠️</span>
											{period.wx_codes
												.map((wx) => wx.repr)
												.join(", ")}
										</div>
									)}
							</div>
						</div>
					);
				})}
			</div>

			<div className="raw-info" style={{ marginTop: "15px" }}>
				<small>RAW TAF:</small>
				<code>{tafData.raw}</code>
			</div>
		</div>
	);
};

export default TafTimeline;
