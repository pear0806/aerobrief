import "./assets/styles/App.css";

import { useEffect, useMemo, useRef, useState } from "react";

import AircraftSelector from "./components/AircraftSelector";
import ErrorBoundary from "./components/ErrorBoundary";
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
import { useGateway } from "./hooks/useGateway";
import { useRunwayAnalysis } from "./hooks/useRunwayAnalysis";

function App() {
	const [icao, setIcao] = useState(localStorage.getItem("last-icao") || "RCTP");
	const [favorite, setFavorite] = useState(() => {
		try {
			const saved = JSON.parse(localStorage.getItem("favorite"));
			return Array.isArray(saved) ? saved : [];
		} catch {
			return [];
		}
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
	const [aircraft, setAircraft] = useState("B77W");

	const { callGateway, loading, error } = useGateway();
	const [briefing, setBriefing] = useState(null);
	const [inputError, setInputError] = useState(null);
	// 目前「使用者想看的」機場；任何晚到的舊回應都不得覆蓋它
	const activeIcaoRef = useRef(null);

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
		if (!target) return;
		if (favorite.includes(target)) {
			setFavorite(favorite.filter((id) => id !== target));
		} else {
			if (favorite.length >= 8) return alert("收藏清單已滿 (最多 8 個)");
			setFavorite([...favorite, target]);
		}
	};

	const handleOnSearch = async (targetIcao) => {
		const searchIcao = (typeof targetIcao === "string" ? targetIcao : icao)
			.trim()
			.toUpperCase();

		if (!/^[A-Z0-9]{4}$/.test(searchIcao)) {
			setInputError("請輸入 4 碼 ICAO 機場代碼（例如 RCTP）");
			return;
		}
		setInputError(null);
		activeIcaoRef.current = searchIcao;

		const result = await callGateway("GET_FULL_BRIEFING", {
			icao: searchIcao,
		});
		if (result && activeIcaoRef.current === searchIcao) {
			setBriefing(result);
		}
	};

	// 輪詢：VATSIM（輕量，15 秒）與完整簡報（天氣，5 分鐘；後端另有快取）分開
	useEffect(() => {
		const target = briefing?.icao;
		if (!target) return;

		const isCurrent = () => activeIcaoRef.current === target;

		const vatsimTimer = setInterval(async () => {
			if (document.hidden) return;
			const vatsim = await callGateway("GET_VATSIM", { icao: target }, true);
			if (vatsim && isCurrent()) {
				setBriefing((prev) =>
					prev && prev.icao === target ? { ...prev, vatsim } : prev,
				);
			}
		}, 15000);

		const weatherTimer = setInterval(async () => {
			if (document.hidden) return;
			const result = await callGateway(
				"GET_FULL_BRIEFING",
				{ icao: target },
				true,
			);
			if (result && isCurrent()) setBriefing(result);
		}, 300000);

		return () => {
			clearInterval(vatsimTimer);
			clearInterval(weatherTimer);
		};
	}, [briefing?.icao, callGateway]);

	const legacyData = useMemo(
		() =>
			briefing
				? {
						common: briefing.weather,
						taf: briefing.taf,
						notam: briefing.notams,
						runways: briefing.runways,
					}
				: null,
		[briefing],
	);

	const vatsim = briefing?.vatsim || {};
	const controller = vatsim.controllers || [];
	const arrivals = vatsim.arrivals || [];
	const departures = vatsim.departures || [];
	const cruisings = vatsim.cruisings || [];

	const { processedRunways, windDir, windSpeed, isVariable, noSafeRunway } =
		useRunwayAnalysis(legacyData, {
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
					loading={loading}
					favorite={favorite}
					toggleFavorite={toggleFavorite}
				/>
			</div>

			{(inputError || error) && (
				<div className="error-message">⚠️ {inputError || error}</div>
			)}
			{(briefing?.warnings || []).map((w) => (
				<div key={w} className="error-message">
					⚠️ {w}
				</div>
			))}
			{vatsim.error && <div className="error-message">⚠️ {vatsim.error}</div>}

			{loading ? (
				<Skeleton />
			) : (
				briefing &&
				legacyData && (
					<div className="dashboard-layout">
						<div className="left-column">
							<FadeIn delay={0.1}>
								<ErrorBoundary resetKey={briefing.icao}>
									<WeatherDashboard
										data={legacyData}
										pressureUnit={pressureUnit}
										setPressureUnit={setPressureUnit}
									/>
								</ErrorBoundary>
							</FadeIn>

							<FadeIn delay={0.2}>
								<ErrorBoundary resetKey={briefing.icao}>
									<TafTimeline tafData={briefing.taf} />
								</ErrorBoundary>
							</FadeIn>

							<FadeIn delay={0.3}>
								<ErrorBoundary resetKey={briefing.icao}>
									<NotamBoard notams={briefing.notams} />
								</ErrorBoundary>
							</FadeIn>
						</div>

						<div className="right-column">
							<FadeIn delay={0.15}>
								<ErrorBoundary resetKey={briefing.icao}>
									<VatsimStatus controller={controller} loading={false} />
								</ErrorBoundary>
							</FadeIn>

							<FadeIn delay={0.25}>
								<ErrorBoundary resetKey={briefing.icao}>
									<Radar
										arrivals={arrivals}
										departures={departures}
										cruisings={cruisings}
										airportLat={briefing.weather?.latitude}
										airportLon={briefing.weather?.longitude}
										icao={briefing.icao}
									/>
								</ErrorBoundary>
							</FadeIn>

							<FadeIn delay={0.35}>
								<ErrorBoundary resetKey={briefing.icao}>
									<VatsimTraffic
										arrivals={arrivals}
										departures={departures}
										cruisings={cruisings}
									/>
								</ErrorBoundary>
							</FadeIn>
						</div>

						<div className="bottom-full-width">
							<FadeIn delay={0.4}>
								<ErrorBoundary resetKey={briefing.icao}>
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

									<LandingWarning data={legacyData} />

									<h3 className="section-title">跑道分析</h3>
									{isVariable && (
										<div className="error-message">
											⚠️ 風向不定 (VRB) {windSpeed}{" "}
											kts：無法計算各跑道風分量，已以風速本身保守評估。
										</div>
									)}
									{noSafeRunway && (
										<div className="error-message">
											🚨 所有跑道都超出目前設定的風速限制，沒有推薦跑道。
										</div>
									)}
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
														crosswindGust={rwy.crosswindGust}
														headwindGust={rwy.headwindGust}
														isHeadwind={(rwy.headwind ?? 0) > 0}
														isDanger={rwy.isDanger}
														dangerMessage={rwy.dangerMessage}
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
								</ErrorBoundary>
							</FadeIn>
						</div>
					</div>
				)
			)}
		</div>
	);
}

export default App;
