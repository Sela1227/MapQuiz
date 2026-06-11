// MapQuiz 常駐測試（V2.5.0）。需 jsdom（dev 環境）。用法：node tests/run-tests.js
// ── 導航地圖（之前測試屢踩的坑，固化於此）──
//   home → toCountyMenu/toPicker/toWorldMenu
//   countyMenu/worldMenu 的返回鍵是 "home"（不是 *MenuBack！）
//   quiz 內只有 "quitQuiz"（沒有 home）；quitQuiz 回到該層模式選單
//   explore 的返回鍵才是 countyMenuBack/worldMenuBack/districtMenuBack
//   result 有 "home"/"again"/"retry"
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const P = path.join(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(P, 'index.html'), 'utf8'), { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document;
for (const f of ['js/data.js', 'data/landmarks.js', 'data/world.js', 'data/world-landmarks.js',
  'data/world-facts.js', 'data/taiwan-facts.js', 'data/world-capitals.js', 'data/world-flags.js', 'js/app.js'])
  dom.window.eval(fs.readFileSync(path.join(P, f), 'utf8'));

const d = dom.window.document;
let failed = 0;
function ok(cond, label) { console.log((cond ? '  ✓ ' : '  ✗ ') + label); if (!cond) failed++; }
function click(sel) {
  const el = d.querySelector(sel);
  if (!el) { console.log('  ✗ [nav] 找不到 ' + sel + '（畫面=' + (d.querySelector('h2') || {}).textContent + '）'); failed++; return false; }
  el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true;
}
function answerRound(maxQ) { // 在 quiz 內答到底，結束於 result
  for (let q = 0; q < maxQ + 2; q++) {
    if (d.querySelector('.opt')) click('.opt');
    else if (d.querySelector('path[data-act="answer"]')) click('path[data-act="answer"]');
    const next = d.querySelector('[data-act="next"]');
    if (next) click('[data-act="next"]'); else break;
  }
}

console.log('— 資料量 —');
const W = dom.window;
ok(Object.keys(W.WORLD_FACTS).length === 196, 'WORLD_FACTS 196 國');
ok(Object.values(W.WORLD_FACTS).every(v => v.length >= 8), '每國 >=8 段');
ok(Object.values(W.TW_FACTS).every(v => v.length >= 10), '縣市 >=10 段');
ok(Object.values(W.TW_LM_DESC).every(v => v.length >= 3) && Object.values(W.WORLD_LM_DESC).every(v => v.length >= 3), '景點/地標說明 >=3 句');
ok(Object.keys(W.CAPMAP).length < Object.keys(W.WORLD_CAPITALS).length, 'CAPMAP 已排除洩答首都');

console.log('— 台灣三模式 —');
click('[data-act="toCountyMenu"]');
click('[data-act="startCounty"][data-arg="landmark"]');
const lm = d.querySelector('.prompt .name').textContent;
click('.opt');
const f1 = d.querySelector('.fact');
ok(f1 && W.TW_LM_DESC[lm].includes(f1.textContent.replace('小知識', '').replace(lm, '')), '景點題小知識=該景點說明之一');
click('[data-act="quitQuiz"]');
click('[data-act="startCounty"][data-arg="map2name"]'); answerRound(15);
ok(!!d.querySelector('.resgrid'), '縣市 map2name 答到結算');
click('[data-act="home"]');

console.log('— 世界三模式＋小知識歸屬 —');
click('[data-act="toWorldMenu"]');
click('[data-act="startWorld"][data-arg="capital"]');
const cap = d.querySelector('.prompt .name').textContent;
ok(cap in W.CAPMAP, '首都題目在出題池');
click('.opt');
ok(d.querySelector('.fact-name').textContent === W.CAPMAP[cap], '首都題小知識標正解國名');
click('[data-act="quitQuiz"]');
click('[data-act="startWorld"][data-arg="flag"]');
ok(/[\u{1F1E6}-\u{1F1FF}]/u.test(d.querySelector('.name.flagbig').textContent), '國旗題顯示旗幟');
click('.opt'); click('[data-act="quitQuiz"]');
click('[data-act="startWorld"][data-arg="landmark"]');
const wlm = d.querySelector('.prompt .name').textContent;
click('.opt');
ok(W.WORLD_LM_DESC[wlm].includes(d.querySelector('.fact').textContent.replace('小知識', '').replace(wlm, '')), '世界地標題小知識=地標說明');
click('[data-act="quitQuiz"]');

console.log('— 探索＋捲動保留 —');
click('[data-act="exploreWorld"]');
click('[data-act="zoomIn"]'); click('[data-act="zoomIn"]');
const box = d.querySelector('.map-box'); box.scrollLeft = 99; box.scrollTop = 77;
click('path[data-act="reveal"]');
const nb = d.querySelector('.map-box');
ok(nb.scrollLeft === 99 && nb.scrollTop === 77, '放大點選保留捲動');
click('[data-act="worldMenuBack"]');
ok(!!d.querySelector('.m-tiles'), 'explore 返回世界選單');
click('[data-act="home"]');
ok(!!d.querySelector('.lvgrid'), '回首頁');

console.log('— 分區層級 —');
click('[data-act="toPicker"]'); click('[data-act="pickCounty"][data-arg="台中市"]');
click('[data-act="startDistrict"][data-arg="map2name"]'); click('.opt');
ok(!d.querySelector('.fact'), '分區層級不顯示小知識');
click('[data-act="quitQuiz"]');

if (failed) { console.log('\nFAILED: ' + failed); process.exit(1); }
console.log('\nALL PASS');
