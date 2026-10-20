# AeroBrief ✈️

[![CI](https://github.com/pear0806/aerobrief/actions/workflows/ci.yml/badge.svg)](https://github.com/pear0806/aerobrief/actions/workflows/ci.yml)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-005571?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Tool-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

> 輸入機場 ICAO 代碼，一頁看完天氣、跑道風分量、NOTAM 與 VATSIM 即時雷達，並自動推薦可用跑道。
> 專為虛擬飛行愛好者（Flight SIM / VATSIM / IVAO）打造的整合式飛行簡報儀表板。

🔗 **Live Demo**：<!-- TODO: 貼上部署網址，例如 https://aerobrief.vercel.app -->

<!-- TODO: 放 1–2 張截圖或一段 GIF，例如：
![AeroBrief 簡報畫面](docs/screenshot.png)
-->

---

## 目錄

- [核心功能](#-核心功能)
- [技術棧](#-技術棧)
- [專案架構](#-專案架構)
- [快速開始](#-快速開始)
- [API 設計](#-api-設計)
- [測試與 CI](#-測試與-ci)
- [技術決策](#-技術決策)
- [安全標頭與部署](#-安全標頭與部署)
- [已知限制](#️-已知限制)

---

## ✨ 核心功能

- **即時天氣儀表板**：整合 AVWX API，解析 METAR / TAF（含雲量、雲幕、PROB 機率），並以時間軸視覺化；顯示發布時間與資料年齡，超過 70 / 90 分鐘分別警示 / 標示可能過期，分頁回到前景時立即補更新。
- **跑道風分量分析**：計算頂風 / 側風並納入陣風；風向不定（VRB）時以風速保守評估；自動判斷是否超出機型限制，全部跑道超限時明確警告。
- **NOTAM 智能導讀**：自動解析航行通告並高亮關鍵資訊（機場關閉、跑道關閉、設備異常）；現行有效的關閉類公告預設展開，尚未生效者獨立分組。
- **NOTAM × 跑道整合**：被公告關閉的跑道（含對向端）不會被推薦，並以紅色虛線標示；機場整場關閉時直接警示。
- **VATSIM 即時雷達**：顯示以該機場為起飛 / 目的地的線上航班與巡航中航班，並比對線上航管；支援非 ICAO 開頭的呼號（如 `BN_TWR`、`JFK_TWR`），對照表來自 VATSpy data。每 15 秒更新。
- **自定義限制**：可選機型（A320 / A350 等）或手動設定；設定、最後查詢機場會保存；`?icao=RCTP` 連結可直接分享。
- **PWA**：可安裝到手機桌面。

---

## 🧰 技術棧

| 層級      | 技術                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| 前端      | React 18、Vite、Leaflet / react-leaflet、vite-plugin-pwa                                |
| 後端      | Python、FastAPI、httpx（共用連線池）、uvicorn                                           |
| 資料來源  | AVWX（METAR / TAF）、FAA NOTAM Search、VATSIM data、VATSpy data                         |
| 測試      | pytest（後端）、Vitest + Testing Library（前端）、Playwright + axe-core（E2E / 無障礙） |
| CI / 部署 | GitHub Actions、Dependabot、Vercel（前端）                                              |

---

## 📂 專案架構

```text
aerobrief/
├── .github/
│   ├── workflows/ci.yml        # CI：backend / frontend / e2e
│   └── dependabot.yml          # 每週自動更新依賴
├── backend/
│   ├── main.py                 # FastAPI 應用：路由、快取、限流、上游容錯
│   ├── notam_parser.py         # NOTAM 解析與關閉判斷
│   ├── ratelimit.py            # 每 IP 限流
│   ├── vatspy.py               # VATSpy 呼號前綴載入
│   ├── data/                   # vatspy_prefixes.json（VATSpy 快照）
│   ├── tests/                  # pytest 測試
│   ├── pytest.ini
│   └── requirements*.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # UI 元件
│   │   ├── hooks/              # useBriefing / useGateway / useRunwayAnalysis …
│   │   ├── utils/              # 風分量、單位換算、摘要等純函式
│   │   ├── data/               # 機型資料庫
│   │   └── __tests__/          # Vitest 單元 / 元件 / 無障礙測試
│   ├── e2e/                    # Playwright 端對端測試
│   ├── playwright.config.js
│   ├── security-headers.js     # CSP 等安全標頭（單一來源）
│   └── vercel.json             # 部署標頭與快取設定
├── scripts/
│   ├── update_vatspy_prefixes.py   # 更新呼號前綴對照表
│   └── live_probe.py               # 探測真實 API 的資料格式（開發用）
└── README.md
```

---

## 🚀 快速開始

### 前置需求

- Node.js ≥ 18（CI 使用 20）
- Python ≥ 3.9（CI 使用 3.12）
- AVWX API Token 👉 https://avwx.rest/

### 後端（FastAPI）

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

建立 `backend/.env`（範本見 `.env.example`）：

```env
AVWX_TOKEN=your_api_token_here
```

啟動：

```bash
uvicorn main:app --reload       # http://127.0.0.1:8000
```

<details>
<summary>可選的環境變數</summary>

| 變數                 | 預設                                                 | 說明                                                                                                             |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `CORS_ORIGINS`       | `http://localhost:5173,https://aerobrief.vercel.app` | 逗號分隔的允許來源                                                                                               |
| `CORS_ORIGIN_REGEX`  | `^https://aerobrief(-[a-z0-9]+)*\.vercel\.app$`      | 額外允許（Vercel preview）；設為空字串停用                                                                       |
| `RATE_LIMIT_PER_MIN` | `120`                                                | 每個 IP 每分鐘請求上限；`0` 停用。`/api/status` 不計                                                             |
| `TRUST_PROXY`        | 關閉                                                 | 設為 `1` 時以 `X-Forwarded-For` 第一段作為 client IP（部署在 Render 等反向代理後必開，否則所有人共用同一個額度） |
| `CACHE_MAX_ENTRIES`  | `2000`                                               | 記憶體快取上限，超過時先清過期、再丟最舊的                                                                       |
| `LOG_LEVEL`          | `INFO`                                               | 應用程式日誌等級                                                                                                 |
| `SLOW_REQUEST_MS`    | `2000`                                               | 超過此毫秒數的請求記一筆警告；每個回應帶 `X-Response-Time` 標頭                                                  |

</details>

### 前端（React + Vite）

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

前端環境變數見 `frontend/.env.example`（`VITE_API_URL`、選填的 `VITE_CARTO_KEY`；未設定 CARTO key 時自動退回免 key 的 Esri 深色底圖）。

---

## 🔌 API 設計

| Method | Endpoint              | 說明                                                          |
| ------ | --------------------- | ------------------------------------------------------------- |
| POST   | `/api/gateway`        | `GET_FULL_BRIEFING`（完整簡報）／`GET_VATSIM`（僅雷達與航管） |
| GET    | `/api/weather/{icao}` | METAR / TAF / 跑道 / NOTAM                                    |
| GET    | `/api/vatsim/{icao}`  | VATSIM 航管與航班                                             |
| GET    | `/api/status`         | 健康檢查：版本、運行時間、快取筆數、各上游最近成功 / 失敗時間 |

- ICAO 代碼須符合 `^[A-Z0-9]{4}$`；錯誤時回傳對應 HTTP 狀態碼與 `{success:false, error:{message}}`。
- TAF 或 NOTAM 失敗時簡報仍會回傳，並於 `warnings` 欄位說明。
- 簡報額外欄位：`closures`（現行有效 NOTAM 的關閉彙整）、`fetched_at`、`runways[].approx`（方位為估算）。
- 超過限流回 `429`（含 `Retry-After` 與 CORS 標頭）。

---

## 🧪 測試與 CI

```bash
# 後端（CI 門檻：覆蓋率 90%）
cd backend && pip install -r requirements-dev.txt
python -m pytest --cov=. --cov-fail-under=90

# 前端：lint + 單元 / 元件 / 無障礙測試（含覆蓋率門檻）+ build
cd frontend && npm install
npm run lint && npm run test:coverage && npm run build

# 端對端（真實瀏覽器，桌面 + 手機）
cd frontend && npx playwright install chromium && npm run e2e
```

E2E 會自行 build 並以 `vite preview` 啟動（套用與正式環境相同的安全標頭），所有 API 與地圖請求都在測試內被攔截，**不需要網路或金鑰**。

**GitHub Actions**（`.github/workflows/ci.yml`）每次 push / PR 自動執行三個 job：

| Job        | 內容                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| `backend`  | 安裝依賴 → pytest（覆蓋率 < 90% 失敗）                                                 |
| `frontend` | `npm ci` → ESLint → vitest 覆蓋率 → build                                              |
| `e2e`      | Playwright 真實 Chromium：CSP、sticky 表頭、axe 色彩對比、觸控目標、雷達取景、手機版面 |

`.github/dependabot.yml` 每週檢查 pip / npm 依賴、每月檢查 GitHub Actions 版本。

---

## 🧠 技術決策

- **上游故障降級（stale-if-error）**：METAR / TAF / NOTAM / 測站資料過期後仍保留寬限期（METAR 30 分、TAF 與 NOTAM 1 小時、測站 7 天）。上游逾時、5xx、429 時回傳舊資料並在 `warnings` 標註「N 分鐘前的快取資料」，之後 30 秒內不再重打上游。4xx（如 ICAO 不存在）是明確答案，不會用舊資料掩蓋。
- **上游保護**：同一 key 的並行請求共用一次上游呼叫；AVWX 4xx 短暫記住 120 秒，逾時 / 5xx 不記，可立即重試。
- **效能**：直接使用 `JSONResponse`（跳過 `jsonable_encoder`）、NOTAM 分類結果依文字快取、共用 HTTP 連線池、GZip 壓縮 ≥ 1 KB 的回應。
- **安全標頭單一來源**：`security-headers.js` 同時供 vite preview 與測試使用，`vercel.json` 必須與它一致，由 `securityHeaders.test.js` 檢查，避免兩份設定悄悄不同步。
- **NOTAM 判斷偏保守**：`CLSD EXC …` 這類部分限制也視為關閉；`PAPI/LGT/ILS NOT AVBL` 這類設施不可用則不視為跑道關閉。
- **不載入 Web Fonts**：Google Fonts 的 `@import` 會擋住整份 CSS 渲染，改用系統字型（已安裝 Inter 者優先使用）。

---

## 🔒 安全標頭與部署

前端部署於 Vercel。`frontend/security-headers.js` 是 CSP 等標頭的單一來源，CSP 禁止行內 / eval 腳本與嵌入框架，並允許 `https:` 的圖磚與 API；改用自己的圖磚或 API 網域通常不需改 CSP，若要收緊請同時修改 `security-headers.js` 與 `vercel.json`。

後端部署在反向代理（如 Render）後請設定 `TRUST_PROXY=1`。

### 更新 VATSIM 呼號前綴對照表

`backend/data/vatspy_prefixes.json` 是 VATSpy data 的快照。遇到「某機場有航管在線卻沒顯示」，或每隔數月執行一次：

```bash
python scripts/update_vatspy_prefixes.py
```

---

## ⚠️ 已知限制

- **輔助資訊，不可作為實際飛航簽派依據。**
- NOTAM 來源為 FAA NOTAM Search 的非官方介面，可能隨時改版；非美國機場資料完整度不一。需帶完整瀏覽器標頭否則會被 403；單頁最多 30 筆、後端最多取 4 頁，不足時簡報會提示「NOTAM 可能不完整」。
- NOTAM 解析仰賴英文縮寫，非標準寫法可能漏判，請務必閱讀原文。時間一律為 UTC（`EST` 後綴是 ICAO 的「預估」，不是美東時區）。
- METAR 風向與 AVWX 跑道 `bearing` 皆為真北，風分量計算基準一致；但塔台 / ATIS 報的風是磁北，數值會有數度差異。
- 機型風速限制為通用參考值（尚未逐一核對 FCOM），請以 FCOM / 公司 SOP 為準。
- 限流為單程序記憶體內實作；多 worker 部署時每個 worker 各自計數。
- 自訂限制的預設頂風值為 50 kts（與機型資料庫的「極端天氣停飛標準」一致）；已儲存過設定的使用者不受影響。
- 過期資料備援顯示的是舊資料，頁首的 METAR 發布時間與資料年齡會如實反映，請以 METAR 時間判斷是否採用。

---

## 📄 授權

本專案以 [MIT License](./LICENSE) 授權。<!-- TODO: 記得在專案根目錄新增 LICENSE 檔 -->
