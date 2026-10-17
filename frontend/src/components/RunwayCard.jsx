import "../assets/styles/RunwayCard.css";

import { AlertTriangle, Ban, CheckCircle2, Wind } from "lucide-react";

import WindCompass from "./WindCompass.jsx";

const RunwayCard = ({
	runwayName,
	heading,
	windDir,
	crosswind,
	headwind,
	crosswindGust,
	headwindGust,
	isHeadwind,
	isDanger,
	dangerMessage,
	index,
	isFirst,
	isClosed = false,
	approx = false,
}) => {
	const statusClass = isClosed
		? "closed"
		: isDanger
			? "danger"
			: isFirst
				? "recommended"
				: "normal";

	return (
		<div
			className={`panel-card runway-card-container card-enter ${statusClass}`}
			style={{ animationDelay: `${Math.min(index, 8) * 0.1}s` }}
		>
			<div className="runway-info-left">
				<h3 className="runway-title">
					跑道 {runwayName} ({approx ? "≈" : ""}
					{heading}°)
					{approx && (
						<span
							className="approx-tag"
							title="此跑道沒有精確方位資料，以跑道號碼 ×10（磁方位）估算，與 METAR 的真北風向有磁偏角誤差"
						>
							估算
						</span>
					)}
					{isFirst && !isDanger && !isClosed && (
						<span className="recommended-badge">
							<CheckCircle2 size={12} /> 最佳推薦
						</span>
					)}
				</h3>
				{isClosed ? (
					<span className="danger-message closed-message">
						<Ban size={14} /> {dangerMessage}
					</span>
				) : (
					isDanger && (
						<span className="danger-message">
							<AlertTriangle size={14} /> {dangerMessage}
						</span>
					)
				)}
			</div>

			<div className="runway-compass-center">
				<WindCompass runwayHeading={heading} windDir={windDir} />
			</div>

			<div className="runway-wind-right">
				<div className="wind-data">
					<small>
						<Wind size={12} /> 側風 (Cross)
					</small>
					<p className="wind-num">
						{crosswind ?? "—"} kts
						{crosswindGust != null && <small> (陣風 {crosswindGust})</small>}
					</p>
				</div>
				<div className="wind-data">
					<small>
						<Wind size={12} /> {isHeadwind ? "逆風 (Head)" : "順風 (Tail)"}
					</small>
					<p className="wind-num">
						{headwind == null ? "—" : Math.abs(headwind)} kts
						{headwindGust != null && (
							<small> (陣風 {Math.abs(headwindGust)})</small>
						)}
					</p>
				</div>
			</div>
		</div>
	);
};

export default RunwayCard;
