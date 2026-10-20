import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SearchBar from "../components/SearchBar.jsx";

const props = { icao: "RCTP", setIcao() {}, onSearch() {}, loading: false, favorite: [], toggleFavorite() {} };
afterEach(() => vi.unstubAllGlobals());

describe("SearchBar autofocus", () => {
	it("focuses the input on desktop (fine pointer)", () => {
		vi.stubGlobal("matchMedia", () => ({ matches: false }));
		const { container } = render(<SearchBar {...props} />);
		expect(document.activeElement).toBe(container.querySelector(".search-input"));
	});
	it("REGRESSION: does not focus on touch devices (the keyboard would cover half the page on load)", () => {
		vi.stubGlobal("matchMedia", (q) => ({ matches: q.includes("coarse") }));
		const { container } = render(<SearchBar {...props} />);
		expect(document.activeElement).not.toBe(container.querySelector(".search-input"));
	});
	it("still focuses when matchMedia is unavailable", () => {
		vi.stubGlobal("matchMedia", undefined);
		const { container } = render(<SearchBar {...props} />);
		expect(document.activeElement).toBe(container.querySelector(".search-input"));
	});
});
