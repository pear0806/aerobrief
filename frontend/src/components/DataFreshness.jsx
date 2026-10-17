import "../assets/styles/DataFreshness.css";

import { useEffect, useState } from "react";

import {
	ageMinutes,
	FETCH_STALE_MIN,
	formatAge,
	METAR_STALE_MIN,
	METAR_WARN_MIN,
} from "../utils/time.js";

const useNow = (intervalMs = 30_000) => {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);
	return now;
};

/** 顯示 METAR 發布時間與「本頁資料上次成功更新」的年齡；過期時用顏色與文字警示。 */
const DataFreshness = ({ metarTime, fetchedAt, now: nowProp }) => {
	const tick = useNow();
	const now = nowProp ?? tick;

	const metarAge = metarTime ? ageMinutes(metarTime, now) : null;
	const fetchAge = fetchedAt ? Math.max(0, Math.round((now - fetchedAt * 1000) / 60000)) : null;

	if (metarAge === null && fetchAge === null) return null;

	const level =
		metarAge !== null && metarAge >= METAR_STALE_MIN
			? "stale"
			: (metarAge !== null && metarAge >= METAR_WARN_MIN) ||
					(fetchAge !== null && fetchAge >= FETCH_STALE_MIN)
				? "warn"
				: "ok";

	const utc = metarTime ? new Date(metarTime).toISOString().slice(11, 16) : null;

	return (
		<div className={`data-freshness ${level}`} role="status">
			{metarAge !== null && (
				<span>
					🕒 METAR 發布 {utc}Z（{formatAge(metarAge)}）
				</span>
			)}
			{fetchAge !== null && (
				<span className="fetch-age">
					更新於 {fetchAge < 1 ? "剛剛" : formatAge(fetchAge)}
				</span>
			)}
			{level === "stale" && (
				<strong>⚠️ METAR 已超過 {METAR_STALE_MIN} 分鐘，可能已過期，請勿直接採用</strong>
			)}
			{level === "warn" && fetchAge !== null && fetchAge >= FETCH_STALE_MIN && (
				<strong>⚠️ 背景更新似乎失敗，顯示的可能是舊資料</strong>
			)}
		</div>
	);
};

export default DataFreshness;
