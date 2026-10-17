import { lazy, memo, Suspense, useMemo } from "react";

import { useRunwayAnalysis } from "../hooks/useRunwayAnalysis";
import AircraftSelector from "./AircraftSelector";
import DataFreshness from "./DataFreshness";
import ErrorBoundary from "./ErrorBoundary";
import FadeIn from "./FadeIn";
import LandingWarning from "./LandingWarning";
import LimitControl from "./LimitControl";
import NotamBoard from "./NotamDashboard";
import RunwayCard from "./RunwayCard";
import RunwayMap from "./RunwayMap";
import TafTimeline from "./TafTimeline";
import VatsimStatus from "./VatsimStatus";
import VatsimTraffic from "./VatsimTraffic";
import WeatherDashboard from "./WeatherDashboard";

// Leaflet 約佔 bundle 的 4 成，而雷達在畫面下半部：延遲載入，首屏更快
const Radar = lazy(() => import("./Radar"));

const NO_SAFE_MESSAGE = {
	aerodrome: "🚨 NOTAM 公告機場關閉，請確認後再簽派。",
	closed: "🚨 所有跑道都被 NOTAM 公告關閉，沒有推薦跑道。",
	wind: "🚨 所有跑道都超出目前設定的風速限制，沒有推薦跑道。",
};

/**
 * 儀表板主體。用 memo 包起來：使用者在搜尋框打字（App 重新渲染）時，
 * 只要 briefing / 設定沒變，這整棵樹就不會重算，也不會讓 RunwayMap 重新掛載。
 */
const Dashboard = memo(function Dashboard({
	briefing,
	aircraft,
	limits,
	pressureUnit,
	setPressureUnit,
	selectAircraft,
	setLimit,
}) {
	const legacyData = useMemo(
		() => ({
			common: briefing.weather,
			taf: briefing.taf,
			notam: briefing.notams,
			runways: briefing.runways,
			closures: briefing.closures,
		}),
		[briefing],
	);

	const vatsim = briefing.vatsim || {};
	const controller = vatsim.controllers || [];
	const arrivals = vatsim.arrivals || [];
	const departures = vatsim.departures || [];
	const cruisings = vatsim.cruisings || [];

	const analysisLimits = useMemo(
		() => ({
			CrossWindLimit: limits.cross,
			TailWindLimit: limits.tail,
			HeadWindLimit: limits.head,
		}),
		[limits],
	);
	const { processedRunways, windDir, windSpeed, isVariable, noSafeReason } =
		useRunwayAnalysis(legacyData, analysisLimits);

	const guard = (node, delay) => (
		<FadeIn delay={delay}>
			<ErrorBoundary resetKey={briefing.icao}>{node}</ErrorBoundary>
		</FadeIn>
	);

	return (
		<div className="dashboard-layout">
			<div className="bottom-full-width">
				<DataFreshness
					metarTime={briefing.weather?.time?.dt}
					fetchedAt={briefing.fetched_at}
				/>
			</div>

			<div className="left-column">
				{guard(
					<WeatherDashboard
						data={legacyData}
						pressureUnit={pressureUnit}
						setPressureUnit={setPressureUnit}
					/>,
					0.1,
				)}
				{guard(<TafTimeline tafData={briefing.taf} />, 0.2)}
				{guard(<NotamBoard notams={briefing.notams} />, 0.3)}
			</div>

			<div className="right-column">
				{guard(<VatsimStatus controller={controller} loading={false} />, 0.15)}
				{guard(
					<Suspense fallback={<div className="panel-card">載入雷達地圖…</div>}>
						<Radar
							arrivals={arrivals}
							departures={departures}
							cruisings={cruisings}
							airportLat={briefing.weather?.latitude}
							airportLon={briefing.weather?.longitude}
							icao={briefing.icao}
						/>
					</Suspense>,
					0.25,
				)}
				{guard(
					<VatsimTraffic
						arrivals={arrivals}
						departures={departures}
						cruisings={cruisings}
					/>,
					0.35,
				)}
			</div>

			<div className="bottom-full-width">
				{guard(
					<>
						<AircraftSelector aircraft={aircraft} onSelect={selectAircraft} />

						<div className="limit-setting-section">
							<LimitControl
								label="✈️ 機型側風限制"
								value={limits.cross}
								setValue={(v) => setLimit("cross", v)}
							/>
							<LimitControl
								label="✈️ 機型順風限制"
								value={limits.tail}
								setValue={(v) => setLimit("tail", v)}
							/>
							<LimitControl
								label="✈️ 機型頂風限制"
								value={limits.head}
								setValue={(v) => setLimit("head", v)}
							/>
						</div>

						<LandingWarning data={legacyData} />

						<h3 className="section-title">跑道分析</h3>
						{isVariable && (
							<div className="error-message">
								⚠️ 風向不定 (VRB) {windSpeed} kts：無法計算各跑道風分量，已以風速本身保守評估。
							</div>
						)}
						{noSafeReason && (
							<div className="error-message" role="alert">
								{NO_SAFE_MESSAGE[noSafeReason]}
							</div>
						)}
						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
							{processedRunways.length > 0 ? (
								<>
									<RunwayMap
										key={briefing.icao}
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
											isClosed={rwy.isClosed}
											approx={rwy.approx}
											dangerMessage={rwy.dangerMessage}
											index={rwy.index}
											isFirst={rwy.isFirst}
										/>
									))}
								</>
							) : (
								<p style={{ textAlign: "center", color: "#666" }}>無跑道資料</p>
							)}
						</div>
					</>,
					0.4,
				)}
			</div>
		</div>
	);
});

export default Dashboard;
