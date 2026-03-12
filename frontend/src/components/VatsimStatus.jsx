import "../assets/styles/VatsimStatus.css";

import { Headset, Radio } from "lucide-react";

const VatsimStatus = ({ controller, loading }) => {
	if (loading)
		return (
			<div
				className="panel-card vatsim-loading"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					color: "#94a3b8",
				}}
			>
				<Radio size={20} className="animate-pulse" /> 正在掃描 VATSIM
				頻率...
			</div>
		);

	return (
		<div className="panel-card vatsim-section">
			<h3
				className="section-title"
				style={{ display: "flex", alignItems: "center", gap: "8px" }}
			>
				<Headset size={20} color="#38bdf8" /> VATSIM 線上航管
				{controller.length > 0 && (
					<span
						className="live-badge"
						style={{
							marginLeft: "auto",
							fontSize: "0.8rem",
							backgroundColor: "#ef4444",
							color: "white",
							padding: "2px 8px",
							borderRadius: "12px",
						}}
					>
						● LIVE
					</span>
				)}
			</h3>

			<div className="vatsim-list">
				{controller.length > 0 ? (
					controller.map((atc, index) => (
						<div key={`${atc.cid}-${index}`} className="atc-card">
							<div className="atc-info">
								<span className="atc-callsign">
									{atc.callsign}
								</span>
								<span className="atc-name">{atc.name}</span>
							</div>
							<div className="atc-freq">{atc.frequency}</div>
						</div>
					))
				) : (
					<div className="no-atc">
						😴 目前無人值守 (UNICOM 122.800)
					</div>
				)}
			</div>
		</div>
	);
};

export default VatsimStatus;
