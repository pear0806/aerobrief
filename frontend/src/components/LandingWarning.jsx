import "../assets/styles/LandingWarning.css";

const MinimaWarning = ({ data }) => {
	if (!data || !data.common) return null;

	const flightRules = data.common.flight_rules;
	const visibility = data.common.visibility?.repr || "未知";

	const clouds = data.common.clouds || [];
	const lowestCloud = clouds.find(
		(c) => c.type === "BKN" || c.type === "OVC" || c.type === "VV",
	);
	const ceiling = lowestCloud
		? `${lowestCloud.altitude * 100} ft`
		: "無顯著雲層";

	if (flightRules !== "IFR" && flightRules !== "LIFR") {
		return null;
	}

	return (
		<div
			className={`minima-warning-container ${flightRules.toLowerCase()}-alert`}
		>
			<div className="warning-icon">
				{flightRules === "LIFR" ? "🚨" : "⚠️"}
			</div>

			<div className="warning-content">
				<h4 className="warning-title">
					{flightRules === "LIFR"
						? "低儀器飛行條件 (LIFR) - 嚴重天氣警告"
						: "儀器飛行條件 (IFR) - 注意起降標準"}
				</h4>

				<p className="warning-text">
					{flightRules === "LIFR"
						? "目前機場能見度低於 1 哩，或雲底高度低於 500 呎。"
						: "目前天氣低於目視標準。必須執行儀器進場程序 (ILS/RNAV)。"}
				</p>

				<div className="warning-details">
					<span>
						👁️ 能見度: <strong>{visibility}</strong>
					</span>
					<span>
						☁️ 雲幕高度 (Ceiling): <strong>{ceiling}</strong>
					</span>
				</div>
			</div>
		</div>
	);
};

export default MinimaWarning;
