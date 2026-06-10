# SELA-logo-prompt.md — MapQuiz

> 由 Claude 依 SELA-Starter-Kit V1.14.1 §17 自動工作流產出。
> 給其他 AI（Midjourney / DALL-E / Adobe Firefly 等）生 logo 用。

## 〇、產出資訊（讓 SELA 驗證）

- **專案名稱：** MapQuiz（中文俗稱：台灣縣市地圖）
- **產出日期：** 2026-06-11
- **使用 Kit 版本：** V1.14.1
- **使用範本：** E — 遊戲 / 娛樂型（思考型 / 策略變體）
- **資訊來源：** 從專案 CLAUDE.md 自動萃取

## 一、萃取的設計 context

- **這 app 做什麼：** 全台 22 縣市 + 368 鄉鎮市區的互動地理測驗（看地圖選名字／看名字點地圖／自由練習），含連擊與限時計分。
- **給誰用：** 學生、想熟悉台灣行政區位置的一般大眾（公眾、非專業）。
- **解決什麼痛點：** 把枯燥的「台灣行政區位置背誦」變成有即時回饋的遊戲化練習，幫人真正記住每個縣市／鄉鎮市區在哪。
- **情緒基調：** 沉穩、親和、思考型——北歐極簡、低視覺干擾，「一款由工具職人做出來的、會讓人靜下心的遊戲」，不是大廠喧鬧手遊。
- **使用情境：** 隨手自我測驗、短時間玩多輪；手機與桌面瀏覽器皆可。

## 二、自動決策

### 範本類型
- **選定：** E（遊戲 / 娛樂型，思考型 / 策略變體）
- **理由：** app 有真實遊戲機制（連擊倍率、限時加分、S+~D 評級），核心是「玩」而非單純內容展示，故走 E。雖也帶教育性質（可歸 C 教育型），但 C 的暖黃／天藍／童趣調性與本案指定的「北歐極簡」衝突；E 的「strategy / thoughtful：muted tones, matches SELA tool aesthetic」正好對得上，故選 E 並採思考型變體、配色覆寫為北歐霧藍。

### 壁虎/蜥蜴繼承
- **決定：** NO（不繼承）
- **理由：** 依 §13.2 流程 Q1——地理測驗的精神與「守護／跨環境／靜默工具／持續存在」不契合；且用「台灣島／地圖定位」元素更直接表達 app 本職，也避免稀釋 SELA 主品牌的壁虎獨特性（預設不繼承）。

### 背景色提案
- **候選 1：** 北歐霧藍 `#5A7A8B`（與 app 介面主題完全一致、家族感強）
- **候選 2：** 深板岩藍 `#3F5B6B`（更沉穩、白色主體對比更強，favicon 縮到 16px 更清楚）
- **理由：** app 已定調北歐極簡，logo 與介面同色系最一致；兩個候選都避開愛馬仕橘 `#F36825`（保留給 SELA 主品牌識別，且不與 footer 的 SELA 橘 logo 撞色）。

## 三、完整 Prompt（複製貼上給其他 AI）

```
A flat 2D vector logo design in a 1:1 square aspect ratio.

CORE STYLE (inherited from SELA brand DNA):
- Square frame, corner radius about 15% of edge (rounded square)
- Single solid background color (no gradients)
- Pure white silhouette for the main subject
- Bold sans-serif app name at bottom, all caps
- Subject occupies top 60-70% of frame
- App name occupies bottom 30-40% of frame
- Padding: 8-15% margin between subject and frame edge
- No shadows, no gradients, no 3D effect, no glow, no texture, no embossing
- Sharp clean edges, suitable for favicon at 16x16 pixels
- Quiet, reliable, tool-like feeling — not flashy, not aggressive

REFERENCE STYLE: Sibling to SELA brand logo (orange #F36825 background, white gecko + "SELA" text, rounded square frame). This new logo should feel like a family member — same design language, different subject and color.

ADDITIONAL FOR GAME/ENTERTAINMENT TYPE (thoughtful / strategy variant):
- More refined and minimal than typical game logos; calm and collected
- Subject should hint at the core mechanic: finding places on a map of Taiwan
- Flat 2D only, no 3D, no glow, no gradients — keep the "thoughtful game made by a tool maker" feeling
- SELA family identity (calm, deliberate, hand-crafted) should shine through

SUBJECT: A clean white silhouette of the island of Taiwan, centered, with a single simple white map location pin (teardrop marker) resting on it to suggest "find this place on the map". Minimal, geometric, instantly readable. No text labels on the island, no city dots, no compass, no extra decoration.

APP NAME: "MAPQUIZ" in bold uppercase sans-serif, white, centered at the bottom.

BACKGROUND COLOR: Nordic misty blue #5A7A8B (primary choice). Alternative: deep slate blue #3F5B6B.

GECKO INHERITANCE: NO — this is a geography/map quiz; use the Taiwan-island + map-pin motif instead of the SELA gecko, so it reads as its own product within the SELA family.

TONE BALANCE:
- Should feel "this is a thoughtful learning game made by a tool maker"
- Not "a mass-market mobile game from a giant studio"
- Minimalist, Nordic, calm — matches the app's misty-blue minimalist interface.
```

## 四、給 SELA 的備註

- 拿到原圖後 → 走 `logo/CLAUDE.md` §10.2 工作流 B（我幫你優化轉檔 + 多解析度套組：16/32/48/64/128/256/512/1024 PNG + favicon.ico + apple-touch-icon），替換目前暫用的 SELA favicon，並更新 README 主視覺。
- 生圖時 `BACKGROUND COLOR` 建議先用候選 1 霧藍 `#5A7A8B`（跟介面一致）；想更沉穩再試候選 2。
- 如果 prompt 不滿意 → 跟我說，我重生（不需改 CLAUDE.md，回頭看 CLAUDE.md 就能重跑）。
- 想改範本類型 / 顏色 / 壁虎繼承決定 → 告訴我「改 X 為 Y」，我重產這份檔。
