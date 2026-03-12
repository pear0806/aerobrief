import "../assets/styles/Radar.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

const MapUpdater = ({ center }) => {
	const map = useMap();
	useEffect(() => {
		if (center) {
			map.setView(center, 10);
		}
	}, [center, map]);
	return null;
};

const createAirplaneIcon = (heading, isArrival) => {
	const color = isArrival ? "#60a5fa" : "#fbbf24";
	return L.divIcon({
		className: "custom-airplane-icon",
		html: `<div style="transform: rotate(${heading || 0}deg); color: ${color}; font-size: 24px; text-shadow: 0px 0px 4px #000;">✈</div>`,
		iconSize: [24, 24],
		iconAnchor: [12, 12],
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
		<div className="radar-map-wrapper">
			<h3 className="section-title">📡 終端空域雷達 (Live Radar)</h3>

			<div className="radar-map-container">
				<MapContainer
					center={center}
					zoom={10}
					style={{ height: "100%", width: "100%" }}
				>
					<TileLayer
						url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
										({pilot.aircraft})
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

			<div
				className="map-legend"
				style={{
					marginTop: "10px",
					display: "flex",
					gap: "15px",
					fontSize: "0.85rem",
				}}
			>
				<span>
					<span style={{ color: "#60a5fa", fontSize: "1.2rem" }}>
						✈
					</span>{" "}
					抵達航班
				</span>
				<span>
					<span style={{ color: "#fbbf24", fontSize: "1.2rem" }}>
						✈
					</span>{" "}
					離場航班
				</span>
				<span style={{ color: "#94a3b8" }}>
					(點擊飛機圖示可查看詳細資訊)
				</span>
			</div>
		</div>
	);
};

export default RadarMap;
