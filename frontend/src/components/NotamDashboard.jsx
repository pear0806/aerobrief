import "../assets/styles/NotamDashboard.css";

import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";

const NotamBoard = ({ notams }) => {
	const [expandedCategories, setExpandedCategories] = useState({});

	if (!notams || notams.length === 0) {
		return (
			<div className="panel-card notam-board empty">
				<h2 className="section-title">
					<FileText size={20} color="#38bdf8" /> 飛航公告 (NOTAM)
				</h2>
				<p style={{ color: "#94a3b8" }}>目前該機場沒有任何飛航公告。</p>
			</div>
		);
	}

	// 尚未生效的公告獨立成群組，避免「10/23 才開始的滑行道封閉」被當成現行封閉
	const UPCOMING = "｜尚未生效";
	const groupedNotams = {};
	notams.forEach((notam) => {
		const key =
			notam.state === "upcoming"
				? `${notam.category}${UPCOMING}`
				: notam.category;
		if (!groupedNotams[key]) groupedNotams[key] = [];
		groupedNotams[key].push(notam);
	});

	// 預設展開「現行有效」的關閉類公告（🚨 機場/跑道關閉、🚧 滑行道關閉），
	// 其餘維持收合；使用者手動切換後以使用者選擇為準。
	const isOpen = (category) => {
		if (category in expandedCategories) return expandedCategories[category];
		return (
			!category.endsWith(UPCOMING) &&
			(category.includes("🚨") || category.includes("🚧"))
		);
	};

	const toggleCategory = (category) => {
		setExpandedCategories((prev) => ({
			...prev,
			[category]: !isOpen(category),
		}));
	};

	return (
		<div className="panel-card notam-board">
			<h2 className="section-title">
				<FileText size={20} color="#38bdf8" /> 飛航公告 (NOTAM)
			</h2>

			<div className="notam-groups">
				{Object.keys(groupedNotams).map((category) => {
					const categoryNotams = groupedNotams[category];
					const isExpanded = isOpen(category);

					const isUpcoming = category.endsWith(UPCOMING);
					let headerClass = "header-default";
					if (isUpcoming) headerClass = "header-info";
					else if (category.includes("🚨")) headerClass = "header-danger";
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
								type="button"
								className={`category-header ${headerClass}`}
								onClick={() => toggleCategory(category)}
								aria-expanded={!!isExpanded}
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
										<div key={notam.id ?? index} className="notam-card">
											<div className="notam-header">
												{notam.id && (
													<span className="notam-id">{notam.id}</span>
												)}
												<span className="notam-time">
													🕒 {notam.start_time} ➔ {notam.end_time}
													{notam.state === "unknown"
														? "（時間無法解析）"
														: " (UTC)"}
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
