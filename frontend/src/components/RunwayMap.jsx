import "../assets/styles/RunwayMap.css";

const RunwayMap = ({ runways, windDir }) => {
	if (!runways || runways.length === 0) return null;

	const size = 320;
	const center = size / 2;
	const runwayLength = 200;

	const uniqueStrips = Array.from(
		new Set(
			runways.map((r) => {
				const match = r.name.match(/\d+/);
				if (!match) return 0;
				let num = parseInt(match[0], 10);
				return num > 18 ? num - 18 : num;
			}),
		),
	)
		.filter((n) => n > 0)
		.sort((a, b) => a - b);

	const getOffset = (name) => {
		const numMatch = name.match(/\d+/);
		if (!numMatch) return 0;

		const num = parseInt(numMatch[0], 10);
		const hasL = name.includes("L");
		const hasR = name.includes("R");
		const hasC = name.includes("C");

		const isOpposite = num > 18;
		const stripNum = isOpposite ? num - 18 : num;

		let stripSuffix = "";
		if (hasL) stripSuffix = isOpposite ? "R" : "L";
		if (hasR) stripSuffix = isOpposite ? "L" : "R";
		if (hasC) stripSuffix = "C";

		const groupIndex = uniqueStrips.indexOf(stripNum);
		const groupSpacing = 70;

		const baseSpread =
			uniqueStrips.length > 1
				? (groupIndex - (uniqueStrips.length - 1) / 2) * groupSpacing
				: 0;

		const lrSpread = stripSuffix === "L" ? -22 : stripSuffix === "R" ? 22 : 0;

		const stripOffset = baseSpread + lrSpread;

		return isOpposite ? -stripOffset : stripOffset;
	};

	const rad = (deg) => (deg * Math.PI) / 180;
	// 把「旋轉前」的點 (dx, dy)（相對中心）轉成實際畫面座標，讓文字能保持直立
	const rotated = (dx, dy, deg) => ({
		x: center + dx * Math.cos(rad(deg)) - dy * Math.sin(rad(deg)),
		y: center + dx * Math.sin(rad(deg)) + dy * Math.cos(rad(deg)),
	});

	return (
		<div className="runway-map-wrapper">
			<h4 className="map-title">機場跑道俯視幾何圖 (North Up)</h4>

			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="runway-svg"
				role="img"
				aria-label={`跑道俯視圖：${runways.map((r) => r.name).join("、")}${
					windDir != null ? `，風向 ${windDir}°` : ""
				}`}
			>
				<circle
					cx={center}
					cy={center}
					r={size / 2 - 10}
					className="map-outer-ring"
				/>
				<text x={center} y="25" className="compass-text" textAnchor="middle">
					N
				</text>
				{runways.map((rwy) => {
					const offsetX = getOffset(rwy.name);
					return (
						<g
							key={rwy.name}
							transform={`rotate(${rwy.heading}, ${center}, ${center})`}
						>
							<line
								x1={center + offsetX}
								y1={center - runwayLength / 2}
								x2={center + offsetX}
								y2={center + runwayLength / 2}
								className={`map-runway-line ${
									rwy.isClosed
										? "closed-runway"
										: rwy.isFirst
											? "best-runway"
											: "normal-runway"
								}`}
							/>
							{rwy.isFirst && (
								<circle
									cx={center + offsetX}
									cy={center + runwayLength / 2}
									r="5"
									className="best-runway-dot"
								/>
							)}
						</g>
					);
				})}
				{runways.map((rwy) => {
					// 標在「該方向的入口端」（線的下端，航向朝上）
					const pt = rotated(getOffset(rwy.name), runwayLength / 2 + 14, rwy.heading);
					return (
						<text
							key={`label-${rwy.name}`}
							x={pt.x}
							y={pt.y}
							textAnchor="middle"
							dominantBaseline="middle"
							className={`runway-label ${rwy.isClosed ? "closed" : ""}`}
						>
							{rwy.name}
						</text>
					);
				})}
				{windDir != null && (
					<g transform={`rotate(${windDir}, ${center}, ${center})`}>
						<line
							x1={center}
							y1={35}
							x2={center}
							y2={70}
							className="map-wind-arrow"
						/>
						<polygon
							points={`${center},70 ${center - 6},55 ${center + 6},55`}
							fill="#ef4444"
						/>
					</g>
				)}{" "}
			</svg>

			<div className="map-legend">
				<span className="legend-item">
					<span className="dot blue-dot"></span> 推薦起飛/降落端
				</span>
				<span className="legend-item">
					<span className="dot red-dot"></span> 風向來源
				</span>
				{runways.some((r) => r.isClosed) && (
					<span className="legend-item">
						<span className="dot closed-dot"></span> NOTAM 關閉
					</span>
				)}
			</div>
		</div>
	);
};

export default RunwayMap;
