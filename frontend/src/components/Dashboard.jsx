import { lazy, memo, Suspense, useCallback, useMemo } from "react";

import { useRunwayAnalysis } from "../hooks/useRunwayAnalysis";
import { buildSummary, REASON_TEXT } from "../utils/summary";
import AircraftSelector from "./AircraftSelector";
import BriefingSummary from "./BriefingSummary";
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

// 每 15 秒的 VATSIM 輪詢只會換掉 briefing.vatsim；其餘面板的 props 引用不變，用 memo 跳過重新渲染
// （實測 4 次輪詢，天氣 / TAF / NOTAM 面板各被多渲染 4 次、跑道卡片 8 次）。
const MWeather = memo(WeatherDashboard);
const MTaf = memo(TafTimeline);
const MNotam = memo(NotamBoard);
const MStatus = memo(VatsimStatus);
const MTraffic = memo(VatsimTraffic);
const MRunwayCard = memo(RunwayCard);
const MLanding = memo(LandingWarning);
const MAircraft = memo(AircraftSelector);
const MLimit = memo(LimitControl);
const MSummary = memo(BriefingSummary);

const EMPTY = [];
const NO_SAFE_MESSAGE = {
	aerodrome: `🚨 ${REASON_TEXT.aerodrome}，請確認後再簽派。`,
	closed: `🚨 ${REASON_TEXT.closed}，沒有推薦跑道。`,
	wind: `🚨 ${REASON_TEXT.wind}，沒有推薦跑道。`,
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
	const { weather, taf, notams, runways, closures } = briefing;

	// 只依賴「真正會影響這些面板」的欄位；vatsim 變動不會產生新的 legacyData
	const legacyData = useMemo(
		() => ({ common: weather, taf, notam: notams, runways, closures }),
		[weather, taf, notams, runways, closures],
	);

	const vatsim = briefing.vatsim || {};
	const controller = vatsim.controllers || EMPTY;
	const arrivals = vatsim.arrivals || EMPTY;
	const departures = vatsim.departures || EMPTY;
	const cruisings = vatsim.cruisings || EMPTY;

	const analysisLimits = useMemo(
		() => ({
			CrossWindLimit: limits.cross,
			TailWindLimit: limits.tail,
			HeadWindLimit: limits.head,
		}),
		[limits],
	);
	const analysis = useRunwayAnalysis(legacyData, analysisLimits);
	const { processedRunways, windDir, isVariable, windSpeed, noSafeReason } = analysis;

	const summary = useMemo(
		() => buildSummary({ weather, analysis, closures, atcCount: controller.length }),
		[weather, analysis, closures, controller.length],
	);

	const setCross = useCallback((v) => setLimit("cross", v), [setLimit]);
	const setTail = useCallback((v) => setLimit("tail", v), [setLimit]);
	const setHead = useCallback((v) => setLimit("head", v), [setLimit]);

	const guard = (node, delay) => (
		<FadeIn delay={delay}>
			<ErrorBoundary resetKey={briefing.icao}>{node}</ErrorBoundary>
		</FadeIn>
	);

	return (
		<div className="dashboard-layout">
			<div className="bottom-full-width">
				<MSummary icao={briefing.icao} summary={summary} />
				<DataFreshness metarTime={weather?.time?.dt} fetchedAt={briefing.fetched_at} />
			</div>

			<div className="left-column">
				{guard(
					<MWeather
						data={legacyData}
						pressureUnit={pressureUnit}
						setPressureUnit={setPressureUnit}
					/>,
					0.1,
				)}
				{guard(<MTaf tafData={taf} />, 0.2)}
				{guard(<MNotam notams={notams} />, 0.3)}
			</div>

			<div className="right-column">
				{guard(<MStatus controller={controller} loading={false} />, 0.15)}
				{guard(
					<Suspense fallback={<div className="panel-card">載入雷達地圖…</div>}>
						<Radar
							arrivals={arrivals}
							departures={departures}
							cruisings={cruisings}
							airportLat={weather?.latitude}
							airportLon={weather?.longitude}
							icao={briefing.icao}
						/>
					</Suspense>,
					0.25,
				)}
				{guard(
					<MTraffic
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
						<MAircraft aircraft={aircraft} onSelect={selectAircraft} />

						<div className="limit-setting-section">
							<MLimit label="✈️ 機型側風限制" value={limits.cross} setValue={setCross} />
							<MLimit label="✈️ 機型順風限制" value={limits.tail} setValue={setTail} />
							<MLimit label="✈️ 機型頂風限制" value={limits.head} setValue={setHead} />
						</div>

						<MLanding data={legacyData} />

						<h2 className="section-title" id="runway-analysis">
							跑道分析
						</h2>
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
										<MRunwayCard
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
								<p style={{ textAlign: "center", color: "#94a3b8" }}>無跑道資料</p>
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
