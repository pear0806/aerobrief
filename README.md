# AeroBrief ✈️

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Tool-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

AeroBrief 是一個專為虛擬飛行愛好者（Flight SIM / VATSIM / IVAO 使用者）打造的整合式飛行簡報儀表板，提供天氣解析、跑道風分量計算、NOTAM 導讀與即時雷達資訊。

---

## ✨ 核心功能

- **即時天氣儀表板 (Weather Dashboard)**
    - 整合 AVWX API
    - 解析 METAR / TAF
    - 提供時間軸視覺化

- **跑道風分量分析**
    - 計算 Headwind / Crosswind
    - 自動判斷是否超出機型限制

- **VATSIM 即時雷達**
    - 顯示附近飛機位置與高度
    - 支援即時更新

- **NOTAM 智能導讀**
    - 自動解析航行通告
    - 高亮關鍵資訊（跑道關閉、設備異常）

- **自定義限制設定**
    - 可設定不同機型（A320 / A350 等）
    - 即時風險提示

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

| Method | Endpoint        | 說明             |
| ------ | --------------- | ---------------- |
| GET    | /weather/{icao} | 取得 METAR / TAF |
| GET    | /notam/{icao}   | 取得 NOTAM       |
| GET    | /vatsim         | 即時航班資料     |
