import { Component } from "react";

// 單一面板出錯時不讓整個畫面白屏；resetKey 變動（例如換機場）時自動重置
export default class ErrorBoundary extends Component {
	state = { error: null };

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		console.error("[ErrorBoundary]", this.props.label || "", error, info);
	}

	componentDidUpdate(prev) {
		if (this.state.error && prev.resetKey !== this.props.resetKey) {
			this.setState({ error: null });
		}
	}

	render() {
		if (this.state.error) {
			return (
				<div className="error-message" role="alert">
					⚠️ {this.props.label || "此區塊"}顯示失敗，其他資料不受影響。
					<button
						style={{ marginLeft: 8 }}
						onClick={() => this.setState({ error: null })}
					>
						重試
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}
