import "../assets/styles/Skeleton.css";

const Skeleton = () => {
	return (
		<div className="radar-loader-container">
			<div className="radar-scope">
				<div className="radar-sweep"></div>
				<div className="radar-grid"></div>
			</div>
			<p className="loading-text">
				📡 塔台連線中... 正在獲取最新氣象與流量
			</p>
		</div>
	);
};

export default Skeleton;
