# CLAUDE.md — MapQuiz

> **這份是給下次 Claude 看的工作上下文，不是文件。**
> 判斷標準：下次 Claude 讀完，能不能直接動手？
> 維護章法見 `SELA-Starter-Kit/conventions/CLAUDE-MD-章法.md`，每次升版前複習。
> 每升一版至少更新三處：踩過的坑、版本歷程、下版候選工作。

> **⚠ Kit 對齊註記（已對齊 Kit V1.14.1 的專案）：**
> 對話中先以 React/Vite 原型成形；V0.1.0 首次對齊 Kit 重寫為純靜態原生 JS；V0.2.0 改名 + 北歐極簡；V0.3.0 整合 app logo + 主色對齊；V0.4.0 加限時挑戰 + hero；V0.5.0 流程重整；V0.6.0 計分改純加減分（答對+100×連擊、答錯−50、每題速度加成），移除整輪碼錶/時間獎勵。
> 衝突仲裁：
> 1. **以本專案 CLAUDE.md 為主、Kit 為輔。**
> 2. 刻意決定（明寫理由，下次別「修正」回去）：
>    - **app 主題＝北歐霧藍極簡，主色 `#537387`**（取樣自 app logo 底色、SELA V0.2.0 指定北歐風）。SELA logo 仍橘+白不變。
>    - **app logo（白色台灣＋定位 pin、霧藍底）已整合**：來源＝其他 AI（Gemini）生圖 + Claude 優化轉檔（滿版方形、多解析度套組）。用於 favicon／app icon／README 主視覺／首頁；SELA logo 降為品牌歸屬印記（首頁底 + README footer）。Logo prompt 紀錄：`SELA-logo-prompt.md`。
> 3. **英文程式名 = MapQuiz；中文俗稱 = 台灣縣市地圖**（UI／文件用）。
> 4. **下次完成版本時記得評估 SELA-handoff.md**（Kit 鐵律 #0）。

---

## 〇、當前狀態

- **版本：** V0.6.0
- **狀態：** 可運作（計分定案：答對加/答錯扣 + 每題速度加成；15 題上限；層級優先流程）
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
| 「配色」 | CSS `:root` 變數 **＋** `app.js` 的 `COL`（SVG 填色）| 兩處都改才一致（坑 P5）|
| 「外島呈現」 | `insets`、`hitCircles` | 僅縣市層級；資料在 `data.js` |
| 「一輪題數」 | `MAX_Q`（=15），`start()` 內 `shuffle(names).slice(0, MAX_Q)` | `app.js` |
| 「計分」 | 答對 `BASE`(100)×`comboMult` + 速度加成 `SPEED_MAX`(50, `SPEED_CAP` 8s 內遞減)；答錯扣 `WRONG_POINTS`(50)、總分下限 0 | `app.js` 常數區 / `pickAnswer()` |
| 「景點題素材（未接線）」 | `data/landmarks.json`（22 縣市 ×3 景點 + _spec 接線說明）| index.html **刻意未載入**；接線方式見該檔 _spec |

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
| 景點題素材 | `data/landmarks.json`（下版接線；改存 window 全域 js 以符合坑 P1）|
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
| V0.4.0 | 加限時挑戰模式（獨立）；首頁主色 hero；計時主色 chip |
| V0.5.0 | 流程重整：層級優先 + 同構選單；限時融入；15 題上限；備妥景點題素材（未接線）|
| V0.6.0 | **計分定案**：答對 +100×連擊倍率 + 每題速度加成（8s 內最高 +50）、**答錯 −50**（總分下限 0）；移除整輪碼錶/時間獎勵/罰秒（V0.4–0.5 的限時機制收斂為每題加成）|

---

## 七、下版候選工作（按優先序）

1. **接線景點特色題** — 素材已備（`data/landmarks.json`，22 縣市 ×3）；依其 _spec 改存 `data/landmarks.js`（window 全域、坑 P1），在縣市選單加「景點題」模式卡（『〈景點〉位於哪個縣市？』四選一），沿用現有計分。是 SELA 已點名的下一步。
2. PWA 離線安裝（webmanifest + app icon 已備，補 service worker）
3. 分區「只考錯的」跨縣市彙整（目前限單一縣市內）
4. 英文區名提示／英文作答模式（資料已含 TOWNENG）
5. 無障礙：鍵盤操作、aria、焦點順序
6. 地圖資料更新流程文件（內政部界線改版時怎麼重產 data.js）

---

## 八、升版必讀（如有）

（V0.3.0 無。logo 與配色屬資產／樣式層，未動資料/流程。）

---

## 九、一句話總結

V0.6.0：計分定案為純加減分——答對 +100（連擊 ×1.5/×2/×3）＋每題 8 秒內速度加成（最高 +50），答錯 −50（總分下限 0）；移除整輪碼錶、結算時間獎勵與罰秒。jsdom 驗證通過。下版第一優先是接線景點特色題（素材在 data/landmarks.json）。
