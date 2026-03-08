import "../assets/styles/VatsimStatus.css";

const VatsimStatus = ({ controller, loading }) => {
	if (loading)
		return <div className="vatsim-loading">📡 正在掃描 VATSIM 頻率...</div>;

	return (
		<div className="vatsim-section">
			<h3 className="section-title">
				VATSIM 線上航管
				{controller.length > 0 && (
					<span className="live-badge">● LIVE</span>
				)}
			</h3>

			<div className="vatsim-list">
				{controller.length > 0 ? (
					controller.map((atc) => (
						<div key={atc.cid} className="atc-card">
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
