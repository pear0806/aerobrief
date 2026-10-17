import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotamBoard from "../components/NotamDashboard.jsx";

const mk = (over) => ({
	category: "🚧 滑行道關閉",
	raw: "E) TWY R CLSD",
	state: "active",
	start_time: "2026-10-16 00:00Z",
	end_time: "2026-10-20 00:00Z",
	...over,
});

describe("NotamDashboard", () => {
	it("upcoming NOTAMs are grouped separately and never styled as danger", () => {
		const { container } = render(
			<NotamBoard
				notams={[
					mk({
						category: "🚨 跑道關閉",
						state: "upcoming",
						start_time: "2026-10-23 00:00Z",
					}),
					mk({ category: "🚨 跑道關閉", state: "active" }),
				]}
			/>,
		);
		expect(screen.getByText(/尚未生效/)).toBeTruthy();
		const upcomingHeader = screen.getByText(/尚未生效/).closest("button");
		expect(upcomingHeader.className).not.toContain("header-danger");
		const dangerHeaders = container.querySelectorAll("button.header-danger");
		expect(dangerHeaders).toHaveLength(1);
	});

	it("shows times labelled UTC when expanded", () => {
		// 非關閉類（導航設施）預設收合 → 點開後才看得到
		render(<NotamBoard notams={[mk({ category: "📡 導航設施" })]} />);
		expect(screen.queryByText(/UTC/)).toBeNull();
		fireEvent.click(screen.getByText(/導航設施/).closest("button"));
		expect(screen.getByText(/UTC/)).toBeTruthy();
	});

	it("unparseable dates are flagged instead of labelled UTC", () => {
		render(
			<NotamBoard
				notams={[
					mk({ state: "unknown", start_time: "weird", end_time: "weird" }),
				]}
			/>,
		);
		// 滑行道關閉為現行有效類別 → 預設展開，不需點擊
		expect(screen.getByText(/時間無法解析/)).toBeTruthy();
	});
});

describe("NotamDashboard default expansion", () => {
	it("active closures are expanded by default; others and upcoming are collapsed", () => {
		render(
			<NotamBoard
				notams={[
					mk({ category: "🚨 機場關閉", raw: "E) AD CLSD", id: "A1" }),
					mk({ category: "🚨 跑道關閉", raw: "E) RWY 05L CLSD", id: "A2", state: "upcoming" }),
					mk({ category: "📝 一般資訊", raw: "E) GENERAL INFO", id: "A3" }),
				]}
			/>,
		);
		expect(screen.getByText("E) AD CLSD")).toBeTruthy();
		expect(screen.queryByText("E) RWY 05L CLSD")).toBeNull();
		expect(screen.queryByText("E) GENERAL INFO")).toBeNull();
		expect(screen.getByText("A1")).toBeTruthy(); // 顯示 NOTAM 編號
	});

	it("user toggle overrides the default and aria-expanded follows", () => {
		render(<NotamBoard notams={[mk({ id: "T1" })]} />);
		const btn = screen.getByText(/滑行道關閉/).closest("button");
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByText("E) TWY R CLSD")).toBeNull();
	});
});

describe("NotamDashboard categories", () => {
	it("airspace activity gets the warning style, not danger", () => {
		const { container } = render(
			<NotamBoard notams={[mk({ category: "⚠️ 空域活動（無人機／煙火等）" })]} />,
		);
		expect(container.querySelector("button.header-warning")).toBeTruthy();
		expect(container.querySelector("button.header-danger")).toBeNull();
	});
});
