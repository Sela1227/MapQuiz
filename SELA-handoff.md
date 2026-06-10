# SELA-handoff.md — MapQuiz

> 首次對齊 Kit 是重大里程碑，依鐵律 #0 產出本 handoff。
> 給 Kit Claude 升 Kit 用；分類待 SELA 對焦確認。

---

## 〇、專案速覽

- **專案名稱：** MapQuiz（V0.2.0 由 TaiwanMapQuiz 改名；中文俗稱：台灣縣市地圖）
- **專案類型：** 純靜態網頁（GitHub Pages，互動測驗／遊戲型）
- **技術棧：** HTML + CSS + 原生 JS（無框架、無 build step）；WebAudio；localStorage
- **規模：** 7 個程式/資料檔（index.html / style.css / app.js / data.js + favicon + assets）；app.js ~430 行、data.js ~358KB（建置期產生的地圖資料）
- **使用 Kit 版本：** V1.14.1
- **完成版本：** V0.1.0
- **完成日期：** 2026-06-11

---

## 一、用 Kit 的整體感受

### 預期外的順利
- `reference-static-pages/架構說明.md` 直接點出「file:// ES module 失敗」「資料 vs 顯示分離」「不要塞單一巨檔」，照做就避開了三個坑。
- 四級分類法（🔴🟡🟢✗）讓「該不該為對齊改架構」這種決定很好下。

### 預期外的卡住
- 靜態網頁 reference 偏「**內容展示型**」（健保藥物、簡報），本案是「**互動遊戲/測驗型**」純靜態，reference 的設計重點（資料表格、上游監控）對得上的不多，互動狀態機/計分/音效那塊得自己拿捏。
- reference §7 同時出現「考慮 esbuild build step」與部署用 Git Pusher branch-serve（不跑 build）——這兩者其實衝突，第一次讀會猶豫要不要上 build。

### 整體評價
- ✓ 對齊既有專案 SOP（claude-init §二）+ 四級分類 +「不做要寫理由」非常實用，省了反覆確認。
- ✗ 缺「互動型純靜態（遊戲/工具）」的範例與「framework 原型 → branch-serve 部署」的決策提醒。

---

## 一.5、新 stack 首遇報告
- A（全新 framework/語言/工具）：**無**。技術棧 Kit 都覆蓋（純靜態 HTML/JS）。
- B（既有 stack 新 API）：WebAudio 程式生成音效首次在 SELA 專案出現，但**沒踩到實質坑**（依方向 2 原則不另記）。

---

## 二、發現的「跨專案通用坑」

> 先 grep Kit：file://、ES module、事件冒泡、build step 皆**已有覆蓋**（cross-platform-cheatsheet / static reference / pitfalls）。
> 因此本案**不提新坑**，改把可強化處放第四節。

（無新坑提案；既有坑的補強見第四節。）

---

## 三、發現的「跨專案設計模式」（建議進規範）

### 1. 大型地理/資料視覺化：建置期前處理、執行期零依賴
- **本案發生情境：** 縣市+鄉鎮市區界線原始 GeoJSON 達 9MB+20MB。用 Python（shapely）在**建置期**簡化線條、等距投影、外島做 inset、輸出成總計 ~400KB 的 SVG 路徑字串，執行期前端零依賴、直接吃 `window.MAP`。
- **可推廣的原則：** 凡「重資料 + 輕互動」的靜態網頁，把資料整形/壓縮放建置期（Python），執行期只留輕量結構 + 原生 render；避免前端載原始大檔或拉 GIS library。
- **代價/取捨：** 資料更新要重跑前處理腳本（非即時）；簡化會犧牲邊界精度（需取捨容差）。
- **建議寫入：** `tech-stack-lessons.md` 靜態 HTML 章節，或未來 `reference-static-interactive`。

### 2. 互動型純靜態用「事件委派 + data-act 分派」達成 SPA 體驗
- **本案發生情境：** 無框架下做多畫面（首頁/選縣市/測驗/結算）切換，每次 `render()` 重畫 innerHTML；事件只綁一次在容器、用 `closest('[data-act]')` 分派。
- **可推廣的原則：** 純靜態互動 app 不必上 framework；「單一委派監聽 + 宣告式 data-act」即可穩定處理重畫後的事件，避免逐元素重綁失效。
- **代價/取捨：** 全量重畫對超大 DOM 不划算（本案畫面小，無感）。
- **建議寫入：** `tech-stack-lessons.md` 靜態 HTML 章節。

---

## 四、Kit 該瘦身或調整的地方

### 1. 補強 `reference-static-pages`：file:// 對策要給「正解」，不只「警告」
- **現狀：** CLAUDE.md / README 提到「file:// 載 ES module 失敗」，但沒明講「**雙擊要能跑該怎麼做**」。
- **建議改成：** 加一句對策——「需本機雙擊執行時，資料用 classic `<script>` 設 `window` 全域、主程式也用 classic script，**不要 fetch、不要 type=module**」。
- **理由：** 本案要支援雙擊 + Pages 雙環境，這個對策是關鍵且可重用。

### 2. 補強 `reference-static-pages` §7：build step 與 branch-serve 的衝突講清楚
- **現狀：** §7 建議「考慮 esbuild build step」，但 SELA 部署是 Git Pusher 推 main、Pages branch 直接託管（不跑 build）。
- **建議改成：** 加註——「若用 Git Pusher / Pages branch-serve 部署，**原始碼即上線檔，不可有 build step**；需要 build 就改走 GitHub Actions 產 dist 再發佈」。
- **理由：** 避免下個靜態專案誤上 build 而部署出空白頁。

### 3. 對齊 SOP（claude-init §二）補一條：framework 原型 → branch-serve 部署
- **現狀：** 對齊 SOP 沒涵蓋「專案原型用了 React/Vite，但目標部署是 Pages branch-serve」這條路徑。
- **建議：** 加決策提醒——「原型若是 framework 但部署走 branch-serve，對齊時應評估**重寫成純靜態**（或改 Actions build）」。本案即是此情境（React/Vite 原型 → V0.1.0 重寫純靜態）。

### Kit 結構性建議
- 評估新增 `reference-static-interactive`（互動/遊戲/測驗型純靜態），與現有偏內容展示的 `reference-static-pages` 區隔。素材可由本案萃取。

---

## 五、留在這個專案、不要回流 Kit 的東西

- 台灣 22 縣市 / 368 鄉鎮市區的**資料本身**與名稱對映
- 地圖投影、外島 inset、`hitCircles` 等**具體實作座標**
- 計分公式具體數值（BASE=100、SPEED_CAP=8、連擊門檻 3/6/10、評級門檻）
- 配色翡翠綠主題（app 向性，非通用）
- 三種測驗模式與 quiz 業務流程

---

## 六、Kit Claude 的建議行動清單

### 建議升 Kit 版本
V1.15.0（b+1，新內容為主：補強 reference + 對齊 SOP 增補 + 評估新 reference）

### 必做
- [ ] `reference-static-pages` 補「file:// 雙擊對策（window 全域 + classic script）」
- [ ] `reference-static-pages` §7 補「branch-serve 不可有 build step」的衝突說明
- [ ] `claude-init.md` §二 對齊 SOP 補「framework 原型 → branch-serve → 評估轉純靜態」

### 暫緩
- [ ] 新增 `reference-static-interactive`：等再有 1 個同型專案佐證，再決定要不要獨立成 reference（目前只有本案一例）
- [ ] 「建置期前處理大型資料」是否獨立成模式：先進 tech-stack-lessons，累積更多再評估升級

### 不做
- [ ] 把本案計分公式 / 台灣地理資料 / 翡翠配色收進 Kit（業務特定，不通用）

---

## 七、給 Kit Claude 的最後備註

- 本案是「先成原型、再首次對齊 Kit」的典型：原型在對話中快速長出 React/Vite 版，對齊時因部署模型（branch-serve）才轉純靜態。這條路徑現實中會反覆出現，值得進 SOP。
- 第三節兩個設計模式都只有本案一例，建議先記錄、待第二例再升級為正式規範或 reference。
