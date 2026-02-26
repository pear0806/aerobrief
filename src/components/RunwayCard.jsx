import { motion } from "framer-motion";
import "../assets/styles/RunwayCard.css";
import "./WindCompass.jsx";
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
	const cardStyle = {
		border: isDanger
			? "2px solid #e74c3c"
			: isFirst
				? "2px solid #38bdf8"
				: "2px solid #2ecc71",
		backgroundColor: isDanger ? "#fadbd8" : "#eafaf1",
		padding: "15px",
		borderRadius: "8px",
		marginBottom: "10px",
		color: "#333",
	};

	return (
		<motion.div
			className="runway-card-container"
			style={{
				...cardStyle,
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: "10px",
				boxShadow:
					isFirst && !isDanger
						? "0 0 12px rgba(56, 189, 248, 0.4)"
						: "none",
			}}
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
					{isFirst && !isDanger ? (
						<span
							style={{
								fontSize: "0.75rem",
								backgroundColor: "#38bdf8",
								color: "white",
								padding: "2px 8px",
								borderRadius: "12px",
								marginLeft: "8px",
								verticalAlign: "middle",
								boxShadow: "0 2px 4px rgba(56, 189, 248, 0.3)",
							}}
						>
							✨ 最佳推薦
						</span>
					) : (
						<></>
					)}
				</h3>
				{isDanger ? (
					<span style={{ color: "#c0392b", fontWeight: "bold" }}>
						{dangerMessage}
					</span>
				) : (
					""
				)}
			</div>

			<WindCompass
				runwayHeading={heading}
				windDir={windDir}
			></WindCompass>

			<div className="wind-info">
				<div>
					<small>側風 (Crosswind)</small>
					<p className="wind-num">{crosswind} kts</p>
				</div>
				<div>
					<small>
						{isHeadwind ? "逆風 (Headwind)" : "順風 (Tailwind)"}
					</small>
					<p className="wind-num">{Math.abs(headwind)} kts</p>
				</div>
			</div>
		</motion.div>
	);
};

export default RunwayCard;
