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
		render(<NotamBoard notams={[mk()]} />);
		fireEvent.click(screen.getByText(/滑行道關閉/).closest("button"));
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
		fireEvent.click(screen.getByText(/滑行道關閉/).closest("button"));
		expect(screen.getByText(/時間無法解析/)).toBeTruthy();
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
