import "./assets/styles/App.css";

import { useEffect, useMemo, useState } from "react";

import AircraftSelector from "./components/AircraftSelector";
import LandingWarning from "./components/LandingWarning";
import LimitControl from "./components/LimitControl";
import NotamBoard from "./components/NotamDashborad";
import RunwayCard from "./components/RunwayCard";
import RunwayMap from "./components/RunwayMap";
import SearchBar from "./components/SearchBar";
import Skeleton from "./components/Skeleton";
import TafTimeline from "./components/TafTimeline";
import VatsimStatus from "./components/VatsimStatus";
import VatsimTraffic from "./components/VatsimTraffic";
import WeatherDashboard from "./components/WeatherDashboard";
import { useAvwx } from "./hooks/useAvwx";
import { useVatsim } from "./hooks/useVatsim";
import { calculateCrosswind } from "./utils/caclRWYwind";

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
		if (data && data.station) {
			const interval = setInterval(() => {
				fetchWeather();
				fetchVatsimData();
			}, 60000);
			return () => clearInterval(interval);
		}
	}, [data]);

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
			} else if (target !== icao) {
				alert("請先「查詢」確認機場存在後，再加入收藏！");
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

	const { processedRunways, windDir } = useMemo(() => {
		if (!data || !data.runways || data.runways.length === 0) {
			return { processedRunways: [], windDir: 0 };
		}

		const windSpd = data.common.wind_speed?.value || 0;
		const windDir = data.common.wind_direction?.value || 0;

		const proccessed = data.runways.map((rwy, index) => {
			const { crosswind, headwind } = calculateCrosswind(
				rwy.heading,
				windDir,
				windSpd,
			);

			let isDanger = false,
				isCrossWindDanger = false,
				isTailWindDanger = false,
				isHeadWindDanger = false,
				dangerMessage = "";

			if (crosswind > CrossWindLimit) isCrossWindDanger = true;
			if (headwind > 0 && headwind > HeadWindLimit)
				isHeadWindDanger = true;
			if (headwind < 0 && Math.abs(headwind) > TailWindLimit)
				isTailWindDanger = true;

			if (isCrossWindDanger || isTailWindDanger || isHeadWindDanger)
				isDanger = true;

			if (isCrossWindDanger && isTailWindDanger)
				dangerMessage = "⚠️ 側風、尾風超限";
			else if (isCrossWindDanger && isHeadWindDanger)
				dangerMessage = "⚠️ 側風、頂風超限";
			else if (isCrossWindDanger) dangerMessage = "⚠️ 側風超限";
			else if (isTailWindDanger) dangerMessage = "⚠️ 尾風超限";
			else if (isHeadWindDanger) dangerMessage = "⚠️ 頂風超限";

			return {
				name: rwy.name,
				heading: rwy.heading,
				crosswind,
				headwind,
				isDanger,
				dangerMessage,
				index,
			};
		});

		const sortedRunway = [...proccessed].sort(
			(a, b) => b.headwind - a.headwind,
		);

		const maxHeading =
			sortedRunway.length > 0 ? sortedRunway[0].headwind : 0;
		const bestHeading =
			sortedRunway.length > 0 ? sortedRunway[0].heading : 0;

		const finalRunways = sortedRunway.map((rwy) => {
			let diff = Math.abs(rwy.heading - bestHeading);
			if (diff > 180) diff = 360 - diff;

			return {
				...rwy,

				isFirst: rwy.headwind >= maxHeading - 2 && diff < 90,
			};
		});

		return { processedRunways: finalRunways, windDir };
	}, [data, CrossWindLimit, HeadWindLimit, TailWindLimit]);

	return (
		<div className="app-container">
			<h1 className="app-main-title">✈️ AeroBrief</h1>

			<SearchBar
				icao={icao}
				setIcao={setIcao}
				onSearch={handleOnSearch}
				loading={loading || vatsimLoading}
				favorite={favorite}
				toggleFavorite={toggleFavorite}
			/>

			{error && <div className="error-message">⚠️ {error}</div>}

			{vatsimError && (
				<div className="error-message">⚠️ {vatsimError}</div>
			)}

			{loading ? (
				<Skeleton />
			) : (
				data && (
					<>
						<WeatherDashboard
							data={data}
							pressureUnit={pressureUnit}
							setPressureUnit={setPressureUnit}
						/>

						<TafTimeline tafData={data.taf} />

						<NotamBoard notams={data.notam} />

						<VatsimStatus
							controller={controller}
							loading={vatsimLoading}
						></VatsimStatus>

						<VatsimTraffic
							arrivals={arrivals}
							departures={departures}
						/>

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
									></RunwayMap>
									{processedRunways.map((rwy) => {
										return (
											<RunwayCard
												key={rwy.name}
												runwayName={rwy.name}
												heading={rwy.heading}
												windDir={windDir}
												crosswind={rwy.crosswind}
												headwind={rwy.headwind}
												isHeadwind={rwy.headwind > 0}
												isDanger={rwy.isDanger}
												dangerMessage={
													rwy.dangerMessage
												}
												index={rwy.index}
												isFirst={rwy.isFirst}
											/>
										);
									})}
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
					</>
				)
			)}
		</div>
	);
}

export default App;
