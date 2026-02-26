import { useEffect, useState } from "react";
import { useAvwx } from "./hooks/useAvwx";
import { useVatsim } from "./hooks/useVatsim";
import { calculateCrosswind } from "./utils/caclRWYwind";

import SearchBar from "./components/SearchBar";
import WeatherDashboard from "./components/WeatherDashboard";
import RunwayCard from "./components/RunwayCard";
import Skeleton from "./components/Skeleton";
import LimitControl from "./components/LimitControl";
import VatsimStatus from "./components/VatsimStatus";
import VatsimTraffic from "./components/VatsimTraffic";
import TafTimeline from "./components/TafTimeline";

import "./assets/styles/App.css";
import { aircraftDatabase } from "./data/aircrafts";

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

	const handleOnSearch = () => {
		fetchWeather();
		fetchVatsimData();
	};

	const handleAirCraftChange = (e) => {
		const selected = e.target.value;
		setAircraft(selected);
		const data = aircraftDatabase[selected];
		if (selected !== "CUSTOM") {
			setCrossWindLimit(data.cross);
			setTailWindLimit(data.tail);
			setHeadWindLimit(data.head);
		}
	};

	return (
		<div className="app-container">
			<h1 className="title">✈️ AeroBrief</h1>

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

						<VatsimStatus
							controller={controller}
							loading={vatsimLoading}
						></VatsimStatus>

						<VatsimTraffic
							arrivals={arrivals}
							departures={departures}
						/>

						<div className="aircraft-dropdown">
							<label>✈️ 快速載入機型限制：</label>
							<select
								value={aircraft}
								onChange={handleAirCraftChange}
								className="aircraft-select"
							>
								{Object.entries(aircraftDatabase).map(
									([key, aircraft]) => (
										<option key={key} value={key}>
											{aircraft.name}({key})
										</option>
									),
								)}
							</select>
						</div>

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

						<h3 className="section-title">跑道分析</h3>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "10px",
							}}
						>
							{data.runways && data.runways.length > 0 ? (
								(() => {
									const windSpd =
										data.common.wind_speed?.value || 0;
									const windDir =
										data.common.wind_direction?.value || 0;
									const proccessed = data.runways.map(
										(rwy, index) => {
											const { crosswind, headwind } =
												calculateCrosswind(
													rwy.heading,
													windDir,
													windSpd,
												);

											let isDanger = false,
												isCrossWindDanger,
												isTailWindDanger,
												isHeadWindDanger,
												dangerMessage;

											if (crosswind > CrossWindLimit) {
												isCrossWindDanger = true;
											}

											if (
												headwind > 0 &&
												headwind > HeadWindLimit
											) {
												isHeadWindDanger = true;
											}

											if (
												headwind < 0 &&
												Math.abs(headwind) >
													TailWindLimit
											) {
												isTailWindDanger = true;
											}

											if (
												isCrossWindDanger ||
												isTailWindDanger ||
												isHeadWindDanger
											) {
												isDanger = true;
											}

											if (
												isCrossWindDanger &&
												isTailWindDanger
											) {
												dangerMessage =
													"⚠️ 側風、尾風超限";
											} else if (
												isCrossWindDanger &&
												isHeadWindDanger
											) {
												dangerMessage =
													"⚠️ 側風、頂風超限";
											} else if (isCrossWindDanger) {
												dangerMessage = "⚠️ 側風超限";
											} else if (isTailWindDanger) {
												dangerMessage = "⚠️ 尾風超限";
											} else if (isHeadWindDanger) {
												dangerMessage = "⚠️ 頂風超限";
											}

											return {
												name: rwy.name,
												heading: rwy.heading,
												crosswind: crosswind,
												headwind: headwind,
												isDanger: isDanger,
												dangerMessage: dangerMessage,
												index: index,
											};
										},
									);

									console.log(
										"proccessed RWY : ",
										proccessed,
									);

									const sortedRunway = [...proccessed].sort(
										(a, b) => {
											return b.headwind - a.headwind;
										},
									);

									const bestRunwayHeading =
										proccessed[0].name.replace(
											/[^0-9]/g,
											"",
										);

									sortedRunway.map((rwy) => {
										const heading = rwy.name.replace(
											/[^0-9]/g,
											"",
										);
										const isFirst =
											heading === bestRunwayHeading;

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
												isFirst={isFirst}
											/>
										);
									});
								})()
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
