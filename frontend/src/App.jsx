import "./assets/styles/App.css";

import { useCallback, useEffect, useRef, useState } from "react";

import Dashboard from "./components/Dashboard";
import EmptyState from "./components/EmptyState";
import SearchBar from "./components/SearchBar";
import Skeleton from "./components/Skeleton";
import { useBriefing } from "./hooks/useBriefing";
import { useSettings } from "./hooks/useSettings";

const ICAO_RE = /^[A-Z0-9]{4}$/;
const MAX_FAVORITES = 8;

const readStorage = (key) => {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
};

/** 啟動時要自動載入的機場：網址 ?icao= 優先，其次是上次查詢（回訪使用者）。 */
const initialTarget = () => {
	const fromUrl = new URLSearchParams(window.location.search)
		.get("icao")
		?.trim()
		.toUpperCase();
	if (fromUrl && ICAO_RE.test(fromUrl)) return fromUrl;
	const saved = readStorage("last-icao")?.trim().toUpperCase();
	return saved && ICAO_RE.test(saved) ? saved : null;
};

const syncUrl = (icao) => {
	try {
		const url = new URL(window.location.href);
		url.searchParams.set("icao", icao);
		window.history.replaceState(null, "", url);
	} catch {
		/* 非瀏覽器環境 */
	}
};

function App() {
	const [autoTarget] = useState(initialTarget);
	const [icao, setIcao] = useState(autoTarget || "RCTP");
	const [favorite, setFavorite] = useState(() => {
		try {
			const saved = JSON.parse(readStorage("favorite"));
			return Array.isArray(saved) ? saved : [];
		} catch {
			return [];
		}
	});
	const [notice, setNotice] = useState(null);

	const settings = useSettings();
	const { briefing, loading, error, search } = useBriefing();

	useEffect(() => {
		try {
			localStorage.setItem("last-icao", icao);
		} catch {
			/* ignore */
		}
	}, [icao]);
	useEffect(() => {
		try {
			localStorage.setItem("favorite", JSON.stringify(favorite));
		} catch {
			/* ignore */
		}
	}, [favorite]);

	const toggleFavorite = (target) => {
		if (!target) return;
		if (favorite.includes(target)) {
			setFavorite(favorite.filter((id) => id !== target));
			setNotice(null);
		} else if (favorite.length >= MAX_FAVORITES) {
			setNotice(`收藏清單已滿 (最多 ${MAX_FAVORITES} 個)`);
		} else {
			setFavorite([...favorite, target]);
			setNotice(null);
		}
	};

	const [inputError, setInputError] = useState(null);

	const handleOnSearch = useCallback(
		async (targetIcao) => {
			const searchIcao = (typeof targetIcao === "string" ? targetIcao : icao)
				.trim()
				.toUpperCase();

			if (!ICAO_RE.test(searchIcao)) {
				setInputError("請輸入 4 碼 ICAO 機場代碼（例如 RCTP）");
				return;
			}
			setInputError(null);
			setNotice(null);
			const ok = await search(searchIcao);
			if (ok) syncUrl(searchIcao);
		},
		[icao, search],
	);

	// 回訪使用者 / 分享連結：開啟時自動載入（ref 防 StrictMode 重複觸發）
	const didAutoLoad = useRef(false);
	useEffect(() => {
		if (didAutoLoad.current || !autoTarget) return;
		didAutoLoad.current = true;
		search(autoTarget);
	}, [autoTarget, search]);

	const pick = (code) => {
		setIcao(code);
		handleOnSearch(code);
	};

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
				<div className="error-message" role="alert">
					⚠️ {inputError || error}
				</div>
			)}
			{notice && <div className="notice-banner">⚠️ {notice}</div>}
			{(briefing?.warnings || []).map((w) => (
				<div key={w} className="error-message">
					⚠️ {w}
				</div>
			))}
			{briefing?.vatsim?.error && (
				<div className="error-message">⚠️ {briefing.vatsim.error}</div>
			)}

			{loading ? (
				<Skeleton />
			) : briefing ? (
				<Dashboard
					briefing={briefing}
					aircraft={settings.aircraft}
					limits={settings.limits}
					pressureUnit={settings.pressureUnit}
					setPressureUnit={settings.setPressureUnit}
					selectAircraft={settings.selectAircraft}
					setLimit={settings.setLimit}
				/>
			) : (
				!error && !inputError && <EmptyState onPick={pick} />
			)}
		</div>
	);
}

export default App;
