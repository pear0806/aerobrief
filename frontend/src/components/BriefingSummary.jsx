import "../assets/styles/BriefingSummary.css";

import { ArrowDown, Headphones, Plane, Wind } from "lucide-react";

const TONE_ICON = { ok: "✅", warn: "⚠️", danger: "🚨" };

/** 頁首「決策摘要」：不用往下捲就能看到風、建議跑道、關閉公告與 ATC。純展示元件，資料由 buildSummary 產生。 */
const BriefingSummary = ({ icao, summary }) => {
	const { tone, flightRules, windText, runway, reason, closedText, atcCount } = summary;

	return (
		<section className={`briefing-summary ${tone}`} aria-label={`${icao} 簡報摘要`}>
			<div className="summary-main">
				<span className="summary-icao">{TONE_ICON[tone]} {icao}</span>
				{flightRules && (
					<span className={`summary-rules rules-${flightRules}`}>{flightRules}</span>
				)}
				<span className="summary-wind">
					<Wind size={16} aria-hidden="true" /> {windText}
				</span>
			</div>

			<div className="summary-runway">
				{runway ? (
					<>
						<Plane size={16} aria-hidden="true" />
						<span className="summary-label">建議跑道</span>
						<strong className="summary-runway-name">{runway.name}</strong>
						{runway.wind && <span className="summary-sub">{runway.wind} kts</span>}
					</>
				) : (
					<strong className="summary-reason">⛔ 無推薦跑道{reason ? `：${reason}` : ""}</strong>
				)}
			</div>

			<div className="summary-facts">
				<span className={closedText ? "fact-bad" : "fact-ok"}>
					NOTAM 關閉：<strong>{closedText || "無"}</strong>
				</span>
				<span>
					<Headphones size={14} aria-hidden="true" /> ATC 在線：
					<strong>{atcCount} 席</strong>
				</span>
				<a className="summary-link" href="#runway-analysis">
					查看跑道分析 <ArrowDown size={14} aria-hidden="true" />
				</a>
			</div>
		</section>
	);
};

export default BriefingSummary;
