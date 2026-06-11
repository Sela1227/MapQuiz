<div align="center">
  <img src="assets/app-logo.png" width="112" alt="MapQuiz"/>
  <h1>MapQuiz（台灣縣市地圖）</h1>
  <p>互動式地理測驗：全台 22 縣市與 368 鄉鎮市區，連擊加倍、限時加分，邊玩邊記位置。</p>
  <p><em>北歐極簡風 · 純前端 · 零後端</em></p>
</div>

---

## 簡介

打開就能玩的地理練習網頁，三種模式：看地圖選名字、看名字點地圖、自由練習。縣市與分區兩個層級——分區可選一個縣市放大，單獨考它底下的鄉鎮市區。

成績、最佳連擊、最常答錯的縣市都存在瀏覽器，下次打開還在。地圖是真實界線（縣市取自 g0v、鄉鎮市區取自內政部現行界線），金門與馬祖（連江）放在左上角小框，可 +/− 放大方便點選小區域。

特色：

- **計分**：答對 +100（連擊 3/6/10 有 ×1.5/×2/×3 倍率）、答錯 −50（總分不低於 0）、每題 8 秒內答得越快額外加成越多（最高 +50）
- 答對／答錯音效（WebAudio，可靜音）、分數浮動動畫
- 結算評級 S+／S／A／B／C／D，並用對錯把整張地圖上色
- **北歐霧藍極簡介面**，沉穩低干擾
- 純 HTML + CSS + 原生 JS，無框架、無 build step，雙擊 `index.html` 就能跑

## 啟動

```bash
# 方式一：本機預覽（推薦）
python -m http.server 8000
# 開 http://localhost:8000

# 方式二：直接雙擊 index.html
# macOS:  open index.html
# Windows: start index.html
```

不需要 `npm install`，沒有編譯步驟。

## 部署（GitHub Pages）

1. 用 Git Pusher 把專案推上 GitHub（`main` 分支）
2. repo → Settings → Pages → Source：Deploy from a branch → `main`
3. 等 1–2 分鐘，連結出現在 Settings → Pages

純靜態、由 Pages 直接託管 `main` 分支，無 build step。

## 目錄結構

```
MapQuiz/
├── index.html              入口（含 favicon 套組、meta）
├── css/style.css           樣式（CSS 變數：北歐霧藍主題 + SELA 品牌色）
├── data/
│   └── landmarks.json      下版「景點題」素材（尚未接線）
├── js/
│   ├── data.js             地圖資料（window.MAP / window.DISTRICTS）
│   └── app.js              主程式（測驗流程、計分、音效、存檔）
├── favicon/                favicon／app icon 套組（MapQuiz app logo）
├── assets/app-logo.png     app 主視覺（README／首頁）
├── assets/sela.svg         SELA 品牌標識（歸屬印記）
├── SELA-logo-prompt.md     app logo 生成 prompt（給其他 AI 生圖）
├── README.md
├── CLAUDE.md
├── SELA-handoff.md
└── .gitignore
```

## Logo

app 專屬 logo（白色台灣＋定位 pin、北歐霧藍底）已整合為 favicon／app icon／README 主視覺，由其他 AI 生圖、Claude 優化轉檔（多解析度 + favicon.ico + apple-touch-icon）。`SELA-logo-prompt.md` 保留生成用的 prompt。SELA logo 作為品牌歸屬印記，置於首頁底與 README footer。

## 資料來源

- 縣市界線：g0v/twgeojson（桃園已更名為桃園市）
- 鄉鎮市區界線：內政部「鄉鎮市區界線」現行版，經 dkaoster/taiwan-atlas 轉 TopoJSON
- 界線於建置期以 Python 簡化、投影、外島做 inset，輸出成輕量 SVG 路徑

## 版本

V0.6.0

---

<div align="center">
  <img src="assets/sela.svg" width="22" alt="SELA"/>
  <br/>
  <sub>Made by <strong>SELA</strong> · V0.6.0</sub>
</div>
