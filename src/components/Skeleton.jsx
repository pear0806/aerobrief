// src/components/SkeletonLoader.jsx
import "../assets/styles/Skeleton.css";

const SkeletonLoader = () => {
	return (
		<>
			<div className="skeleton skeleton-title"></div>

			<div className="metrics-grid">
				<div className="skeleton skeleton-metric"></div>
				<div className="skeleton skeleton-metric"></div>
				<div className="skeleton skeleton-metric"></div>
				<div className="skeleton skeleton-metric"></div>
			</div>

			<div className="skeleton skeleton-text"></div>

			<div className="skeleton skeleton-card"></div>
			<div className="skeleton skeleton-card"></div>
			<div className="skeleton skeleton-card"></div>
		</>
	);
};

export default SkeletonLoader;
