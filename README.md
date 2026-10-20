# AeroBrief ✈️

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Tool-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

AeroBrief 是一個專為虛擬飛行愛好者（Flight SIM / VATSIM / IVAO 使用者）打造的整合式飛行簡報儀表板，提供天氣解析、跑道風分量計算、NOTAM 導讀與即時雷達資訊。

---

## ✨ 核心功能

- **即時天氣儀表板 (Weather Dashboard)**
    - 整合 AVWX API
    - 解析 METAR / TAF（TAF 含雲量/雲幕、PROB 機率）
    - 提供時間軸視覺化
    - 顯示 METAR 發布時間與資料年齡；超過 70 / 90 分鐘分別警示 / 標示可能過期；分頁回到前景時立即補更新

- **跑道風分量分析**
    - 計算 Headwind / Crosswind，並納入陣風 (Gust)
    - 風向不定 (VRB) 時以風速保守評估
    - 自動判斷是否超出機型限制；全部跑道超限時明確警告
    - **整合 NOTAM**：被公告關閉的跑道（含對向端）不會被推薦，並以紅色虛線標示；機場整場關閉時直接警示
    - 跑道俯視圖標註跑道號碼；沒有精確方位的跑道會標示「估算」

- **VATSIM 即時雷達**
    - 航管比對支援非 ICAO 開頭的呼號（澳洲 `BN_TWR`、美國 `JFK_TWR`、`BN-F_APP` 等），對照表來自 VATSpy data
    - 顯示「以該機場為起飛／目的地」的線上航班（依飛行計畫篩選，非距離篩選）與巡航中航班
    - 每 15 秒更新（輕量端點，天氣每 5 分鐘、且後端有快取）

- **NOTAM 智能導讀**
    - 自動解析航行通告
    - 高亮關鍵資訊（機場關閉、跑道關閉、設備異常）；現行有效的關閉類公告預設展開

- **自定義限制設定**
    - 可設定不同機型（A320 / A350 等）；機型選單與實際套用的限制值保證一致（手動改數值會切為「自訂」）
    - 即時風險提示
    - 設定（機型、限制、氣壓單位）、最後查詢機場會保存；`?icao=RCTP` 連結可直接分享

---

## 📂 專案架構

    aerobrief/
    ├── backend/
    │   ├── main.py
    │   ├── notam_parser.py
    │   └── requirements.txt
    ├── frontend/
    │   ├── src/
    │   │   ├── components/
    │   │   ├── hooks/
    │   │   ├── utils/
    │   │   └── data/
    │   └── package.json
    └── README.md

---

## 🚀 本地端啟動指南 (Getting Started)

### 📋 前置需求

- Node.js ≥ 18
- Python ≥ 3.9
- AVWX API Token 👉 https://avwx.rest/

---

## 🖥️ 後端設定 (Backend - FastAPI)

1. 進入後端資料夾：

    ```bash
    cd backend
    ```

2. 建立虛擬環境：

    ```bash
    python -m venv venv
    ```

3. 啟動虛擬環境：

    _macOS / Linux_:

    ```bash
    source venv/bin/activate
    ```

    _Windows_:

    ```bash
    venv\Scripts\activate
    ```

4. 安裝套件：

    ```bash
    pip install -r requirements.txt
    ```

5. 設定環境變數：

建立 `.env`：

    AVWX_TOKEN=your_api_token_here

可選的環境變數（見 `backend/.env.example`）：

| 變數 | 預設 | 說明 |
| ---- | ---- | ---- |
| `CORS_ORIGINS` | `http://localhost:5173,https://aerobrief.vercel.app` | 逗號分隔的允許來源 |
| `CORS_ORIGIN_REGEX` | `^https://aerobrief(-[a-z0-9]+)*\.vercel\.app$` | 額外允許（Vercel preview）；設為空字串停用 |
| `RATE_LIMIT_PER_MIN` | `120` | 每個 IP 每分鐘請求上限；`0` 停用。`/api/status` 不計 |
| `TRUST_PROXY` | 關閉 | 設為 `1` 時以 `X-Forwarded-For` 第一段作為 client IP（部署在 Render 等反向代理後必開，否則所有人共用同一個額度） |
| `CACHE_MAX_ENTRIES` | `2000` | 記憶體快取上限，超過時先清過期、再丟最舊的 |
| `LOG_LEVEL` | `INFO` | 應用程式日誌等級（含時間戳） |
| `SLOW_REQUEST_MS` | `2000` | 超過這個毫秒數的請求會記一筆警告日誌；每個回應也帶 `X-Response-Time` 標頭 |

6. 啟動後端：
    ```bash
    uvicorn main:app --reload
    ```

預設運行：

    http://127.0.0.1:8000

---

## 🌐 前端設定 (Frontend - React + Vite)

1. 進入前端資料夾：

    ```bash
    cd frontend

    ```

2. 安裝套件：

    ```bash
    npm install

    ```

3. 啟動開發伺服器：
    ```bash
    npm run dev
    ```

預設：

    http://localhost:5173

---

## 🔌 API 設計（簡要）

| Method | Endpoint            | 說明                                                       |
| ------ | ------------------- | ---------------------------------------------------------- |
| POST   | /api/gateway        | `GET_FULL_BRIEFING`（完整簡報）／`GET_VATSIM`（僅雷達與航管） |
| GET    | /api/weather/{icao} | METAR / TAF / 跑道 / NOTAM（失敗回 4xx/5xx）               |
| GET    | /api/vatsim/{icao}  | VATSIM 航管與航班                                          |
| GET    | /api/status         | 健康檢查                                                   |

ICAO 代碼需符合 `^[A-Z0-9]{4}$`；錯誤時回傳對應 HTTP 狀態碼與 `{success:false, error:{message}}`。
TAF 或 NOTAM 失敗時簡報仍會回傳，並於 `warnings` 欄位說明。

簡報額外欄位：`closures`（`{aerodrome_closed, closed_runways, notam_ids}`，僅彙整**現行有效**的 NOTAM）、`fetched_at`（伺服器取得資料的 Unix 秒）；`runways[].approx` 表示方位為估算。
超過限流時回 `429`（含 `Retry-After` 與 CORS 標頭）。

上游保護：同一 key 的並行請求共用一次上游呼叫；AVWX 回 4xx（多為不存在的 ICAO）會短暫記住 120 秒，逾時 / 5xx 不記，可立即重試。

**上游故障時的降級（stale-if-error）：** METAR / TAF / NOTAM / 測站資料過期後仍保留一段寬限期（METAR 30 分、TAF 與 NOTAM 1 小時、測站 7 天）。上游逾時、5xx 或 429 時回傳舊資料，並在 `warnings` 標註「N 分鐘前的快取資料」；之後 30 秒內不再重打上游，避免故障時每個請求都等逾時。4xx（例如 ICAO 不存在）是明確答案，不會用舊資料掩蓋。

效能：回應使用 `JSONResponse`（跳過 FastAPI 的 `jsonable_encoder`）、NOTAM 分類結果依文字快取、共用 HTTP 連線池（keep-alive）、並以 GZip 壓縮 ≥1 KB 的回應。

`GET /api/status` 回傳版本、運行時間、快取筆數、VATSIM 資料年齡，以及各上游（`avwx` / `faa` / `vatsim`）最近一次成功與失敗的時間，方便判斷是上游掛了還是自己的問題。

---

### 更新 VATSIM 呼號前綴對照表

`backend/data/vatspy_prefixes.json` 是 VATSpy data 的快照。遇到「某機場有航管在線卻沒顯示」，或每隔數月執行一次：

    python scripts/update_vatspy_prefixes.py

---

## 🧪 測試

    # 後端
    cd backend && pip install -r requirements-dev.txt && python -m pytest

    # 後端（含覆蓋率；CI 門檻 90%）
    cd backend && python -m pytest --cov=. --cov-fail-under=90

    # 前端：lint + 單元 / 元件 / jsdom 無障礙測試（含覆蓋率門檻）+ build
    cd frontend && npm install && npm run lint && npm run test:coverage && npm run build

    # 端對端（真實瀏覽器，桌面 + 手機）：CSP、sticky 表頭、axe 色彩對比、觸控目標、雷達取景…
    cd frontend && npx playwright install chromium && npm run e2e

e2e 會自己 build 並以 `vite preview` 啟動（套用與正式環境相同的安全標頭），所有 API 與地圖請求都在測試內被攔截，不需要網路或金鑰。

CI 設定位於 `.github/workflows/ci.yml`；`.github/dependabot.yml` 每週檢查依賴更新。

### 安全標頭與部署（Vercel）

`frontend/security-headers.js` 是 CSP 等標頭的單一來源，`frontend/vercel.json` 必須與它一致（`securityHeaders.test.js` 會檢查）。CSP 禁止行內 / eval 腳本與嵌入框架，並允許 `https:` 的圖磚與 API。**如果你改用自己的圖磚或 API 網域，通常不需要改 CSP**（已允許任何 https）；若要收緊，請同時改 `security-headers.js` 與 `vercel.json`。

網站不再載入 Google Fonts（`@import` 會擋住整份 CSS 的渲染）；字型走系統字型，已安裝 Inter 的使用者仍會優先使用 Inter。

---

## ⚠️ 已知限制

- 輔助資訊，**不可作為實際飛航簽派依據**。
- NOTAM 來源為 FAA NOTAM Search 的非官方介面，可能隨時改版；非美國機場資料完整度不一。
- METAR 風向與 AVWX 跑道 `bearing` 皆為真北（已用 RCTP / KJFK / ZBAA 實測核對：跑道號碼為磁方位，bearing 約差一個磁偏角），因此風分量計算基準一致；但塔台 / ATIS 報的風是磁北，兩者數值會有數度差異。
- NOTAM 來源 (FAA NOTAM Search，非官方介面) 需帶完整瀏覽器標頭，否則 Akamai 會回 403；單頁最多 30 筆，後端最多取 4 頁，不足時會在簡報提示「NOTAM 可能不完整」。失敗時後端 5 分鐘內不重複請求。NOTAM 時間一律為 UTC（`EST` 後綴是 ICAO 的「預估」而非美東時區）；分類依真實 NOTAM 調校（含無人機／煙火等空域活動，並以子句判斷關閉，避免漏掉 `TWY … CLSD`、也不把 `CLSD FOR ACFT PRKG` 當成滑行道封閉）；尚未生效的公告獨立顯示於「尚未生效」群組，已過期或已取消者不顯示。
- 機型風速限制為通用參考值（尚未逐一核對 FCOM），請以 FCOM / 公司 SOP 為準；UI 也會顯示此提醒。
- NOTAM 關閉判斷偏保守：`CLSD EXC …` / `CLSD TO …` 這類「部分限制」也視為關閉；`RWY … PAPI/LGT/ILS NOT AVBL` 這類設施不可用則**不**視為跑道關閉。解析仰賴英文縮寫，非標準寫法可能漏判，請務必閱讀 NOTAM 原文。
- 限流為單程序記憶體內實作；多 worker 部署時每個 worker 各自計數。
- 自訂限制的預設頂風值從 20 改為 50 kts（與機型資料庫的「極端天氣停飛標準」一致；頂風對起降有利，20 會在 14G24 這種普通天氣就誤報「所有跑道超限」）。**已經儲存過設定的使用者不受影響**，仍沿用自己存的值。
- 過期資料備援（stale-if-error）顯示的是舊資料，頁首的 METAR 發布時間與資料年齡會如實反映；請以 METAR 時間判斷是否採用。
