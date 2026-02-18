import { motion } from "framer-motion";
import { calculateCrossWind } from "../utils/caclRWYwind.js";
import "../assets/styles/RunwayCard.css";

const RunwayCard = ({
	runwayName,
	heading,
	windDir,
	windSpd,
	crossWindLimit,
	headWindLimit,
	tailWindLimit,
	index,
}) => {
	const { crosswind, headwind } = calculateCrossWind(
		heading,
		windDir,
		windSpd,
	);

	let isDanger = false,
		isCrossWindDanger,
		isTailWindDanger,
		isHeadWindDanger,
		dangerMessage;

	if (crosswind > crossWindLimit) {
		isCrossWindDanger = true;
	}

	if (headwind > 0 && headwind > headWindLimit) {
		isHeadWindDanger = true;
	}

	if (headwind < 0 && Math.abs(headwind) > tailWindLimit) {
		isTailWindDanger = true;
	}

	if (isCrossWindDanger || isTailWindDanger || isHeadWindDanger) {
		isDanger = true;
	}

	if (isCrossWindDanger && isTailWindDanger) {
		dangerMessage = "⚠️ 側風、尾風超限";
	} else if (isCrossWindDanger && isHeadWindDanger) {
		dangerMessage = "⚠️ 側風、頂風超限";
	} else if (isCrossWindDanger) {
		dangerMessage = "⚠️ 側風超限";
	} else if (isTailWindDanger) {
		dangerMessage = "⚠️ 尾風超限";
	} else if (isHeadWindDanger) {
		dangerMessage = "⚠️ 頂風超限";
	}

	const cardStyle = {
		border: isDanger ? "2px solid #e74c3c" : "2px solid #2ecc71",
		backgroundColor: isDanger ? "#fadbd8" : "#eafaf1",
		padding: "15px",
		borderRadius: "8px",
		marginBottom: "10px",
		color: "#333",
	};

	return (
		<motion.div
			className="runway-cards-container"
			style={cardStyle}
			initial={{ opacity: 0, y: 50 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{
				once: true,
				amount: 0.3,
			}}
			transition={{
				duration: 0.5,
				delay: index * 0.1,
				type: "spring",
				stiffness: 100,
			}}
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
		>
			<div className="runway-card">
				<h3>
					跑道 {runwayName} ({heading}°)
				</h3>
				{isDanger ? (
					<span style={{ color: "#c0392b", fontWeight: "bold" }}>
						{dangerMessage}
					</span>
				) : (
					""
				)}
			</div>

			<div className="wind-info">
				<div>
					<small>側風 (Crosswind)</small>
					<p className="wind-num">{crosswind} kts</p>
				</div>
				<div>
					<small>
						{headwind > 0 ? "逆風 (Headwind)" : "順風 (Tailwind)"}
					</small>
					<p className="wind-num">{Math.abs(headwind)} kts</p>
				</div>
			</div>
		</motion.div>
	);
};

export default RunwayCard;
