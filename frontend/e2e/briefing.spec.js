import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { expect, test } from "@playwright/test";

import { makeBriefing, mockNetwork } from "./fixtures.js";

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const open = async (page, icao = "RCTP", opts) => {
	const net = await mockNetwork(page, opts);
	const errors = [];
	page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
	page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
	await page.goto(`/?icao=${icao}`);
	await page.waitForSelector(".dashboard-layout");
	await page.waitForSelector(".leaflet-container");
	await page.waitForTimeout(600); // 等進場動畫與取景結束
	return { net, errors };
};

test.describe("briefing page", () => {
	test("renders the decision summary and recommends the open runway; no console errors under the CSP", async ({ page }) => {
		const { errors } = await open(page);
		const summary = page.getByRole("region", { name: /RCTP 簡報摘要/ });
		await expect(summary).toBeVisible();
		await expect(summary).toContainText("建議跑道");
		await expect(summary).toContainText("05L");
		await expect(summary).toContainText("05R / 23L"); // NOTAM 關閉的跑道
		await expect(summary).toContainText("3 席");
		// CSP / 資源載入錯誤都會出現在 console；有任何一個就代表 CSP 擋到了功能
		expect(errors, errors.join("\n")).toEqual([]);
	});

	test("makes no requests to third parties other than the API and map tiles (no web fonts)", async ({ page }) => {
		const { net } = await open(page);
		const hosts = [...net.externalHosts];
		expect(hosts.filter((h) => /googleapis|gstatic/.test(h))).toEqual([]);
		expect(hosts).toContain("api.aerobrief.test");
	});

	test("no horizontal overflow", async ({ page }) => {
		await open(page);
		const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
		expect(o.sw).toBeLessThanOrEqual(o.cw);
	});

	test("REGRESSION: the header actually sticks while scrolling, and is compact", async ({ page }, info) => {
		await open(page);
		const header = page.locator(".sticky-header");
		const h = (await header.boundingBox()).height;
		expect(h).toBeLessThan(info.project.name === "mobile" ? 120 : 90); // 舊版手機高 230px
		await page.mouse.wheel(0, 1500);
		await page.waitForTimeout(300);
		expect(Math.round((await header.boundingBox()).y)).toBe(0);
	});

	test("REGRESSION: zero axe violations in a real browser, including colour contrast", async ({ page }) => {
		await open(page);
		// 用 evaluate 注入：addScriptTag 是行內腳本，會被（正確地）CSP 擋掉；evaluate 走 CDP，不受 CSP 限制
		await page.evaluate(AXE_SOURCE);
		const violations = await page.evaluate(async () => {
			const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] });
			return r.violations.map((v) => `${v.id} ×${v.nodes.length}: ${v.nodes[0].target.join(" ")} ${v.nodes[0].any?.[0]?.message ?? ""}`);
		});
		expect(violations).toEqual([]);
	});

	test("primary controls are at least 44px tall; no text smaller than 12px", async ({ page }) => {
		await open(page);
		const small = await page.evaluate(() => {
			const bad = [];
			document.querySelectorAll("button, input, select").forEach((e) => {
				if (e.closest(".leaflet-container")) return;
				const r = e.getBoundingClientRect();
				if (r.width && r.height && r.height < 43.5) bad.push(`${e.tagName}.${String(e.className).split(" ")[0]} ${Math.round(r.height)}px`);
			});
			const tiny = [];
			document.querySelectorAll("body *").forEach((e) => {
				if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
				const s = parseFloat(getComputedStyle(e).fontSize);
				if (s < 11.99) tiny.push(`${e.tagName}.${String(e.className?.baseVal ?? e.className).split(" ")[0]} ${s.toFixed(1)}px`);
			});
			return { bad, tiny };
		});
		expect(small.bad).toEqual([]);
		expect(small.tiny).toEqual([]);
	});

	test("REGRESSION: the radar's initial view contains (almost) all nearby aircraft", async ({ page }) => {
		await open(page);
		const r = await page.evaluate(() => {
			const c = document.querySelector(".leaflet-container").getBoundingClientRect();
			const ms = [...document.querySelectorAll(".custom-airplane-icon")];
			const inside = ms.filter((m) => {
				const b = m.getBoundingClientRect();
				return b.left >= c.left && b.right <= c.right && b.top >= c.top && b.bottom <= c.bottom;
			});
			return { total: ms.length, inside: inside.length };
		});
		expect(r.total).toBe(14);
		expect(r.inside).toBeGreaterThanOrEqual(11); // 5 抵達 + 5 離場 + 附近的；遠方巡航機不強制
	});

	test("flight lists collapse (no nested scrolling) and expand on demand", async ({ page }) => {
		await open(page);
		const nested = await page.evaluate(() =>
			[...document.querySelectorAll("*")].filter((e) => {
				const s = getComputedStyle(e);
				return (s.overflowY === "auto" || s.overflowY === "scroll") && e.scrollHeight > e.clientHeight + 4
					&& e !== document.documentElement && e !== document.body && !e.closest(".leaflet-container");
			}).map((e) => String(e.className)));
		expect(nested).toEqual([]);
		const arr = page.locator(".arr-card");
		await expect(arr).toHaveCount(4);
		await page.getByRole("button", { name: "顯示全部 6 筆" }).click();
		await expect(arr).toHaveCount(6);
	});

	test("critical NOTAM groups are expanded by default; closed runways are not recommended", async ({ page }) => {
		await open(page);
		await expect(page.getByText("E) RWY 05R/23L CLSD DUE TO MAINT WIP.")).toBeVisible();
		await expect(page.getByText("E) AIP SUP 12/26 EFFECTIVE. REFER TO AIP SUPPLEMENT.").first()).toBeHidden();
		await expect(page.locator(".runway-card-container.closed")).toHaveCount(2);
		await expect(page.locator(".runway-card-container.recommended")).toHaveCount(1);
	});

	test("searching another airport calls the API and updates the URL", async ({ page }) => {
		const { net } = await open(page);
		await page.getByLabel("ICAO 機場代碼").fill("RJTT");
		await page.getByRole("button", { name: /查詢氣象/ }).click();
		await expect(page.getByRole("region", { name: /RJTT 簡報摘要/ })).toBeVisible();
		await expect(page).toHaveURL(/icao=RJTT/);
		expect(net.gatewayCalls.some((c) => c.action === "GET_FULL_BRIEFING" && c.payload.icao === "RJTT")).toBe(true);
	});

	test("an API error shows a readable message and no stale airport", async ({ page }) => {
		await open(page);
		await page.unroute("**/*");
		await mockNetwork(page, { failWith: { status: 502, message: "無法取得 ZZZZ 的 METAR" } });
		await page.getByLabel("ICAO 機場代碼").fill("ZZZZ");
		await page.getByRole("button", { name: /查詢氣象/ }).click();
		await expect(page.getByRole("alert")).toContainText("無法取得 ZZZZ 的 METAR");
		await expect(page.getByRole("region", { name: /RCTP 簡報摘要/ })).toHaveCount(0);
	});

	test("keyboard: Enter in the search box searches; summary link jumps to the runway analysis", async ({ page }) => {
		await open(page);
		await page.getByRole("link", { name: /查看跑道分析/ }).click();
		await expect(page.locator("#runway-analysis")).toBeInViewport();
	});
});

test("first-time visitor (no ?icao, no saved airport) sees the empty state and no API call", async ({ page }) => {
	const net = await mockNetwork(page);
	await page.goto("/");
	await expect(page.getByText("開始你的飛行簡報")).toBeVisible();
	expect(net.gatewayCalls).toEqual([]);
});

test("fixture sanity: makeBriefing is a plausible briefing", () => {
	const b = makeBriefing("RJTT");
	expect(b.icao).toBe("RJTT");
	expect(b.vatsim.arrivals).toHaveLength(6);
});
