import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CSP, SECURITY_HEADERS } from "../../security-headers.js";

// vitest 在 frontend/ 底下執行（本機與 CI 都是）
const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"));

describe("security headers", () => {
	it("vercel.json serves exactly the headers defined in security-headers.js (no drift)", () => {
		const all = vercel.headers.find((h) => h.source === "/(.*)").headers;
		const asObject = Object.fromEntries(all.map((h) => [h.key, h.value]));
		expect(asObject).toEqual(SECURITY_HEADERS);
	});

	it("hashed assets are cached immutably", () => {
		const a = vercel.headers.find((h) => h.source === "/assets/(.*)").headers[0];
		expect(a.value).toMatch(/max-age=31536000.*immutable/);
	});

	it("CSP is locked down: no inline/eval scripts, no plugins, no framing", () => {
		const d = Object.fromEntries(CSP.split("; ").map((x) => [x.split(" ")[0], x.split(" ").slice(1)]));
		expect(d["script-src"]).toEqual(["'self'"]);
		expect(d["default-src"]).toEqual(["'self'"]);
		expect(d["object-src"]).toEqual(["'none'"]);
		expect(d["frame-ancestors"]).toEqual(["'none'"]);
		expect(d["script-src"].join(" ")).not.toMatch(/unsafe/);
	});

	it("does not depend on Google Fonts (no render-blocking third-party CSS)", () => {
		expect(CSP).not.toMatch(/googleapis|gstatic/);
	});
});
