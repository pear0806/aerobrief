import "../assets/styles/RunwayMap.css";

const RunwayMap = ({ runways, windDir }) => {
	if (!runways || runways.length === 0) return null;

	const size = 320;
	const center = size / 2;
	const runwayLength = 200;

	// ✨ 1. 動態搜集這個機場有幾組「獨立」的跑道數字
	// 例如 KLAX 會有 06 和 07，這裡會抽出 [6, 7]
	const uniqueStrips = Array.from(
		new Set(
			runways.map((r) => {
				const match = r.name.match(/\d+/);
				if (!match) return 0;
				let num = parseInt(match[0], 10);
				return num > 18 ? num - 18 : num; // 把 24 轉回 6，當作同一組
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

		// 翻轉相反端的 L/R (因為 24R 降落，其實是在 06L 的實體跑道上)
		let stripSuffix = "";
		if (hasL) stripSuffix = isOpposite ? "R" : "L";
		if (hasR) stripSuffix = isOpposite ? "L" : "R";
		if (hasC) stripSuffix = "C";

		// ✨ 2. 完美分組平移演算法
		const groupIndex = uniqueStrips.indexOf(stripNum);
		const groupSpacing = 70; // 每組數字（如 06 和 07）相距 70px

		// 讓所有群組在畫面上「置中對齊」
		const baseSpread =
			uniqueStrips.length > 1
				? (groupIndex - (uniqueStrips.length - 1) / 2) * groupSpacing
				: 0;

		// 同一組裡面的 L / C / R 互相拉開距離
		const lrSpread =
			stripSuffix === "L" ? -22 : stripSuffix === "R" ? 22 : 0;

		const stripOffset = baseSpread + lrSpread;

		// 旋轉 180 度的相反端，X 座標必須加負號才能幾何重合
		return isOpposite ? -stripOffset : stripOffset;
	};

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
					r={size / 2 - 10}
					className="map-outer-ring"
				/>
				<text
					x={center}
					y="25"
					className="compass-text"
					textAnchor="middle"
				>
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
								className={`map-runway-line ${rwy.isFirst ? "best-runway" : "normal-runway"}`}
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
			</svg>

			<div className="map-legend">
				<span className="legend-item">
					<span className="dot blue-dot"></span> 推薦起飛/降落端
				</span>
				<span className="legend-item">
					<span className="dot red-dot"></span> 風向來源
				</span>
			</div>
		</div>
	);
};

export default RunwayMap;
