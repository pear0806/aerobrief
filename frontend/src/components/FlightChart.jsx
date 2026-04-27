import "../assets/styles/FlightChart.css";

import React from "react";
import ReactPlotly from "react-plotly.js";

const Plot = ReactPlotly.default || ReactPlotly;

const FlightChart = ({ history = [], icao }) => {
	const times = history.map((h) => h.time);
	const arrCounts = history.map((h) => h.arrCount);
	const depCounts = history.map((h) => h.depCount);

	return (
		<div className="panel-card chart-wrapper">
			<h3 className="section-title">
				📊 {icao} 即時流量監測 (每 15s 更新)
			</h3>
			<Plot
				data={[
					{
						x: times,
						y: arrCounts,
						type: "scatter",
						mode: "lines+markers",
						name: "抵達數",
						line: { color: "#60a5fa", width: 3 },
						marker: { size: 8 },
					},
					{
						x: times,
						y: depCounts,
						type: "scatter",
						mode: "lines+markers",
						name: "離場數",
						line: { color: "#fbbf24", width: 3 },
						marker: { size: 8 },
					},
				]}
				layout={{
					autosize: true,
					paper_bgcolor: "transparent",
					plot_bgcolor: "transparent",
					font: { color: "#94a3b8" },
					xaxis: {
						gridcolor: "rgba(255,255,255,0.05)",
						title: "時間 (系統紀錄)",
					},
					yaxis: {
						gridcolor: "rgba(255,255,255,0.05)",
						title: "架次",
						rangemode: "nonnegative",
					},
					margin: { l: 40, r: 20, t: 10, b: 40 },
					legend: { orientation: "h", y: -0.2 },
				}}
				useResizeHandler={true}
				style={{ width: "100%", height: "300px" }}
			/>
		</div>
	);
};

export default FlightChart;
