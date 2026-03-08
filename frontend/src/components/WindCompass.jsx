import "../assets/styles/WindCompass.css";

const WindCompass = ({ runwayHeading, windDir }) => {
	if (windDir === null || windDir === undefined || windDir === "VRB") {
		return (
			<div className="compass-container vrb-wind">
				<span className="vrb-text">VRB</span>
			</div>
		);
	}

	const rotation = Number(windDir) - Number(runwayHeading);

	return (
		<div className="compass-container">
			<div className="crosshair-h"></div>
			<div className="crosshair-v"></div>

			<div className="runway-graphic">
				<div className="runway-line"></div>
			</div>

			<div
				className="wind-arrow"
				style={{
					transform: `rotate(${rotation}deg)`,
				}}
			>
				<div className="wind-line-body"></div>
				<div className="wind-arrow-head"></div>
			</div>

			<div className="compass-center"></div>
		</div>
	);
};

export default WindCompass;
