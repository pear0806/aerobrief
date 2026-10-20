import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	BACKGROUND_TIMEOUT_MS, FOREGROUND_TIMEOUT_MS, RETRY_DELAY_MS, SLOW_HINT_MS, useGateway,
} from "../hooks/useGateway.js";

const ok = (data) => ({ ok: true, status: 200, json: async () => ({ success: true, data, error: null }) });
const envelopeErr = (status, message) => ({ ok: false, status, json: async () => ({ success: false, error: { message } }) });
const proxyErr = (status) => ({ ok: false, status, json: async () => { throw new Error("html"); } });

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const call = async (hook, ...args) => {
	let p;
	act(() => { p = hook.result.current.callGateway(...args); });
	return p;
};

describe("useGateway retry & slow hint", () => {
	it("success path returns data and clears loading", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ a: 1 }));
		const h = renderHook(() => useGateway());
		const p = call(h, "GET_FULL_BRIEFING", { icao: "RCTP" });
		await act(async () => { await vi.advanceTimersByTimeAsync(0); });
		expect(await p).toEqual({ a: 1 });
		expect(h.result.current.loading).toBe(false);
		expect(h.result.current.slow).toBe(false);
	});

	it("REGRESSION: a network failure (server waking up) is retried once and then succeeds", async () => {
		const spy = vi.spyOn(globalThis, "fetch")
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValueOnce(ok({ a: 1 }));
		const h = renderHook(() => useGateway());
		const p = call(h, "X", {});
		await act(async () => { await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10); });
		expect(await p).toEqual({ a: 1 });
		expect(spy).toHaveBeenCalledTimes(2);
		expect(h.result.current.error).toBeNull();
	});

	it("a proxy 503 without our JSON envelope is retried; with the envelope it is NOT", async () => {
		const a = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(proxyErr(503)).mockResolvedValueOnce(ok(1));
		const h1 = renderHook(() => useGateway());
		const p1 = call(h1, "X", {});
		await act(async () => { await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10); });
		expect(await p1).toBe(1);
		expect(a).toHaveBeenCalledTimes(2);
		a.mockReset();

		// 後端自己回的 502（例如「無法取得 METAR」）是明確答案，重試只會浪費時間
		const b = vi.spyOn(globalThis, "fetch").mockResolvedValue(envelopeErr(502, "無法取得 ZZZZ 的 METAR"));
		const h2 = renderHook(() => useGateway());
		const p2 = call(h2, "X", {});
		await act(async () => { await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10); });
		expect(await p2).toBeNull();
		expect(b).toHaveBeenCalledTimes(1);
		expect(h2.result.current.error).toBe("無法取得 ZZZZ 的 METAR");
	});

	it("gives up after one retry with the error message", async () => {
		const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
		const h = renderHook(() => useGateway());
		const p = call(h, "X", {});
		await act(async () => { await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10); });
		expect(await p).toBeNull();
		expect(spy).toHaveBeenCalledTimes(2);
		expect(h.result.current.error).toMatch(/Failed to fetch/);
	});

	it("background polling never retries and stays silent", async () => {
		const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
		const h = renderHook(() => useGateway());
		const p = call(h, "GET_VATSIM", {}, true);
		await act(async () => { await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10); });
		expect(await p).toBeNull();
		expect(spy).toHaveBeenCalledTimes(1);
		expect(h.result.current.error).toBeNull();
		expect(h.result.current.loading).toBe(false);
	});

	it("shows the 'slow server' hint after 4s and clears it afterwards", async () => {
		let release;
		vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((r) => { release = () => r(ok(1)); }));
		const h = renderHook(() => useGateway());
		const p = call(h, "X", {});
		expect(h.result.current.slow).toBe(false);
		await act(async () => { await vi.advanceTimersByTimeAsync(SLOW_HINT_MS + 10); });
		expect(h.result.current.slow).toBe(true);
		expect(h.result.current.loading).toBe(true);
		await act(async () => { release(); await vi.advanceTimersByTimeAsync(0); });
		await p;
		expect(h.result.current.slow).toBe(false);
	});

	it("foreground waits longer than background before timing out", async () => {
		expect(FOREGROUND_TIMEOUT_MS).toBeGreaterThan(BACKGROUND_TIMEOUT_MS);
		vi.spyOn(globalThis, "fetch").mockImplementation((_u, { signal }) => new Promise((_, rej) => {
			signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })));
		}));
		const h = renderHook(() => useGateway());
		const p = call(h, "X", {});
		await act(async () => { await vi.advanceTimersByTimeAsync(BACKGROUND_TIMEOUT_MS + 100); });
		expect(h.result.current.loading).toBe(true); // 12s 還沒放棄
		await act(async () => { await vi.advanceTimersByTimeAsync(FOREGROUND_TIMEOUT_MS); });
		expect(await p).toBeNull();
		expect(h.result.current.error).toBe("連線逾時，請稍後再試");
	});
});
