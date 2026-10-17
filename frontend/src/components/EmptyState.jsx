const POPULAR = ["RCTP", "RCSS", "RCKH", "RJTT", "RJAA", "VHHH", "KJFK", "EGLL"];

const EmptyState = ({ onPick }) => (
	<div className="empty-state">
		<h2>開始你的飛行簡報</h2>
		<p>輸入 4 碼 ICAO 機場代碼，或選一個常用機場：</p>
		<div className="empty-state-chips">
			{POPULAR.map((code) => (
				<button key={code} type="button" onClick={() => onPick(code)}>
					{code}
				</button>
			))}
		</div>
	</div>
);

export default EmptyState;
