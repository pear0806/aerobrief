const LimitControl = ({ label, value, setValue }) => (
	<div className="limit-setting">
		<span>{label}</span>
		<div>
			<input
				className="limit-setting-input"
				type="number"
				value={value}
				onChange={(e) => setValue(Number(e.target.value))}
				min={0}
			/>
			<span style={{ marginLeft: "5px" }}>kts</span>
		</div>
	</div>
);

export default LimitControl;
