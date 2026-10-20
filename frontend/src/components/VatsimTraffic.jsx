import "../assets/styles/VatsimTraffic.css";

import { Coffee, Plane, PlaneLanding, PlaneTakeoff, Radar } from "lucide-react";
import { useState } from "react";

// 每欄預設只顯示前幾筆，其餘點「顯示全部」展開。
// 舊版用 max-height + overflow 的欄內捲動，在手機上會變成「捲不動頁面」的卡手區，鍵盤也無法操作。
export const VISIBLE_DEFAULT = 4;

const FlightCard = ({ pilot, variant, label, route }) => (
	<div className={`flight-card ${variant}-card`}>
		<div className="flight-main">
			<span className="callsign">{pilot.callsign}</span>
			<span className="aircraft-type">{pilot.aircraft_short}</span>
		</div>
		<div className="flight-route">
			<span className="route-label">{label}</span> {route}
		</div>
		<div className="flight-details">
			<span>
				<Radar size={12} /> {pilot.altitude} ft
			</span>
			<span>{pilot.groundspeed} kts</span>
		</div>
	</div>
);

const FlightColumn = ({ variant, title, icon, pilots, emptyText, label, routeOf }) => {
	const [expanded, setExpanded] = useState(false);
	const shown = expanded ? pilots : pilots.slice(0, VISIBLE_DEFAULT);

	return (
		<div className="traffic-column">
			<h3 className={`column-title ${variant}-title`}>
				{icon} {title}
				<span className="count-tag">{pilots.length}</span>
			</h3>
			<div className="flight-list">
				{pilots.length > 0 ? (
					shown.map((pilot) => (
						<FlightCard
							key={`${pilot.cid ?? ""}-${pilot.callsign}`}
							pilot={pilot}
							variant={variant}
							label={label}
							route={routeOf(pilot)}
						/>
					))
				) : (
					<div className="empty-msg">{emptyText}</div>
				)}
				{pilots.length > VISIBLE_DEFAULT && (
					<button
						type="button"
						className="show-more-btn"
						aria-expanded={expanded}
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded ? "收合" : `顯示全部 ${pilots.length} 筆`}
					</button>
				)}
			</div>
		</div>
	);
};

const VatsimTraffic = ({ arrivals, departures, cruisings }) => {
	// cruisings 是 arrivals / departures 的子集（同一架飛機可同時屬於兩者），要去重再計數
	const totalFlights = new Set(
		[...arrivals, ...departures, ...cruisings].map((p) => p.cid ?? p.callsign),
	).size;

	if (totalFlights === 0) {
		return (
			<div className="panel-card traffic-section">
				<h2 className="section-title">
					<Plane size={20} color="#38bdf8" /> VATSIM 航班流量
				</h2>
				<div className="empty-airspace">
					<Coffee size={48} color="#475569" strokeWidth={1.5} />
					<h3>目前空域非常安靜</h3>
					<p>沒有預計抵達或離場的線上航班</p>
				</div>
			</div>
		);
	}

	return (
		<div className="panel-card traffic-section">
			<h2 className="section-title">
				<div className="title-left">
					<Plane size={20} color="#38bdf8" /> VATSIM 航班流量
				</div>
				<span className="flight-badge">共 {totalFlights} 架次</span>
			</h2>

			<div className="traffic-grid">
				<FlightColumn
					variant="arr"
					title="預計抵達"
					icon={<PlaneLanding size={16} />}
					pilots={arrivals}
					emptyText="無進場航班"
					label="FR"
					routeOf={(p) => p.departure || "UNKNOWN"}
				/>
				<FlightColumn
					variant="dep"
					title="預計起飛"
					icon={<PlaneTakeoff size={16} />}
					pilots={departures}
					emptyText="無離場航班"
					label="TO"
					routeOf={(p) => p.arrival || "UNKNOWN"}
				/>
				<FlightColumn
					variant="crs"
					title="巡航/過境"
					icon={<Plane size={16} />}
					pilots={cruisings}
					emptyText="無巡航航班"
					label="RTE"
					routeOf={(p) => `${p.departure || "????"} ➔ ${p.arrival || "????"}`}
				/>
			</div>
		</div>
	);
};

export default VatsimTraffic;
