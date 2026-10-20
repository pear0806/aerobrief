// 安全標頭的單一來源：
//  - vite.config.js 的 preview.headers 套用它（e2e 在「帶 CSP」的環境下跑，CSP 擋到功能就會被抓到）
//  - vercel.json 必須與此一致（src/__tests__/securityHeaders.test.js 會檢查，避免兩份設定悄悄不同步）
//
// 註：
//  - style-src 需要 'unsafe-inline'：React 的 style={{}} 與 Leaflet 都會寫行內樣式。
//  - img-src 允許 https:：地圖圖磚來自 CARTO / Esri / OSM 等多個網域。
//  - connect-src 允許 https:：後端 API 網域依部署而異（VITE_API_URL）。
export const CSP = [
	"default-src 'self'",
	"script-src 'self'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data:",
	"connect-src 'self' https:",
	"worker-src 'self'",
	"manifest-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS = {
	"Content-Security-Policy": CSP,
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "geolocation=(), camera=(), microphone=(), payment=()",
	"X-Frame-Options": "DENY",
};
