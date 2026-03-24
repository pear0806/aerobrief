import "./assets/styles/App.css";

import { useEffect, useState } from "react";

import AircraftSelector from "./components/AircraftSelector";
import FadeIn from "./components/FadeIn";
import LandingWarning from "./components/LandingWarning";
import LimitControl from "./components/LimitControl";
import NotamBoard from "./components/NotamDashboard";
import Radar from "./components/Radar";
import RunwayCard from "./components/RunwayCard";
import RunwayMap from "./components/RunwayMap";
import SearchBar from "./components/SearchBar";
import Skeleton from "./components/Skeleton";
import TafTimeline from "./components/TafTimeline";
import VatsimStatus from "./components/VatsimStatus";
import VatsimTraffic from "./components/VatsimTraffic";
import WeatherDashboard from "./components/WeatherDashboard";
import { useAvwx } from "./hooks/useAvwx";
import { useRunwayAnalysis } from "./hooks/useRunwayAnalysis";
import { useVatsim } from "./hooks/useVatsim";

function App() {
	const [icao, setIcao] = useState(
		localStorage.getItem("last-icao") || "RCTP",
	);

	const [favorite, setFavorite] = useState(() => {
		const saved = localStorage.getItem("favorite");
		return saved ? JSON.parse(saved) : [];
	});

	const [CrossWindLimit, setCrossWindLimit] = useState(
		Number(localStorage.getItem("crosswind-limit")) || 15,
	);
	const [TailWindLimit, setTailWindLimit] = useState(
		Number(localStorage.getItem("tailwind-limit")) || 10,
	);

	const [HeadWindLimit, setHeadWindLimit] = useState(
		Number(localStorage.getItem("headwind-limit")) || 20,
	);

	const [pressureUnit, setPressureUnit] = useState("hPa");

	const { data, loading, error, fetchWeather } = useAvwx(icao);

	const {
		controller,
		arrivals,
		departures,
		cruisings,
		vatsimLoading,
		vatsimError,
		fetchVatsimData,
	} = useVatsim(icao);

	const [aircraft, setAircraft] = useState("B77W");

	useEffect(() => {
		localStorage.setItem("last-icao", icao);
	}, [icao]);

	useEffect(() => {
		localStorage.setItem("favorite", JSON.stringify(favorite));
	}, [favorite]);

	useEffect(() => {
		localStorage.setItem("crosswind-limit", CrossWindLimit);
		localStorage.setItem("tailwind-limit", TailWindLimit);
		localStorage.setItem("headwind-limit", HeadWindLimit);
	}, [CrossWindLimit, TailWindLimit, HeadWindLimit]);

	const toggleFavorite = (target) => {
		if (!target) {
			return;
		} else {
			if (favorite.includes(target)) {
				setFavorite(favorite.filter((id) => id !== target));
				return;
			} else {
				if (favorite.length >= 8) {
					alert("收藏清單已滿 (最多 8 個)");
					return;
				} else {
					setFavorite([...favorite, target]);
				}
			}
		}
	};

	const handleOnSearch = (targetIcao) => {
		const searchTarget = typeof targetIcao === "string" ? targetIcao : icao;
		fetchWeather(searchTarget);
		fetchVatsimData(searchTarget);
	};

	const { processedRunways, windDir } = useRunwayAnalysis(data, {
		CrossWindLimit,
		TailWindLimit,
		HeadWindLimit,
	});

	return (
		<div className="app-container">
			<div className="sticky-header">
				<h1 className="app-main-title">✈️ AeroBrief</h1>
				<SearchBar
					icao={icao}
					setIcao={setIcao}
					onSearch={handleOnSearch}
					loading={loading || vatsimLoading}
					favorite={favorite}
					toggleFavorite={toggleFavorite}
				/>
			</div>

			{error && <div className="error-message">⚠️ {error}</div>}
			{vatsimError && (
				<div className="error-message">⚠️ {vatsimError}</div>
			)}

			{loading ? (
				<Skeleton />
			) : (
				data && (
					<div className="dashboard-layout">
						<div className="left-column">
							<FadeIn delay={0.1}>
								<WeatherDashboard
									data={data}
									pressureUnit={pressureUnit}
									setPressureUnit={setPressureUnit}
								/>
							</FadeIn>

							<FadeIn delay={0.2}>
								<TafTimeline tafData={data.taf} />
							</FadeIn>

							<FadeIn delay={0.3}>
								<NotamBoard notams={data.notam} />
							</FadeIn>
						</div>

						<div className="right-column">
							<FadeIn delay={0.15}>
								<VatsimStatus
									controller={controller}
									loading={vatsimLoading}
								/>
							</FadeIn>

							<FadeIn delay={0.25}>
								<Radar
									arrivals={arrivals}
									departures={departures}
									cruisings={cruisings}
									airportLat={data?.common?.latitude}
									airportLon={data?.common?.longitude}
									icao={icao}
								/>
							</FadeIn>

							<FadeIn delay={0.35}>
								<VatsimTraffic
									arrivals={arrivals}
									departures={departures}
									cruisings={cruisings}
								/>
							</FadeIn>
						</div>

						<div className="bottom-full-width">
							<FadeIn delay={0.4}>
								<AircraftSelector
									aircraft={aircraft}
									setAircraft={setAircraft}
									setCrossWindLimit={setCrossWindLimit}
									setTailWindLimit={setTailWindLimit}
									setHeadWindLimit={setHeadWindLimit}
								/>

								<div className="limit-setting-section">
									<LimitControl
										label="✈️ 機型側風限制"
										value={CrossWindLimit}
										setValue={(val) => {
											setAircraft("CUSTOM");
											setCrossWindLimit(val);
										}}
									/>
									<LimitControl
										label="✈️ 機型順風限制"
										value={TailWindLimit}
										setValue={(val) => {
											setAircraft("CUSTOM");
											setTailWindLimit(val);
										}}
									/>
									<LimitControl
										label="✈️ 機型頂風限制"
										value={HeadWindLimit}
										setValue={(val) => {
											setAircraft("CUSTOM");
											setHeadWindLimit(val);
										}}
									/>
								</div>

								<LandingWarning data={data} />

								<h3 className="section-title">跑道分析</h3>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "10px",
									}}
								>
									{processedRunways.length > 0 ? (
										<>
											<RunwayMap
												key={icao}
												runways={processedRunways}
												windDir={windDir}
											/>
											{processedRunways.map((rwy) => (
												<RunwayCard
													key={rwy.name}
													runwayName={rwy.name}
													heading={rwy.heading}
													windDir={windDir}
													crosswind={rwy.crosswind}
													headwind={rwy.headwind}
													isHeadwind={
														rwy.headwind > 0
													}
													isDanger={rwy.isDanger}
													dangerMessage={
														rwy.dangerMessage
													}
													index={rwy.index}
													isFirst={rwy.isFirst}
												/>
											))}
										</>
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
							</FadeIn>
						</div>
					</div>
				)
			)}
		</div>
	);
}

export default App;
