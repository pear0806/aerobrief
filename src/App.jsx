import { useEffect, useState } from "react";
import { useAvwx } from "./hooks/useAvwx";

import SearchBar from "./components/SearchBar";
import WeatherDashboard from "./components/WeatherDashboard";
import RunwayCard from "./components/RunwayCard";
import Skeleton from "./components/Skeleton";
import LimitControl from "./components/LimitControl";

import "./assets/styles/App.css";

function App() {
	const [icao, setIcao] = useState(
		localStorage.getItem("last-icao") || "RCTP",
	);
	const [CrossWindLimit, setCrossWindLimit] = useState(
		Number(localStorage.getItem("crosswind-limit")) || 15,
	);
	const [TailWindLimit, setTailWindLimit] = useState(
		Number(localStorage.getItem("tailwind-limit")) || 10,
	);

	const [HeadWindLimit, setHeadWindLimit] = useState(
		Number(localStorage.getItem("headwind-limit")) || 20,
	);

	const { data, loading, error, fetchWeather } = useAvwx(icao);

	useEffect(() => {
		localStorage.setItem("last-icao", icao);
	}, [icao]);
	useEffect(() => {
		localStorage.setItem("crosswind-limit", CrossWindLimit);
		localStorage.setItem("tailwind-limit", TailWindLimit);
		localStorage.setItem("headwind-limit", HeadWindLimit);
	}, [CrossWindLimit, TailWindLimit, HeadWindLimit]);

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

			{loading ? (
				<Skeleton />
			) : data ? (
				<>
					<WeatherDashboard data={data} />
					<div className="limit-setting-section">
						<LimitControl
							label="✈️ 機型側風限制"
							value={CrossWindLimit}
							setValue={setCrossWindLimit}
						/>
						<LimitControl
							label="✈️ 機型順風限制"
							value={TailWindLimit}
							setValue={setTailWindLimit}
						/>
						<LimitControl
							label="✈️ 機型頂風限制"
							value={HeadWindLimit}
							setValue={setHeadWindLimit}
						/>
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
									headWindLimit={HeadWindLimit}
									tailWindLimit={TailWindLimit}
								/>
							))
						) : (
							<p
								style={{
									textAlign: "center",
									color: "#666",
								}}
							>
								無跑道資料
							</p>
						)}
					</div>
				</>
			) : (
				<></>
			)}
		</div>
	);
}

export default App;
