import { useState } from "react";
import { useAvwx } from "./hooks/useAvwx";

import SearchBar from "./components/SearchBar";
import WeatherDashboard from "./components/WeatherDashboard";
import RunwayCard from "./components/RunwayCard";

import "./assets/styles/App.css";

function App() {
	const [icao, setIcao] = useState("RCTP");
	const [CrossWindLimit, setCrossWindLimit] = useState(15);
	const [TailWindLimit, setTailWindLimit] = useState(10);
	const { data, loading, error, fetchWeather } = useAvwx(icao);

	return (
		<div className="app-container">
			<h1 className="title">✈️ AeroBrief</h1>

			<SearchBar
				icao={icao}
				setIcao={setIcao}
				onSearch={fetchWeather}
				loading={loading}
			/>

			{error && (
				<div style={{ color: "#ef4444", textAlign: "center" }}>
					⚠️ {error}
				</div>
			)}

			{data && (
				<>
					<WeatherDashboard data={data} />
					<div className="limit-setting-section">
						<div className="limit-setting">
							<span>✈️ 機型側風限制</span>
							<div>
								<input
									className="limit-setting-input"
									type="number"
									value={CrossWindLimit}
									onChange={(e) =>
										setCrossWindLimit(
											Number(e.target.value),
										)
									}
									min={0}
								/>
								<span style={{ marginLeft: "5px" }}>kts</span>
							</div>
						</div>

						<div className="limit-setting">
							<span>✈️ 機型順風限制</span>
							<div>
								<input
									className="limit-setting-input"
									type="number"
									value={TailWindLimit}
									onChange={(e) =>
										setTailWindLimit(Number(e.target.value))
									}
									min={0}
								/>
								<span style={{ marginLeft: "5px" }}>kts</span>
							</div>
						</div>
					</div>

					<h3 className="section-title">跑道分析 ({data.station})</h3>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "10px",
						}}
					>
						{data.runways && data.runways.length > 0 ? (
							data.runways.map((rwy) => (
								<RunwayCard
									key={rwy.name}
									runwayName={rwy.name}
									heading={rwy.heading}
									windDir={data.wind_direction?.value || 0}
									windSpd={data.wind_speed?.value || 0}
									crossWindLimit={CrossWindLimit}
									tailWindLimit={TailWindLimit}
								/>
							))
						) : (
							<p style={{ textAlign: "center", color: "#666" }}>
								無跑道資料
							</p>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export default App;
