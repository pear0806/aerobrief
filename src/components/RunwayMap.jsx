import "../assets/styles/RunwayMap.css";

const RunwayMap = ({ runways, windDir }) => {
	if (!runways || runways.length === 0) return null;

	const size = 220;
	const center = size / 2;
	const runwayLength = 140;

	return (
		<div className="runway-map-wrapper">
			<h4 className="map-title">機場跑道俯視幾何圖 (North Up)</h4>

			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="runway-svg"
			>
				<circle
					cx={center}
					cy={center}
					r={size / 2 - 2}
					className="map-outer-ring"
				/>
				<text
					x={center}
					y="15"
					className="compass-text"
					textAnchor="middle"
				>
					N
				</text>

				{runways.map((rwy) => {
					return (
						<g
							key={rwy.name}
							transform={`rotate(${rwy.heading}, ${center}, ${center})`}
						>
							<line
								x1={center}
								y1={center - runwayLength / 2}
								x2={center}
								y2={center + runwayLength / 2}
								className={`map-runway-line ${rwy.isFirst ? "best-runway" : "normal-runway"}`}
							/>
							{rwy.isFirst && (
								<circle
									cx={center}
									cy={center + runwayLength / 2}
									r="6"
									className="best-runway-dot"
								/>
							)}
						</g>
					);
				})}

				<g transform={`rotate(${windDir}, ${center}, ${center})`}>
					<line
						x1={center}
						y1={25}
						x2={center}
						y2={60}
						className="map-wind-arrow"
					/>
					<polygon
						points={`${center},60 ${center - 6},45 ${center + 6},45`}
						fill="#ef4444"
					/>
				</g>
			</svg>

			<div className="map-legend">
				<span className="legend-item">
					<span className="dot blue-dot"></span> 推薦起降端
				</span>
				<span className="legend-item">
					<span className="dot red-dot"></span> 風向來源
				</span>
			</div>
		</div>
	);
};

export default RunwayMap;
