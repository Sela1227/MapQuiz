# MapQuiz 內容維護手冊（CONTENT-GUIDE）

> 適用 schema_version 1。工具：`tools/build.py`、`tools/validate.py`、`tools/bump.py`、`./make.sh`。
> 鐵則：**只編輯 `data-src/`，永遠不手改 `data/*.js`**（GENERATED，會被覆蓋；validate 的往返檢查會抓）。

## 一、日常流程

```
改 data-src/*.json（或丟 deltas/xxx.json）
→ ./make.sh           # build → validate → test → zip
→ 或分步：python3 tools/build.py && python3 tools/validate.py && node tests/run-tests.js
```

升版：`./make.sh 2.6.0`（先 bump 四處再跑全流程）。CLAUDE.md 版本歷程需手動補一列。

## 二、句子規則（validate 強制）

1. **完整句、有謂語**——「電競強國」✗ →「電競被視為國民運動，職業聯賽火熱」✓
2. 長度 **6–40 字**；禁 `?` 與亂碼字元
3. **不洩答**（坑 P7）：台灣景點名不得含縣市核心字（含臺/台變體與俗稱：馬祖、蘭陽）；世界地標名不得含國名；首都含國名者自動排除出題（build 處理）
4. 同一 key 下不得重複字串
5. 小知識**可以**含國名/縣市名（答題後才顯示）

## 三、角度分類法（寫作 checklist）

每條標 `angle`，白名單：`地標 飲食 工藝 節慶 歷史 自然 冷知識 體驗 最高級 音樂`；未定標 `unsorted`（warning 不擋，逐步收斂）。

擴充某國前先看缺什麼角度：同一國盡量覆蓋 5 種以上角度，同角度連寫不超過 3 條。範例：

- 飲食：「巴東菜整桌小碟任選算盤計價」
- 冷知識：「大笨鐘其實是裡面那口鐘的名字」
- 體驗：「奎壁山摩西分海漲潮前須及時折返」
- 最高級：「吐瓦魯最高點僅約4.6公尺」

## 四、新增內容（delta 工作流）

加量用 delta，**不要**重生整個主檔：

```json
// deltas/202606-kenya-food.json
{ "target": "facts-world",
  "items": { "肯亞": [ {"text": "烤肉nyama choma配啤酒是國民聚餐", "angle": "飲食"} ] } }
```

規則：**只增不改**；與既有條目重複 → build 整批中止。成功後 delta 自動歸檔 `deltas/applied/`。
要修改既有條目 → 直接改主 JSON（git diff 可查）。

## 五、改名程序

名稱即主鍵。改景點/國家名必須同步所有出現處（題庫、說明、首都、旗幟），改完跑 validate——交叉比對會列出所有不一致。

## 六、schema 演化程序

要加欄位（如 difficulty）：`SCHEMA+1`（build.py/validate.py 同步）→ 寫遷移腳本把舊源升級 → 本節記錄變更。舊工具碰新資料會直接拒絕（這是故意的）。

## 七、各資料集對照

| data-src | 產出 | 全域變數 | 下限 |
|---|---|---|---|
| facts-world | world-facts.js | WORLD_FACTS | 每國 8；熱門 33 國 15 |
| facts-taiwan | taiwan-facts.js | TW_FACTS | 每縣市 10 |
| lm-desc-world | world-landmarks.js | WORLD_LM_DESC | 每地標 3 |
| lm-desc-taiwan | taiwan-facts.js | TW_LM_DESC | 每景點 3 |
| landmarks-world | world-landmarks.js | WORLD_LANDMARKS | — |
| landmarks-taiwan | landmarks.js | LANDMARKS | — |
| capitals | world-capitals.js | WORLD_CAPITALS＋CAPMAP（派生）| 196 全 |
| capital-facts | world-capitals.js | CAP_FACTS（key 轉為首都名）| 每首都 3 |
| flags | world-flags.js | WORLD_FLAGS | 196 全 |

注意：`data/world.js`（地理輪廓）不在本系統，由 `proc_world2.py` 管（見 CLAUDE.md）。
測試需 jsdom（dev 環境 `npm i jsdom`，不進 repo）。
