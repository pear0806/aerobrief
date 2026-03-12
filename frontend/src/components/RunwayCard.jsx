import "../assets/styles/RunwayCard.css";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Wind } from "lucide-react";

import WindCompass from "./WindCompass.jsx";

const RunwayCard = ({
	runwayName,
	heading,
	windDir,
	crosswind,
	headwind,
	isHeadwind,
	isDanger,
	dangerMessage,
	index,
	isFirst,
}) => {
	let statusClass = isDanger ? "danger" : isFirst ? "recommended" : "normal";

	return (
		<motion.div
			className={`panel-card runway-card-container ${statusClass}`}
			initial={{ opacity: 0, y: 30 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.3 }}
			transition={{ duration: 0.4, delay: index * 0.1 }}
		>
			<div className="runway-info-left">
				<h3 className="runway-title">
					跑道 {runwayName} ({heading}°)
					{isFirst && !isDanger && (
						<span className="recommended-badge">
							<CheckCircle2 size={12} /> 最佳推薦
						</span>
					)}
				</h3>
				{isDanger && (
					<span className="danger-message">
						<AlertTriangle size={14} /> {dangerMessage}
					</span>
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
					<p className="wind-num">{crosswind} kts</p>
				</div>
				<div className="wind-data">
					<small>
						<Wind size={12} />{" "}
						{isHeadwind ? "逆風 (Head)" : "順風 (Tail)"}
					</small>
					<p className="wind-num">{Math.abs(headwind)} kts</p>
				</div>
			</div>
		</motion.div>
	);
};

export default RunwayCard;
