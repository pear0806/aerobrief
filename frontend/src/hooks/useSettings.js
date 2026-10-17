import { useCallback, useEffect, useMemo, useState } from "react";

import { aircraftDatabase } from "../data/aircrafts.js";

export const DEFAULT_LIMITS = { cross: 15, tail: 10, head: 20 };
const KEYS = {
	cross: "crosswind-limit",
	tail: "tailwind-limit",
	head: "headwind-limit",
};

const num = (v) => {
	if (v === null || v === undefined || v === "") return null;
	const n = Number(v);
	return Number.isFinite(n) && n >= 0 ? n : null; // 允許 0（舊版 `|| 15` 會把 0 吃掉）
};

/**
 * 從 storage 還原設定，並保證「機型選單」與「實際限制值」一致：
 * 若存的限制值與所選機型的資料庫值不符，機型一律退回 CUSTOM。
 */
export function loadSettings(storage) {
	const get = (k) => {
		try {
			return storage?.getItem(k) ?? null;
		} catch {
			return null;
		}
	};

	const saved = {
		cross: num(get(KEYS.cross)),
		tail: num(get(KEYS.tail)),
		head: num(get(KEYS.head)),
	};
	let aircraft = get("aircraft");
	if (!aircraft || !aircraftDatabase[aircraft]) aircraft = "CUSTOM";

	const limits = { ...DEFAULT_LIMITS };
	if (aircraft !== "CUSTOM") {
		const db = aircraftDatabase[aircraft];
		for (const k of ["cross", "tail", "head"]) {
			if (saved[k] !== null && saved[k] !== db[k]) aircraft = "CUSTOM";
		}
	}
	const source = aircraft === "CUSTOM" ? DEFAULT_LIMITS : aircraftDatabase[aircraft];
	for (const k of ["cross", "tail", "head"]) {
		limits[k] = saved[k] ?? source[k];
	}

	const unit = get("pressure-unit");
	return {
		aircraft,
		limits,
		pressureUnit: unit === "inHg" ? "inHg" : "hPa",
	};
}

export function useSettings() {
	const [initial] = useState(() =>
		loadSettings(typeof localStorage === "undefined" ? null : localStorage),
	);
	const [aircraft, setAircraft] = useState(initial.aircraft);
	const [limits, setLimits] = useState(initial.limits);
	const [pressureUnit, setPressureUnit] = useState(initial.pressureUnit);

	useEffect(() => {
		try {
			localStorage.setItem("aircraft", aircraft);
			localStorage.setItem(KEYS.cross, limits.cross);
			localStorage.setItem(KEYS.tail, limits.tail);
			localStorage.setItem(KEYS.head, limits.head);
			localStorage.setItem("pressure-unit", pressureUnit);
		} catch {
			/* 隱私模式 / 額度已滿：設定只在本次工作階段有效 */
		}
	}, [aircraft, limits, pressureUnit]);

	/** 選擇機型：非 CUSTOM 時一併載入該機型限制 */
	const selectAircraft = useCallback((key) => {
		const data = aircraftDatabase[key];
		if (!data) return;
		setAircraft(key);
		if (key !== "CUSTOM") {
			setLimits({ cross: data.cross, tail: data.tail, head: data.head });
		}
	}, []);

	/** 手動改限制 → 機型自動切為 CUSTOM */
	const setLimit = useCallback((kind, value) => {
		setAircraft("CUSTOM");
		setLimits((prev) => ({ ...prev, [kind]: Number.isFinite(value) ? value : 0 }));
	}, []);

	return useMemo(
		() => ({
			aircraft,
			limits,
			pressureUnit,
			setPressureUnit,
			selectAircraft,
			setLimit,
		}),
		[aircraft, limits, pressureUnit, selectAircraft, setLimit],
	);
}
