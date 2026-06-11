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
const dom = new JSDOM(fs.readFileSync(path.join(P, 'index.html'), 'utf8'), { pretendToBeVisual: true, url: 'https://x.github.io/MapQuiz/', runScripts: 'outside-only' });
const memStore = {};
Object.defineProperty(dom.window, 'localStorage', { value: { getItem: k => (k in memStore ? memStore[k] : null), setItem: (k, v) => { memStore[k] = String(v); }, removeItem: k => { delete memStore[k]; } }, configurable: true });
global.document = dom.window.document;
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
ok(d.querySelector('.fact-name').textContent === cap, '首都題小知識標首都名');
ok(!W.CAP_FACTS[cap] || W.CAP_FACTS[cap].includes(d.querySelector('.fact').textContent.replace('小知識', '').replace(cap, '')), '首都題顯示該首都冷知識');
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
const dfact = d.querySelector('.fact');
const dname = dfact && dfact.querySelector('.fact-name') ? dfact.querySelector('.fact-name').textContent : null;
ok(!!dfact, '分區層級答完顯示分區小知識');
ok(!dname || (W.DISTRICT_FACTS && W.DISTRICT_FACTS['台中市/' + dname]), '分區小知識歸屬正確');
click('[data-act="quitQuiz"]');

console.log('— 返回手勢（popstate）—');
function back() { W.history.back(); W.dispatchEvent(new W.PopStateEvent('popstate', { state: W.history.state })); }
function scrName() { if (d.querySelector('.prompt')) return 'quiz'; if (d.querySelector('.resgrid')) return 'result'; if (d.querySelector('.x-map')) return 'explore'; if (d.querySelector('.lvgrid')) return 'home'; return d.querySelector('h2') ? d.querySelector('h2').textContent : '?'; }
if (d.querySelector('[data-act="quitQuiz"]')) click('[data-act="quitQuiz"]');
for (let i = 0; i < 6 && scrName() !== 'home'; i++) back();  // 用返回手勢一路退回根
ok(scrName() === 'home', '連續返回手勢可退回首頁');
click('[data-act="toWorldMenu"]'); click('[data-act="startWorld"][data-arg="map2name"]');
ok(scrName() === 'quiz', '進入世界測驗');
back(); ok(scrName() === '世界國家', 'quiz 返回手勢→世界選單（不退出）');
back(); ok(scrName() === 'home', '選單返回手勢→首頁');

console.log('— 常錯復習 —');
W.eval ? null : null;
// 製造縣市錯題（map2name 連點第一個選項）
for (let i = 0; i < 6 && !d.querySelector('.lvgrid'); i++) { const h = d.querySelector('[data-act="home"]'); if (h) h.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); else break; }
click('[data-act="toCountyMenu"]'); click('[data-act="startCounty"][data-arg="map2name"]');
for (let q = 0; q < 15; q++) { const o = d.querySelector('.opt'); if (!o) break; o.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); const n = d.querySelector('[data-act="next"]'); if (n) n.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); else break; }
let missObj = {}; try { missObj = JSON.parse(memStore['tw-miss'] || '{}'); } catch (e) {}
ok(Object.keys(missObj).length > 0, '答錯記錄寫入 localStorage');
ok(Object.keys(missObj).every(k => /^[cwd]\|/.test(k)), '錯題鍵帶層級前綴');
for (let i = 0; i < 6 && !d.querySelector('.lvgrid'); i++) { const h = d.querySelector('[data-act="home"]'); if (h) h.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); else break; }
const reviewCard = d.querySelector('.review-card');
ok(!!reviewCard, '首頁顯示復習卡');
if (reviewCard) { click('[data-act="startReview"]'); ok(!!(d.querySelector('.opt') || d.querySelector('path[data-act="answer"]')), '復習卡進入測驗'); }

if (failed) { console.log('\nFAILED: ' + failed); process.exit(1); }
console.log('\nALL PASS');
