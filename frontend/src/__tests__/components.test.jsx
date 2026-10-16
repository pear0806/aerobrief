import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LandingWarning from "../components/LandingWarning.jsx";
import TafTimeline from "../components/TafTimeline.jsx";
import WeatherDashboard from "../components/WeatherDashboard.jsx";

const base = {
	station: "RCTP",
	flight_rules: "VFR",
	elevation_ft: 106,
	wind_direction: { value: 90 },
	wind_speed: { value: 10 },
	visibility: { value: 9999 },
	altimeter: { value: 1013 },
	temperature: { value: 25 },
	raw: "RCTP 150000Z 09010KT 9999 FEW020 25/20 Q1013",
};

describe("WeatherDashboard", () => {
	it("renders normal METAR", () => {
		render(
			<WeatherDashboard
				data={{ common: base }}
				pressureUnit="hPa"
				setPressureUnit={() => {}}
			/>,
		);
		expect(screen.getByText(/RAW METAR/)).toBeTruthy();
	});
	it("BUG: does not crash when wind_direction is null", () => {
		const data = { common: { ...base, wind_direction: null } };
		expect(() =>
			render(
				<WeatherDashboard
					data={data}
					pressureUnit="hPa"
					setPressureUnit={() => {}}
				/>,
			),
		).not.toThrow();
	});
	it("BUG: does not show NaN when temperature missing", () => {
		const data = { common: { ...base, temperature: null } };
		const { container } = render(
			<WeatherDashboard
				data={data}
				pressureUnit="hPa"
				setPressureUnit={() => {}}
			/>,
		);
		expect(container.textContent).not.toContain("NaN");
	});
	it("BUG: visibility unit should follow data units, not hardcoded 'sm'", () => {
		const data = { common: { ...base, units: { visibility: "m" } } };
		const { container } = render(
			<WeatherDashboard
				data={data}
				pressureUnit="hPa"
				setPressureUnit={() => {}}
			/>,
		);
		expect(container.textContent).not.toMatch(/9999\s*sm/);
	});
});

describe("TafTimeline", () => {
	it("returns nothing without data", () => {
		const { container } = render(<TafTimeline tafData={null} />);
		expect(container.innerHTML).toBe("");
	});
	it("BUG: VRB wind should not render as 'VRB°'", () => {
		const taf = {
			raw: "x",
			forecast: [
				{
					type: "FROM",
					flight_rules: "VFR",
					wind_direction: null,
					wind_speed: { value: 3 },
				},
			],
		};
		const { container } = render(<TafTimeline tafData={taf} />);
		expect(container.textContent).not.toContain("VRB°");
	});
});

describe("LandingWarning", () => {
	it("no warning for VFR", () => {
		const { container } = render(
			<LandingWarning data={{ common: { flight_rules: "VFR" } }} />,
		);
		expect(container.innerHTML).toBe("");
	});
	it("LIFR shows ceiling in feet", () => {
		render(
			<LandingWarning
				data={{
					common: {
						flight_rules: "LIFR",
						visibility: { repr: "0800" },
						clouds: [{ type: "OVC", altitude: 3 }],
					},
				}}
			/>,
		);
		expect(screen.getByText("300 ft")).toBeTruthy();
	});
});
