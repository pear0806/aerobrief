import "../assets/styles/Skeleton.css";

const Skeleton = ({ slow = false }) => {
	return (
		<div className="radar-loader-container" role="status" aria-live="polite">
			<div className="radar-scope" aria-hidden="true">
				<div className="radar-sweep"></div>
				<div className="radar-grid"></div>
			</div>
			<p className="loading-text">
				📡 塔台連線中... 正在獲取最新氣象與流量
			</p>
			{slow && (
				<p className="loading-text slow-hint">
					伺服器回應較慢（可能正在喚醒），請再稍候幾秒…
				</p>
			)}
		</div>
	);
};

export default Skeleton;
