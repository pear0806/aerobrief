import "../assets/styles/NotamDashboard.css";

const NotamBoard = ({ notams }) => {
	if (!notams || notams.length === 0) {
		return (
			<div className="notam-board empty">
				<h3>📝 飛航公告 (NOTAM)</h3>
				<p>目前該機場沒有任何飛航公告。</p>
			</div>
		);
	}

	return (
		<div className="notam-board">
			<h3>📝 飛航公告 (NOTAM)</h3>
			<div className="notam-list">
				{notams.map((notam, index) => {
					let badgeClass = "badge-default";
					if (notam.category.includes("🚨"))
						badgeClass = "badge-danger";
					else if (
						notam.category.includes("🚧") ||
						notam.category.includes("⚠️")
					)
						badgeClass = "badge-warning";
					else if (
						notam.category.includes("📡") ||
						notam.category.includes("🛫") ||
						notam.category.includes("🚕")
					)
						badgeClass = "badge-info";

					return (
						<div key={index} className="notam-card">
							<div className="notam-header">
								<span className={`notam-badge ${badgeClass}`}>
									{notam.category}
								</span>
								<span className="notam-time">
									{notam.start_time} ➔ {notam.end_time}
								</span>
							</div>
							<div className="notam-body">
								<code>{notam.raw}</code>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default NotamBoard;
