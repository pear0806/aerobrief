import { useCallback, useEffect, useRef, useState } from "react";

import { useGateway } from "./useGateway.js";

export const VATSIM_POLL_MS = 15_000;
export const WEATHER_POLL_MS = 300_000;
const VISIBLE_REFRESH_MIN_MS = 60_000;

/**
 * 簡報狀態 + 輪詢。
 * - 任何晚到的舊機場回應都不得覆蓋目前機場（activeIcaoRef）。
 * - 查詢失敗會清掉舊簡報，避免畫面上還留著「上一個機場」的資料卻顯示新機場的錯誤。
 * - 背景輪詢失敗則保留舊資料（由 DataFreshness 顯示資料年齡）。
 * - 分頁回到前景時立即補更新，不必等下一輪計時器。
 */
export function useBriefing() {
	const { callGateway, loading, slow, error } = useGateway();
	const [briefing, setBriefing] = useState(null);
	const activeIcaoRef = useRef(null);

	const search = useCallback(
		async (icao) => {
			activeIcaoRef.current = icao;
			const result = await callGateway("GET_FULL_BRIEFING", { icao });
			if (activeIcaoRef.current !== icao) return false; // 已改查別的機場
			setBriefing(result || null);
			return !!result;
		},
		[callGateway],
	);

	const target = briefing?.icao;
	useEffect(() => {
		if (!target) return;
		const isCurrent = () => activeIcaoRef.current === target;
		const last = { weather: Date.now(), vatsim: Date.now() };
		const busy = { weather: false, vatsim: false };

		const refreshVatsim = async () => {
			if (busy.vatsim || busy.weather) return;
			busy.vatsim = true;
			try {
				const vatsim = await callGateway("GET_VATSIM", { icao: target }, true);
				if (vatsim && isCurrent()) {
					last.vatsim = Date.now();
					setBriefing((prev) =>
						prev && prev.icao === target ? { ...prev, vatsim } : prev,
					);
				}
			} finally {
				busy.vatsim = false;
			}
		};

		const refreshWeather = async () => {
			if (busy.weather) return;
			busy.weather = true;
			try {
				const result = await callGateway("GET_FULL_BRIEFING", { icao: target }, true);
				if (result && isCurrent()) {
					last.weather = last.vatsim = Date.now();
					setBriefing(result);
				}
			} finally {
				busy.weather = false;
			}
		};

		const vatsimTimer = setInterval(() => {
			if (!document.hidden) refreshVatsim();
		}, VATSIM_POLL_MS);
		const weatherTimer = setInterval(() => {
			if (!document.hidden) refreshWeather();
		}, WEATHER_POLL_MS);

		const onVisible = () => {
			if (document.hidden) return;
			const now = Date.now();
			if (now - last.weather > VISIBLE_REFRESH_MIN_MS) refreshWeather();
			else if (now - last.vatsim > VATSIM_POLL_MS) refreshVatsim();
		};
		document.addEventListener("visibilitychange", onVisible);

		return () => {
			clearInterval(vatsimTimer);
			clearInterval(weatherTimer);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [target, callGateway]);

	return { briefing, loading, slow, error, search };
}
