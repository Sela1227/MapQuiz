# CLAUDE.md — MapQuiz

> **這份是給下次 Claude 看的工作上下文，不是文件。**
> 判斷標準：下次 Claude 讀完，能不能直接動手？
> 維護章法見 `SELA-Starter-Kit/conventions/CLAUDE-MD-章法.md`，每次升版前複習。
> 每升一版至少更新三處：踩過的坑、版本歷程、下版候選工作。

> **⚠ Kit 對齊註記（已對齊 Kit V1.14.1 的專案）：**
> 對話中先以 React/Vite 原型成形；V0.1.0 首次對齊 Kit 重寫為純靜態原生 JS；V0.2.0 改名 + 北歐極簡；V0.3.0 整合 app logo 並把主色對齊 logo 底色。
> 衝突仲裁：
> 1. **以本專案 CLAUDE.md 為主、Kit 為輔。**
> 2. 刻意決定（明寫理由，下次別「修正」回去）：
>    - **app 主題＝北歐霧藍極簡，主色 `#537387`**（取樣自 app logo 底色、SELA V0.2.0 指定北歐風）。SELA logo 仍橘+白不變。
>    - **app logo（白色台灣＋定位 pin、霧藍底）已整合**：來源＝其他 AI（Gemini）生圖 + Claude 優化轉檔（滿版方形、多解析度套組）。用於 favicon／app icon／README 主視覺／首頁；SELA logo 降為品牌歸屬印記（首頁底 + README footer）。Logo prompt 紀錄：`SELA-logo-prompt.md`。
> 3. **英文程式名 = MapQuiz；中文俗稱 = 台灣縣市地圖**（UI／文件用）。
> 4. **下次完成版本時記得評估 SELA-handoff.md**（Kit 鐵律 #0）。

---

## 〇、當前狀態

- **版本：** V0.3.0
- **狀態：** 可運作（功能完整；北歐極簡 + app logo 雙軌到位）
- **一句話定位：** 全台 22 縣市 + 368 鄉鎮市區的互動地理測驗，連擊／限時計分，給想記住台灣地理位置的人玩。
- **目標使用者：** 學生、想熟悉台灣行政區位置的一般大眾。
- **技術棧：** 純 HTML + CSS + 原生 JS（無框架、無 build step）
- **入口點：** `index.html`（載入 `js/data.js` → `js/app.js`，立即 `render()`）
- **部署目標：** GitHub Pages（Git Pusher 推 `main`，repo Settings → Pages 啟用，branch 直接託管）

---

## 一、技術棧決策（為什麼這樣選）

| 選擇 | 替代品 | 選這個的理由 |
|------|--------|------------|
| 純 HTML+CSS+原生 JS | React / Vite | 無 build step；Git Pusher 推 main 由 Pages **直接託管**，不跑 npm build；雙擊即跑 |
| `js/data.js` 設 `window` 全域 | `fetch()` JSON | `file://` 雙擊 `fetch` 被 CORS 擋；classic script 設全域可離線雙擊 |
| classic `<script>` | ES module | ES module 在 `file://` 無法載入 |
| `localStorage` | 後端 | 純靜態無後端 |
| WebAudio 生成音效 | 音檔資產 | 無外部檔、無版權、體積零 |
| 事件委派（`closest('[data-act]')`）| 逐元素 onclick | 每次 `render()` 重畫 innerHTML，委派只綁一次 |
| 北歐霧藍極簡，主色 `#537387` | 翡翠綠（V0.1.0）| V0.2.0 指定北歐；V0.3.0 取樣 app logo 底色對齊主視覺 |

> 改技術棧（如改回 framework）= 大版本升級，回頭更新本表 + 開「八、升版必讀」。

---

## 二、業務對映表

| 業務概念 | 程式實作 | 改這個動哪 |
|---------|---------|-----------|
| 「一個可考的地圖層級」 | `dataset()` → `{viewBox, regions, insets, hitCircles}` | `app.js`；縣市=`NATIONAL`、分區=`districtDataset(county)` |
| 「一塊區域」 | `regions[name] = {d, cx, cy, area}` | 資料在 `data.js` |
| 「計分」 | `BASE / SPEED_CAP / SPEED_MAX / comboMult()` | `app.js` 頂部常數 |
| 「配色」 | CSS `:root` 變數 **＋** `app.js` 的 `COL`（SVG 填色）| 兩處都改才一致（坑 P5）|
| 「外島呈現」 | `insets`、`hitCircles` | 僅縣市層級；資料在 `data.js` |

> 地圖資料（`data.js`）是建置期由 GeoJSON 前處理產生的，不要手改座標。

---

## 三、關鍵檔案路徑

| 想改什麼 | 動哪些檔 |
|---------|---------|
| 配色 / 版面 | `css/style.css` 的 `:root` **＋** `js/app.js` 的 `COL` |
| 主色（對齊 logo）| `:root --primary`、`COL.active`、`index.html` theme-color、`favicon/site.webmanifest` theme_color（四處一致）|
| 計分 / 評級 | `js/app.js` 的常數 / `rankOf()` |
| 測驗流程 / 畫面 | `js/app.js` 的 `view*()` 與 `start/pickAnswer/next/finish` |
| 地圖資料 | `js/data.js`（建置期產生，勿手改）|
| app logo | `assets/app-logo.png`(母圖) + `favicon/`(套組)；重生 prompt 見 `SELA-logo-prompt.md` |
| SELA 歸屬印記 | `viewHome()` 結尾 `.attrib`、README footer、`assets/sela.svg` |

---

## 四、踩過的坑（編號累積，永不重排）

```
P1. file:// 雙擊時 fetch / ES module 被擋 → 資料用 classic <script> 設 window 全域、不 fetch、不 type=module
P2. SVG r 屬性的 CSS 動畫只部分瀏覽器支援 → keyframes 同時動 opacity 當 fallback + prefers-reduced-motion
P3. 大型資料別塞進 index.html → data.js / style.css / app.js 分檔
P4. render() 重畫 innerHTML，逐元素綁事件會失效 → 事件委派（#app 上 closest('[data-act]')）
P5. 配色有「兩處真相」：CSS 變數 + JS COL；主色還要同步 index.html 與 webmanifest 的 theme-color → 改色四處一起改
P6. app logo 轉檔：AI 生的圓角方形圖外圍是白底（含圓角縫隙），直接縮成 favicon 會有白角
   - 做法：從四角 floodfill 把外圍白換成 logo 底色（台灣/文字是被藍包住的白色孤島，不會被填），得乾淨滿版方形；圓角交給顯示端 CSS（.applogo border-radius）。主色用「整圖最大宗非白像素」取樣最準（邊緣取樣會偏暗）。
```

---

## 五、煙霧測試（可貼上執行）

```bash
node --check js/app.js
node --check js/data.js
grep -rn "console.log\|TODO\|FIXME\|debugger" js/ || true
python -m http.server 8000   # 開 http://localhost:8000
```

**手動檢查：**
- [ ] 首頁左上有 app logo（圓角）、分頁 favicon 為台灣＋pin 圖示
- [ ] 三模式可玩；答對柔綠／答錯低彩紅、分數與連擊會動
- [ ] theme-color（手機網址列）為 `#537387`、與 webmanifest 一致
- [ ] 重整後最佳分數、最常答錯縣市仍在（localStorage）

---

## 六、版本歷程（最近 6-10 版）

| 版本 | 重點 |
|------|------|
| V0.1.0 | 首次對齊 Kit：React/Vite 原型 → 純靜態原生 JS。縣市+分區、三模式、連擊/速度計分、音效、評級、localStorage（前名 TaiwanMapQuiz）|
| V0.2.0 | 改名 MapQuiz；北歐霧藍極簡；產出 `SELA-logo-prompt.md` |
| V0.3.0 | 整合 app logo（Gemini 生圖 + Pillow 轉多解析度套組 + favicon.ico/apple-touch）；主色取樣 logo 底色對齊為 `#537387`（CSS/JS/HTML/manifest 四處）；首頁 + README 換上 app 主視覺；SELA logo 降為歸屬印記 |

---

## 七、下版候選工作（按優先序）

1. **限時挑戰模式** — 全程倒數 + 結束結算，與現有速度獎勵互補；是目前玩法深度最直接的擴充。
2. 分區「只考錯的」跨縣市彙整（目前限單一縣市內）
3. 英文區名提示／英文作答模式（資料已含 TOWNENG）
4. PWA 離線（已有 webmanifest + app icon，補 service worker 即可裝成 app）
5. 無障礙：鍵盤操作、aria、焦點順序
6. 地圖資料更新流程文件（內政部界線改版時怎麼重產 data.js）
7. app logo 若要更銳利的小尺寸 favicon，可從 `assets/app-logo-1024.png` 另調 16/32 描邊

---

## 八、升版必讀（如有）

（V0.3.0 無。logo 與配色屬資產／樣式層，未動資料/流程。）

---

## 九、一句話總結

V0.3.0：把 SELA 用 Gemini 生的 app logo（白色台灣＋定位 pin、霧藍底）轉成完整 favicon／app icon 套組並整合進首頁與 README，取樣 logo 底色把 UI 主色對齊為 `#537387`（CSS/JS/HTML/manifest 四處同步），SELA logo 降為歸屬印記，雙軌 logo 到位。jsdom 全流程測試通過。下版第一優先是限時挑戰模式。
