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
	let borderColor = isDanger
		? "rgba(239, 68, 68, 0.5)"
		: isFirst
			? "rgba(56, 189, 248, 0.5)"
			: "rgba(34, 197, 94, 0.3)";
	let shadow =
		isFirst && !isDanger ? "0 0 15px rgba(56, 189, 248, 0.2)" : "none";
	let hoverBorder = isDanger ? "#ef4444" : isFirst ? "#38bdf8" : "#22c55e";

	return (
		<motion.div
			className="panel-card runway-card-container"
			style={{
				border: `1px solid ${borderColor}`,
				padding: "20px",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: "15px",
				boxShadow: shadow,
				marginBottom: "0",
			}}
			initial={{ opacity: 0, y: 30 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.3 }}
			transition={{ duration: 0.4, delay: index * 0.1 }}
			whileHover={{ scale: 1.02, borderColor: hoverBorder }}
		>
			<div className="runway-card" style={{ flex: 1, minWidth: "220px" }}>
				<h3
					style={{
						margin: "0 0 8px 0",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						fontSize: "1.2rem",
						color: "#f8fafc",
						flexWrap: "wrap",
					}}
				>
					跑道 {runwayName} ({heading}°)
					{isFirst && !isDanger && (
						<span
							style={{
								fontSize: "0.75rem",
								backgroundColor: "rgba(56, 189, 248, 0.1)",
								color: "#38bdf8",
								border: "1px solid #38bdf8",
								padding: "2px 8px",
								borderRadius: "12px",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
						>
							<CheckCircle2 size={12} /> 最佳推薦
						</span>
					)}
				</h3>
				{isDanger && (
					<span
						style={{
							color: "#ef4444",
							fontSize: "0.9rem",
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<AlertTriangle size={14} /> {dangerMessage}
					</span>
				)}
			</div>

			<div
				style={{
					flexShrink: 0,
					display: "flex",
					justifyContent: "center",
				}}
			>
				<WindCompass runwayHeading={heading} windDir={windDir} />
			</div>

			<div
				className="wind-info"
				style={{
					flex: 1,
					minWidth: "220px",
					display: "flex",
					justifyContent: "flex-end",
					gap: "20px",
					color: "#94a3b8",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-end",
					}}
				>
					<small
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Wind size={12} /> 側風 (Cross)
					</small>
					<p
						className="wind-num"
						style={{
							margin: "4px 0 0 0",
							color: "#f8fafc",
							fontSize: "1.1rem",
							fontWeight: "bold",
						}}
					>
						{crosswind} kts
					</p>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-end",
					}}
				>
					<small
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Wind size={12} />{" "}
						{isHeadwind ? "逆風 (Head)" : "順風 (Tail)"}
					</small>
					<p
						className="wind-num"
						style={{
							margin: "4px 0 0 0",
							color: "#f8fafc",
							fontSize: "1.1rem",
							fontWeight: "bold",
						}}
					>
						{Math.abs(headwind)} kts
					</p>
				</div>
			</div>
		</motion.div>
	);
};

export default RunwayCard;
