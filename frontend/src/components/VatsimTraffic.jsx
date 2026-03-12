import "../assets/styles/VatsimTraffic.css";

import { Coffee, Plane, PlaneLanding, PlaneTakeoff, Radar } from "lucide-react";

const VatsimTraffic = ({ arrivals, departures }) => {
	const totalFlights = arrivals.length + departures.length;

	if (totalFlights === 0) {
		return (
			<div className="panel-card traffic-section">
				<h3 className="section-title">
					<Plane size={20} color="#38bdf8" /> VATSIM 航班流量
				</h3>
				<div className="empty-airspace">
					<Coffee size={48} color="#475569" strokeWidth={1.5} />
					<h4>目前空域非常安靜</h4>
					<p>沒有預計抵達或離場的線上航班</p>
				</div>
			</div>
		);
	}

	return (
		<div className="panel-card traffic-section">
			<h3 className="section-title">
				<div className="title-left">
					<Plane size={20} color="#38bdf8" /> VATSIM 航班流量
				</div>
				<span className="flight-badge">共 {totalFlights} 架次</span>
			</h3>

			<div className="traffic-grid">
				{/* === 抵達航班 === */}
				<div className="traffic-column">
					<h4 className="column-title arr-title">
						<PlaneLanding size={16} /> 預計抵達
						<span className="count-tag">{arrivals.length}</span>
					</h4>
					<div className="flight-list">
						{arrivals.length > 0 ? (
							arrivals.map((pilot) => (
								<div
									key={pilot.callsign}
									className="flight-card arr-card"
								>
									<div className="flight-main">
										<span className="callsign">
											{pilot.callsign}
										</span>
										<span className="aircraft-type">
											{pilot.aircraft_short}
										</span>
									</div>
									<div className="flight-route">
										<span className="route-label">FR</span>{" "}
										{pilot.departure || "UNKNOWN"}
									</div>
									<div className="flight-details">
										<span>
											<Radar size={12} /> {pilot.altitude}{" "}
											ft
										</span>
										<span>{pilot.groundspeed} kts</span>
									</div>
								</div>
							))
						) : (
							<div className="empty-msg">無進場航班</div>
						)}
					</div>
				</div>

				{/* === 離場航班 === */}
				<div className="traffic-column">
					<h4 className="column-title dep-title">
						<PlaneTakeoff size={16} /> 預計起飛
						<span className="count-tag">{departures.length}</span>
					</h4>
					<div className="flight-list">
						{departures.length > 0 ? (
							departures.map((pilot) => (
								<div
									key={pilot.callsign}
									className="flight-card dep-card"
								>
									<div className="flight-main">
										<span className="callsign">
											{pilot.callsign}
										</span>
										<span className="aircraft-type">
											{pilot.aircraft_short}
										</span>
									</div>
									<div className="flight-route">
										<span className="route-label">TO</span>{" "}
										{pilot.arrival || "UNKNOWN"}
									</div>
									<div className="flight-details">
										<span>
											<Radar size={12} /> {pilot.altitude}{" "}
											ft
										</span>
										<span>{pilot.groundspeed} kts</span>
									</div>
								</div>
							))
						) : (
							<div className="empty-msg">無離場航班</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default VatsimTraffic;
