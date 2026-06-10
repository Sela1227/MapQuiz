# CLAUDE.md — MapQuiz

> **這份是給下次 Claude 看的工作上下文，不是文件。**
> 判斷標準：下次 Claude 讀完，能不能直接動手？
> 維護章法見 `SELA-Starter-Kit/conventions/CLAUDE-MD-章法.md`，每次升版前複習。
> 每升一版至少更新三處：踩過的坑、版本歷程、下版候選工作。

> **⚠ Kit 對齊註記（已對齊 Kit V1.14.1 的專案）：**
> 本專案在對話中先以 React/Vite 原型成形，V0.1.0 首次對齊 Kit 時重寫成純靜態原生 JS；V0.2.0 改名並改為北歐極簡風。
> 衝突仲裁：
> 1. **以本專案 CLAUDE.md 為主、Kit 為輔。**
> 2. 刻意決定（明寫理由，下次別「修正」回去）：
>    - **app 主題＝北歐霧藍 `#5A7A8B` 極簡**（Kit 預設工具色，SELA 直接指定）。SELA logo 仍橘+白不變。
>    - **app 專屬 logo 製作中**：`SELA-logo-prompt.md` 已產（範本 E 思考型遊戲、壁虎不繼承、霧藍底）。favicon／README 主視覺暫用 SELA logo，待 SELA 生圖後替換；SELA logo 轉為歸屬印記。
> 3. **英文程式名 = MapQuiz（V0.2.0 由 TaiwanMapQuiz 改名）；中文俗稱 = 台灣縣市地圖**（保留給 UI／文件）。
> 4. **下次完成版本時記得評估 SELA-handoff.md**（Kit 鐵律 #0）。

---

## 〇、當前狀態

- **版本：** V0.2.0
- **狀態：** 可運作（功能完整；北歐極簡改版 + app logo prompt 就位）
- **一句話定位：** 全台 22 縣市 + 368 鄉鎮市區的互動地理測驗，連擊／限時計分，給想記住台灣地理位置的人玩。
- **目標使用者：** 學生、想熟悉台灣行政區位置的一般人（公眾、非專業）。
- **技術棧：** 純 HTML + CSS + 原生 JS（無框架、無 build step）
- **入口點：** `index.html`（載入 `js/data.js` → `js/app.js`，立即 `render()`）
- **部署目標：** GitHub Pages（Git Pusher 推 `main`，repo Settings → Pages 啟用，branch 直接託管）

---

## 一、技術棧決策（為什麼這樣選）

| 選擇 | 替代品 | 選這個的理由 |
|------|--------|------------|
| 純 HTML+CSS+原生 JS | React / Vite | 無 build step；Git Pusher 推 main 由 Pages **直接託管**，不跑 npm build；雙擊即跑 |
| `js/data.js` 設 `window.MAP`/`window.DISTRICTS` 全域 | `fetch()` JSON | `file://` 雙擊 `fetch` 會被 CORS 擋；classic script 設全域可離線雙擊 |
| classic `<script>` | ES module | ES module 在 `file://` 無法載入 |
| `localStorage` | 後端 | 純靜態無後端；存最佳分數／最常錯縣市足矣 |
| WebAudio 生成音效 | 音檔資產 | 無外部檔、無版權、體積零 |
| CSS 變數 | Tailwind / SCSS | 原生支援、不需編譯 |
| 事件委派（`closest('[data-act]')`）| 逐元素 onclick | 每次 `render()` 重畫 innerHTML，委派只綁一次在 `#app` |
| **北歐霧藍極簡主題 `#5A7A8B`** | 翡翠綠（V0.1.0 舊主題）| SELA V0.2.0 指定改為北歐極簡；沉穩低干擾 |

> 改技術棧（如改回 framework）= 大版本升級，回頭更新本表 + 開「八、升版必讀」。

---

## 二、業務對映表

> 業務概念 ↔ 程式實作的單一真相。改這張表 = 動 `js/app.js` 與 `js/data.js`。

| 業務概念 | 程式實作 | 改這個動哪 |
|---------|---------|-----------|
| 「一個可考的地圖層級」 | `dataset()` → `{viewBox, regions, insets, hitCircles}` | `app.js`；縣市=`NATIONAL`，分區=`districtDataset(county)` |
| 「一塊區域」（縣市/鄉鎮市區）| `regions[name] = {d, cx, cy, area}` | 資料在 `data.js`；`d`=SVG 路徑、`cx/cy`=標籤/環點、`area`=繪製疊序 |
| 「計分」 | `BASE / SPEED_CAP / SPEED_MAX / comboMult()` | `app.js` 頂部常數區 |
| 「配色」 | CSS `:root` 變數；SVG 填色用 `app.js` 的 `COL` 物件 | 兩處都要改才一致（見坑 P5）|
| 「外島呈現」 | `insets`（金門/連江）、`hitCircles`（澎湖點擊圈）| 僅縣市層級；資料在 `data.js` |

> 地圖資料（`data.js`）是建置期由 GeoJSON 前處理產生的，不要手改座標。

---

## 三、關鍵檔案路徑

| 想改什麼 | 動哪些檔 |
|---------|---------|
| 配色 / 版面 | `css/style.css` 的 `:root` 變數與各 class **＋** `js/app.js` 的 `COL`（SVG 填色）|
| 計分規則 | `js/app.js` 頂部 `BASE / SPEED_CAP / SPEED_MAX / comboMult()` |
| 測驗流程 / 畫面 | `js/app.js` 的 `view*()` 與 `start/pickAnswer/next/finish` |
| 評級門檻與稱號 | `js/app.js` 的 `rankOf()` |
| 地圖資料 | `js/data.js`（建置期產生，勿手改）|
| 標題 / favicon / theme-color | `index.html` `<head>`、`favicon/site.webmanifest`（兩處 theme_color 要一致）|
| app logo prompt | `SELA-logo-prompt.md`（重生見其檔內備註）|

---

## 四、踩過的坑（編號累積，永不重排）

```
P1. file:// 雙擊時 fetch / ES module 被擋
   - 症狀：本機雙擊 index.html，載資料或 module 報 CORS
   - 原因：Chrome 對 file:// 禁止 fetch 與 ES module
   - 做法：資料用 classic <script> 設 window 全域、app.js 也 classic script，不 fetch、不 type=module

P2. SVG 幾何屬性 r 的 CSS 動畫只部分瀏覽器支援
   - 做法：keyframes 同時動 opacity 當 fallback；prefers-reduced-motion 關閉

P3. 大型資料別塞進 index.html（健保藥物 22,800 行單檔教訓）
   - 做法：data.js / style.css / app.js 分檔

P4. 每次 render() 重畫 innerHTML，逐元素綁事件會失效
   - 做法：事件委派——監聽只綁在 #app，用 data-act/data-arg + closest 分派

P5. 配色有「兩處真相」：CSS 變數 + JS 的 COL
   - 症狀：改了 CSS 主題色，地圖區塊顏色沒跟著變
   - 原因：CSS 管 UI、但 SVG path 的 fill 由 js/app.js 的 COL 物件決定，兩套
   - 做法：改主題色時 css/:root 與 app.js COL 都要改；theme-color 還要同步 index.html 與 site.webmanifest（坑 #42 精神）
```

---

## 五、煙霧測試（可貼上執行）

```bash
node --check js/app.js
node --check js/data.js
grep -rn "console.log\|TODO\|FIXME\|debugger" js/ || true

# 本機預覽
python -m http.server 8000
# 開 http://localhost:8000
# 預期：北歐霧藍極簡介面、4 張模式卡、分頁 favicon、無 Console 錯誤
```

**手動檢查：**
- [ ] 三模式皆可玩；答對柔綠／答錯低彩紅、分數與連擊會動
- [ ] 分區選縣市放大、結算地圖按對錯上色
- [ ] 重整後最佳分數、最常答錯縣市仍在（localStorage）
- [ ] theme-color（手機網址列）為霧藍 #5A7A8B，與 webmanifest 一致
- [ ] 手機縮放正常、+/− 可點小區

---

## 六、版本歷程（最近 6-10 版）

| 版本 | 重點 |
|------|------|
| V0.1.0 | 首次對齊 Kit：React/Vite 原型 → 純靜態原生 JS。縣市+分區兩層、三模式、連擊/速度計分、音效、評級、localStorage、SELA favicon（前名 TaiwanMapQuiz）|
| V0.2.0 | 改名 MapQuiz；主設計改**北歐霧藍極簡**（CSS :root + JS COL + theme-color/webmanifest 同步）；產出 `SELA-logo-prompt.md`（app logo 工作流 B）；webmanifest 客製 |

---

## 七、下版候選工作（按優先序）

1. **套用 SELA 生成的 app logo** — prompt 已給；SELA 用其他 AI 生圖後，走 logo/CLAUDE.md §10.2／§10.4 轉多解析度套組 + favicon.ico + apple-touch-icon，替換暫用的 SELA favicon、更新 README 主視覺。這是 V0.2.0 留的尾，做完才算雙軌 logo 到位。
2. 限時挑戰模式（全程倒數、結束結算），與速度獎勵互補
3. 分區「只考錯的」跨縣市彙整（目前限單一縣市內）
4. 英文區名提示／英文作答模式（資料已含 TOWNENG）
5. PWA 離線（已有 webmanifest，補 service worker）
6. 無障礙：鍵盤操作、aria、焦點順序
7. 地圖資料更新流程文件（內政部界線改版時怎麼重產 data.js）

---

## 八、升版必讀（如有）

（V0.2.0 無。北歐改色屬樣式層，未動資料/流程；若未來改回 framework 屬大改版，需開本章列遷移選項。）

---

## 九、一句話總結

V0.2.0：改名 MapQuiz，主設計換成北歐霧藍極簡（CSS 與 SVG 兩處色票、theme-color/webmanifest 同步），並依 Kit §17 產出 app logo 的 `SELA-logo-prompt.md`（範本 E、壁虎不繼承、霧藍底）。jsdom 全流程測試通過。下版第一優先是 SELA 生圖後把 app logo 正式套進專案（轉檔 + 替換 favicon）。
