// src/components/SkeletonLoader.jsx
import "../assets/styles/Skeleton.css";

const SkeletonLoader = () => {
	return (
		<div style={{ marginTop: "20px" }}>
			<div className="skeleton skeleton-title"></div>

			<div
				className="metrics-grid"
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, 1fr)",
					gap: "15px",
					marginBottom: "20px",
				}}
			>
				<div className="skeleton skeleton-metric"></div>
				<div className="skeleton skeleton-metric"></div>
				<div className="skeleton skeleton-metric"></div>
				<div className="skeleton skeleton-metric"></div>
			</div>

			<div
				className="skeleton skeleton-text"
				style={{
					width: "40%",
					marginTop: "30px",
					marginBottom: "15px",
				}}
			></div>

			<div className="skeleton skeleton-card"></div>
			<div className="skeleton skeleton-card"></div>
			<div className="skeleton skeleton-card"></div>
		</div>
	);
};

export default SkeletonLoader;
