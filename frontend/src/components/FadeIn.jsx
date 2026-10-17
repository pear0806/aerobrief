// 純 CSS 進場動畫（取代 framer-motion，省下約 35% 的 bundle 原始碼）。
// 尊重 prefers-reduced-motion（見 App.css）。
const FadeIn = ({ children, delay = 0 }) => (
	<div className="fade-in" style={{ animationDelay: `${delay}s` }}>
		{children}
	</div>
);

export default FadeIn;
