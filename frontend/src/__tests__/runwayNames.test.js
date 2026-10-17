import { describe, expect, it } from "vitest";

import { isRunwayClosed, normalizeIdent, reciprocal } from "../utils/runwayNames.js";

describe("reciprocal", () => {
	it.each([
		["05L", "23R"], ["23R", "05L"], ["09", "27"], ["36", "18"], ["18", "36"],
		["09C", "27C"], ["1", "19"], ["01R", "19L"],
	])("%s ↔ %s", (a, b) => expect(reciprocal(a)).toBe(b));

	it("returns null for junk", () => {
		expect(reciprocal("XX")).toBeNull();
		expect(reciprocal(null)).toBeNull();
	});
});

describe("normalizeIdent", () => {
	it("pads and uppercases", () => {
		expect(normalizeIdent("5l")).toBe("05L");
		expect(normalizeIdent(" 27 ")).toBe("27");
		expect(normalizeIdent("nope")).toBeNull();
	});
});

describe("isRunwayClosed", () => {
	const c = (closed_runways, aerodrome_closed = false) => ({ closed_runways, aerodrome_closed });

	it("no closures → open", () => {
		expect(isRunwayClosed("05L", null)).toBe(false);
		expect(isRunwayClosed("05L", c([]))).toBe(false);
	});
	it("closing one end closes the reciprocal end too", () => {
		expect(isRunwayClosed("05L", c(["05L"]))).toBe(true);
		expect(isRunwayClosed("23R", c(["05L"]))).toBe(true);
		expect(isRunwayClosed("05R", c(["05L"]))).toBe(false);
	});
	it("bare number closes the whole strip family", () => {
		expect(isRunwayClosed("09", c(["27"]))).toBe(true);
	});
	it("ALL and aerodrome closure close everything", () => {
		expect(isRunwayClosed("09", c(["ALL"]))).toBe(true);
		expect(isRunwayClosed("09", c([], true))).toBe(true);
	});
});
