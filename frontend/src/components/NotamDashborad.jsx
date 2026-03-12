import "../assets/styles/NotamDashboard.css";

import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";

const NotamBoard = ({ notams }) => {
	const [expandedCategories, setExpandedCategories] = useState({});

	if (!notams || notams.length === 0) {
		return (
			<div className="panel-card notam-board empty">
				<h3 className="section-title">
					<FileText size={20} color="#38bdf8" /> 飛航公告 (NOTAM)
				</h3>
				<p style={{ color: "#94a3b8" }}>目前該機場沒有任何飛航公告。</p>
			</div>
		);
	}

	const groupedNotams = {};
	notams.forEach((notam) => {
		if (!groupedNotams[notam.category]) groupedNotams[notam.category] = [];
		groupedNotams[notam.category].push(notam);
	});

	const toggleCategory = (category) => {
		setExpandedCategories((prev) => ({
			...prev,
			[category]: !prev[category],
		}));
	};

	return (
		<div className="panel-card notam-board">
			<h3 className="section-title">
				<FileText size={20} color="#38bdf8" /> 飛航公告 (NOTAM)
			</h3>

			<div className="notam-groups">
				{Object.keys(groupedNotams).map((category) => {
					const categoryNotams = groupedNotams[category];
					const isExpanded = expandedCategories[category];

					let headerClass = "header-default";
					if (category.includes("🚨")) headerClass = "header-danger";
					else if (category.includes("🚧") || category.includes("⚠️"))
						headerClass = "header-warning";
					else if (
						category.includes("📡") ||
						category.includes("🛫") ||
						category.includes("🚕")
					)
						headerClass = "header-info";

					return (
						<div key={category} className="notam-category-group">
							<button
								className={`category-header ${headerClass}`}
								onClick={() => toggleCategory(category)}
							>
								<span className="category-title">
									{category}{" "}
									<span className="category-count">
										({categoryNotams.length})
									</span>
								</span>
								<ChevronDown
									size={18}
									className={`chevron ${isExpanded ? "open" : ""}`}
								/>
							</button>

							{isExpanded && (
								<div className="notam-list">
									{categoryNotams.map((notam, index) => (
										<div key={index} className="notam-card">
											<div className="notam-header">
												<span className="notam-time">
													🕒 {notam.start_time} ➔{" "}
													{notam.end_time}
												</span>
											</div>
											<div className="notam-body">
												<code>{notam.raw}</code>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default NotamBoard;
