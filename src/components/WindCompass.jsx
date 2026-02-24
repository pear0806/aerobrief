// src/components/WindCompass.jsx
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
			<div className="runway-graphic">
				<div className="runway-line"></div>
			</div>

			<div
				className="wind-arrow"
				style={{
					transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
				}}
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path d="M12 2L19 21L12 17L5 21L12 2Z" fill="#38bdf8" />
				</svg>
			</div>

			<div className="compass-center"></div>
		</div>
	);
};

export default WindCompass;
