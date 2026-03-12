import "../assets/styles/VatsimTraffic.css";

const VatsimTraffic = ({ arrivals, departures }) => {
	if (arrivals.length === 0 && departures.length === 0) {
		return null;
	}

	return (
		<div className="traffic-section">
			<h3 className="section-title">✈️ VATSIM 航班流量</h3>

			<div className="traffic-grid">
				<div className="traffic-column">
					<h4 className="column-title arr-title">
						🛬 預計抵達 ({arrivals.length})
					</h4>
					<div className="flight-list">
						{arrivals.length > 0 ? (
							arrivals.map((pilot) => (
								<div
									key={pilot.name}
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
										FROM {pilot.departure}
									</div>
								</div>
							))
						) : (
							<div className="empty-msg">目前無進場航班</div>
						)}
					</div>
				</div>

				<div className="traffic-column">
					<h4 className="column-title dep-title">
						🛫 預計起飛 ({departures.length})
					</h4>
					<div className="flight-list">
						{departures.length > 0 ? (
							departures.map((pilot) => (
								<div
									key={pilot.name}
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
										TO {pilot.arrival}
									</div>
								</div>
							))
						) : (
							<div className="empty-msg">目前無離場航班</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default VatsimTraffic;
