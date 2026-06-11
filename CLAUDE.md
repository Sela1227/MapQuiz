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
>    - **app logo（V1.0.0 換版：地圖書＋羅盤＋定位 pin、霧藍底 #3C6078）**：來源＝Gemini 生圖 + Claude 方形裁切/轉檔；主色同步對齊 #3C6078（四處）。舊台灣 pin 版退役。用於 favicon／app icon／README 主視覺／首頁；SELA logo 降為品牌歸屬印記（首頁底 + README footer）。Logo prompt 紀錄：`SELA-logo-prompt.md`。
> 3. **英文程式名 = MapQuiz；中文俗稱 = 台灣縣市地圖**（UI／文件用）。
> 4. **下次完成版本時記得評估 SELA-handoff.md**（Kit 鐵律 #0）。

---

## 〇、當前狀態

- **版本：** V2.0.0
- **狀態：** V2 里程碑（三層級六模式、PWA、小知識/首都/國旗、選單圖像化單頁）
- **一句話定位：** 台灣（22 縣市＋368 鄉鎮市區）為主、世界（196 國）為輔的互動地理測驗。
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
| 「世界題聚焦」 | `worldFocusBox()` → `WORLD.contBox[洲]` 餵給 `buildMap(...,focusBox)`；干擾項 `optPool()` 同洲 | `app.js`；洲框資料在 `world.js`（建置期 proc_world2.py 產）|
| 「一輪題數」 | `MAX_Q`（=15），`start()` 內 `shuffle(names).slice(0, MAX_Q)` | `app.js` |
| 「計分」 | 答對 `BASE`(100)×`comboMult` + 速度加成 `SPEED_MAX`(50, `SPEED_CAP` 8s 內遞減)；答錯扣 `WRONG_POINTS`(50)、總分下限 0 | `app.js` 常數區 / `pickAnswer()` |
| 「景點/地標題」（縣市與世界層級）| 題目=地名、正解=`lmMap()[題目]`（county→LMAP、world→WLMAP）；`correctAns()` 統一正解；鎖定後地圖點亮正解 | `app.js`（LMAP/WLMAP/lmMap/correctAns）|
| 「景點題資料」 | 台灣：`landmarks.json→landmarks.js`；世界：`world-landmarks.json→world-landmarks.js`（規則同坑 P7，另不收跨國界地標）。台灣編輯 `data/landmarks.json` → 轉出 `data/landmarks.js`（window.LANDMARKS，坑 P1）→ 兩檔同 commit | `data/` 兩檔 + `index.html` 載入順序（data.js → landmarks.js → app.js）|

> 地圖資料（`data.js`）是建置期由 GeoJSON 前處理產生的，不要手改座標。

---

## 三、關鍵檔案路徑

| 想改什麼 | 動哪些檔 |
|---------|---------|
| 配色 / 版面 | `css/style.css` 的 `:root` **＋** `js/app.js` 的 `COL` |
| 版本號（升版必改**四**處）| `js/app.js` `VERSION` ＋ README 兩處 ＋ 本檔「〇」＋ **`sw.js` 的 CACHE 名**（不改快取名舊版資源不會更新！）|
| 主色（對齊 logo）| `:root --primary`、`COL.active`、`index.html` theme-color、`favicon/site.webmanifest` theme_color（四處一致）|
| 計分 / 評級 | `js/app.js` 的常數 / `rankOf()` |
| 測驗流程 / 畫面 | `js/app.js` 的 `view*()` 與 `start/pickAnswer/next/finish` |
| 地圖資料 | `js/data.js`（建置期產生，勿手改）|
| app logo | `assets/app-logo.png`(母圖) + `favicon/`(套組)；重生 prompt 見 `SELA-logo-prompt.md` |
| 景點題內容 | `data/landmarks.json`（編輯來源）+ `data/landmarks.js`（載入檔，兩檔同步）|
| SELA 歸屬印記 | `viewHome()` 結尾 `.attrib`、README footer、`assets/sela.svg` |

---

## 四、踩過的坑（編號累積，永不重排）

```
P1. file:// 雙擊時 fetch / ES module 被擋 → 資料用 classic <script> 設 window 全域、不 fetch、不 type=module
P2. SVG r 屬性的 CSS 動畫只部分瀏覽器支援 → keyframes 同時動 opacity 當 fallback + prefers-reduced-motion
P3. 大型資料別塞進 index.html → data.js / style.css / app.js 分檔
P4. render() 重畫 innerHTML，逐元素綁事件會失效 → 事件委派（#app 上 closest('[data-act]')）
P5. 配色有「兩處真相」：CSS 變數 + JS COL；主色還要同步 index.html 與 webmanifest 的 theme-color → 改色四處一起改
P8. 用「函式A開頭~函式B開頭」切片重寫程式碼，會把夾在兩函式之間的其他定義一起刪掉
   - 症狀：V2.0.0 重寫 viewWorldMenu 時，V1.4.0 插在它與下一個函式之間的 CONTS/contChips 被吞，畫面直接 ReferenceError
   - 做法：切片重寫前先 grep 區間內容；注入/重寫一律加 assert（存在性與事後檢查）；新定義集中插在固定錨點（如 viewCountyMenu 前）

P7. 景點題名稱會自我洩答
   - 症狀：題目名稱含所屬縣市字樣（基隆廟口夜市、臺中國家歌劇院——含臺/台變體、馬祖/蘭陽俗稱）
   - 原因：建題時直接用全名，沒做洩答檢查
   - 做法：入庫前跑稽核（縣市核心字 + 臺/台互換 + 俗稱表）；改通行俗稱或換景點。世界版國名同理（國名通常即答案載體，世界版景點題要套同規則）

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
| V0.6.0 | 計分定案：答對 +100×連擊 + 每題速度加成、答錯 −50（下限 0）；移除整輪碼錶/時間獎勵/罰秒 |
| V0.6.1 | 測驗頂列加「‹ 離開」（放棄不計分，回模式選單）|
| V0.7.0 | 「停止測驗並結算」：部分結算；與「‹ 離開」雙出口 |
| V0.8.0 | 接線景點題（66 景點、correctAns() 抽象化、json→js 雙檔）|
| V0.9.0 | 景點題庫擴充 66→121；寫入世界版路線圖 |
| V0.9.1 | 洩答稽核修 10 名（坑 P7）；世界前置初版（110m、176 國，未掛載）|
| V0.9.2 | 世界名單定版 196 國（NE 10m、剔非主權、補以巴）；未掛載 |
| V1.0.0 | 里程碑：世界版上線＋換 logo＋改抬頭；主色 #3C6078；zoom 4× |
| V1.1.0 | 世界地標題（88 個/53 國、lmMap() 層級感知）|
| V1.2.0 | 世界題聚焦初版：太平洋置中投影、cont/contBox、洲級聚焦、選項不跨洲 |
| V1.3.0 | 頁面版本號（VERSION）；目標國緊聚焦；世界地標 88→138 |
| V1.4.0 | 滾輪縮放（viewBox 擴張式縮小、下限 0.2）；世界選洲 chips；世界地標 138→183 |
| V1.5.0 | 台灣景點 121→165 |
| V1.6.0 | PWA（sw.js + 守衛註冊）；世界小知識 980 條 |
| V1.7.0 | 知名度加權；熱門33國15段；台灣縣市/景點說明 |
| V1.8.0 | 首都題（183 池）；國旗題（emoji、TW 覆寫）；assoc 家族；小知識標名 |
| V1.9.0 | 雙指捏合縮放（transform 預覽、commit 重繪）|
| V2.0.0 | **選單圖像化單頁**：模式選單改 2 欄 `tile` 磁磚（內嵌線條 SVG `ICON` ×6＋最高分徽章），世界 6 模式一頁內；首頁層級卡 `lvcard` 內嵌**迷你地圖縮圖**（buildMap 直接縮放渲染）；預覽地圖高度 200/230→128/148。坑：重寫選單函式時用「函式名到函式名」切片，把夾在中間的 CONTS/contChips 一併吞掉（P8）|
| _V1.9.0 原文_ | **雙指捏合縮放**：捏合中以 CSS `transform: scale()` 即時預覽（不重繪 SVG、不斷手勢），`touchend` 才提交 S.zoom 並 render（含世界 viewBox 擴張）；`.map-box` 設 `touch-action: pan-x pan-y`（保留單指平移、擋瀏覽器整頁縮放）；touchmove 需 `{passive:false}` 才能 preventDefault（同 wheel 坑）|
| _V1.8.0 原文_ | (1) **首都題**：`data/world-capitals.js`＝WORLD_CAPITALS（196 全表）＋CAPMAP（首都→國出題池 183，排除 13 個含國名者：墨西哥城/新加坡/梵蒂岡城…；達卡/達喀爾撞名已辨）；(2) **國旗題**：`data/world-flags.js` 由 NE ISO_A2 轉 emoji（**台灣 NE 標 CN-TW 已覆寫 TW**——資料商世界觀第三例）；(3) **assoc 題型家族**：landmark/capital/flag 共用 `isAssoc()`/`correctAns()` 流程（選項同洲、加權、緊聚焦、小知識全自動共用）；(4) **小知識標名**：`S.factName` 前綴粗體（世界=國名、縣市=縣市名、景點=景點名）|
| _V1.7.0 原文_ | (1) **知名度加權出題**：`FAME3`（62 國）權重 5、有地標國 2、其餘 1，`weightedSample()` 重複裝袋洗牌去重抽 15（僅世界、非重練）；(2) **熱門 33 國小知識擴至 15 段**（總 1,310 條）；(3) **台灣內容**：`data/taiwan-facts.js` ＝ `TW_FACTS`（22 縣市 ×5）＋ `TW_LM_DESC`（165 景點一句說明，斷言鎖覆蓋）；縣市題顯縣市小知識、景點題優先顯景點說明、縣市自由練習也顯；分區層級不顯；sw.js 快取清單與 CACHE 名同步 |
| _V1.6.0 原文_ | (1) **PWA**：`sw.js` cache-first 全資源預快取（相對路徑支援 Pages 子路徑；CACHE 名含版本號，activate 清舊快取）；註冊守衛 `location.protocol` 為 http(s) 才註冊（file:// 雙擊不受影響）；manifest 補 `start_url/scope: ./`；(2) **國家小知識**：`data/world-facts.js` 196 國 ×5＝980 條（斷言鎖覆蓋）；答題鎖定時 `pickFact()` 隨機抽一條存 `S.fact`（重繪不換條），顯示於回饋區 `.fact`；自由練習點國家同顯；台灣層級不顯 |
| _V1.5.0 原文_ | **台灣景點 121→165**（每縣市 7–8 個，+44 全數查證：武陵農場屬台中和平、草嶺屬雲林古坑等易誤判者特別確認；金門慈湖因與桃園慈湖重名改收獅山砲陣地）；P7 稽核全過 |
| _V1.4.0 原文_ | (1) 滾輪縮放：#app 上委派 wheel（passive:false、一格 ±0.5）；世界題 zoom 下限 0.2——`S.zoom<1` 時不縮 SVG 而是 `expandIfZoomedOut()` 把 focus viewBox 以中心放大（夾在全圖內），達成「縮小看更大範圍」；台灣／非聚焦下限仍 1；(2) **選洲作答**：世界選單加 `contchip` 列（全部＋六洲，`S.worldCont`），題池/地標池過濾該洲、選單預覽地圖聚焦該洲；(3) **世界地標 138→183**（+45：巴爾幹/中亞/西非/加勒比/大洋洲；新增 35 國覆蓋，圭亞那等名稱以 world_names.txt 為準）|
| _V1.3.0 原文_ | (1) 頁面顯示版本號：app.js `VERSION` 常數 → 首頁 footer「Made by SELA ・ V<版本>」（升版三處同步，見關鍵檔案路徑表）；(2) **聚焦加強**：world.js 每國加投影 bbox `bb`、洲框邊距 18/22%→8/10%；map2name/地標題改**目標國置中緊聚焦**（`worldFocusBox()`：目標 bbox ×4、最小視窗 150、夾在全圖內），name2map 維持洲框（再緊會洩答）；(3) **世界地標 88→138**（+50：中亞/西非/加勒比/東歐等，洩答稽核——大辛巴威遺址因含國名棄用、巴拿馬運河同理）|

---

## 七、下版候選工作（按優先序）

1. **微型國 name2map 可玩性追蹤** — V1.2.0 洲聚焦後已大幅改善（歐洲框內微型國可視）；SELA 實玩後若仍難點，再考慮歐洲微型國 inset。
2. 世界地標題庫擴充（目前 88 個/53 國；可往 150 個、補中亞/西非/加勒比覆蓋）
2. 景點反向題（「下列哪個景點在〈縣市〉？」，同題庫反著出）
3. PWA 離線安裝（webmanifest + app icon 已備，補 service worker）
4. 分區「只考錯的」跨縣市彙整（目前限單一縣市內）
5. 英文區名提示／英文作答模式（資料已含 TOWNENG）
6. 無障礙：鍵盤操作、aria、焦點順序
7. 地圖資料更新流程文件（界線改版時怎麼重產 data.js）

### 世界版路線圖（V0.9.1：資料前置已完成，僅剩接線）

現有架構已為此鋪好路，接法：
- **資料（✓ 已完成，V0.9.2 定版）**：`data/world.js`——**196 國＝193 聯合國會員＋梵蒂岡＋巴勒斯坦＋台灣**。NE 10m、NAME_ZHT＋慣稱覆寫（台灣/紐西蘭/南北韓/捷克/印尼/厄瓜多/克羅埃西亞/馬爾他/盧安達/馬利/蒙古/中國/聖馬利諾/巴勒斯坦）；排除港澳格陵蘭等非主權實體與北賽/索馬利蘭、科索沃；Israel/Palestine 由 Disputed/Indeterminate 補入。58 個微型國 hitCircles（梵蒂岡/摩納哥等靠點擊圈作答；name2map 模式對微型國的可玩性，接線時要評估加洲別放大或提高 zoom 上限）。名單 `data/world_names.txt` 供校對。
- **接點**：`dataset()` 已抽象為 `{viewBox, regions, insets, hitCircles}`，世界地圖就是再一個 dataset；首頁層級選單（V0.5.0 同構設計）加第三張卡「世界國家」，進同款模式選單即可，四種題型（含景點題）零改動共用。
- **景點**：`landmarks.json` 格式直接沿用（國家 → 景點清單），如「艾菲爾鐵塔→法國」。
- **注意**：國名採台灣慣用譯名；爭議地區的呈現方式屆時與 SELA 對焦再定。

---

## 八、升版必讀（如有）

（V0.3.0 無。logo 與配色屬資產／樣式層，未動資料/流程。）

---

## 九、一句話總結

V1.9.0：雙指捏合縮放——移動中 transform 預覽、放手提交（避免重繪斷手勢），與滾輪/按鈕共用同一套 zoom 與下限邏輯。jsdom 模擬捏合進出全綠。下版優先：SELA 裝置實測捏合手感。
