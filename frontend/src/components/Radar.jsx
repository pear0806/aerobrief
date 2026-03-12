import "../assets/styles/Radar.css";

import L from "leaflet";
import { PlaneLanding, PlaneTakeoff, Radar as RadarIcon } from "lucide-react";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

const MapUpdater = ({ center }) => {
	const map = useMap();
	useEffect(() => {
		if (center) map.setView(center, 10);
	}, [center, map]);
	return null;
};

const getAirplaneSvg = (color, heading) => `
	<div style="transform: rotate(${heading || 0}deg); display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.8));">
			<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.5l-1.3 2.6c-.2.4-.1.9.3 1.2L9 14l-3.5 3.5-2.7-.9c-.4-.1-.8.1-1 .5l-.8 1.6c-.1.3 0 .7.3.9l4.5 1.2 1.2 4.5c.2.3.6.4.9.3l1.6-.8c.4-.2.6-.6.5-1l-.9-2.7 3.5-3.5 3.5 6.3c.3.4.8.5 1.2.3l2.6-1.3c.3-.2.6-.6.5-1.1z"/>
		</svg>
	</div>
`;

const createAirplaneIcon = (heading, isArrival) => {
	const color = isArrival ? "#60a5fa" : "#fbbf24";
	return L.divIcon({
		className: "custom-airplane-icon",
		html: getAirplaneSvg(color, heading),
		iconSize: [28, 28],
		iconAnchor: [14, 14],
	});
};

const airportIcon = L.divIcon({
	className: "airport-icon",
	html: `<div style="font-size: 24px; text-shadow: 0px 0px 4px #000;">📍</div>`,
	iconSize: [24, 24],
	iconAnchor: [12, 24],
});

const RadarMap = ({ arrivals, departures, airportLat, airportLon, icao }) => {
	if (!airportLat || !airportLon) return null;

	const center = [airportLat, airportLon];
	const allTraffic = [
		...arrivals.map((p) => ({ ...p, isArrival: true })),
		...departures.map((p) => ({ ...p, isArrival: false })),
	].filter((p) => p.latitude && p.longitude);

	return (
		<div className="panel-card radar-map-wrapper">
			<h3 className="section-title">
				<RadarIcon size={20} color="#38bdf8" /> 終端空域雷達 (Live
				Radar)
			</h3>

			<div className="radar-map-container">
				<MapContainer
					center={center}
					zoom={10}
					style={{ height: "100%", width: "100%" }}
				>
					<TileLayer
						url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					/>
					<MapUpdater center={center} />
					<Marker position={center} icon={airportIcon}>
						<Popup className="custom-popup">
							<strong style={{ color: "#ef4444" }}>{icao}</strong>
							<br />
							機場中心點
						</Popup>
					</Marker>

					{allTraffic.map((pilot, index) => (
						<Marker
							key={`${pilot.cid}-${index}`}
							position={[pilot.latitude, pilot.longitude]}
							icon={createAirplaneIcon(
								pilot.heading,
								pilot.isArrival,
							)}
						>
							<Popup className="custom-popup">
								<div>
									<strong
										style={{
											color: pilot.isArrival
												? "#60a5fa"
												: "#fbbf24",
											fontSize: "1.1rem",
										}}
									>
										{pilot.callsign}
									</strong>
									<span
										style={{
											marginLeft: "8px",
											color: "#cbd5e1",
										}}
									>
										({pilot.aircraft_short})
									</span>
									<hr
										style={{
											borderColor: "#334155",
											margin: "6px 0",
										}}
									/>
									<div>
										狀態:{" "}
										{pilot.isArrival
											? "🛬 抵達進場中"
											: "🛫 離場爬升中"}
									</div>
									<div>
										高度:{" "}
										<span style={{ color: "#f8fafc" }}>
											{pilot.altitude}
										</span>{" "}
										ft
									</div>
									<div>
										地速:{" "}
										<span style={{ color: "#f8fafc" }}>
											{pilot.groundspeed}
										</span>{" "}
										kts
									</div>
									<div>
										航向:{" "}
										<span style={{ color: "#f8fafc" }}>
											{Math.round(pilot.heading || 0)}°
										</span>
									</div>
								</div>
							</Popup>
						</Marker>
					))}
				</MapContainer>
			</div>

			<div className="map-legend">
				<span
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<PlaneLanding size={18} color="#60a5fa" /> 抵達航班
				</span>
				<span
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<PlaneTakeoff size={18} color="#fbbf24" /> 離場航班
				</span>
				<span className="legend-hint">
					(點擊飛機圖示可查看詳細資訊)
				</span>
			</div>
		</div>
	);
};

export default RadarMap;
