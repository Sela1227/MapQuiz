/* TaiwanMapQuiz — app.js
   純原生 JS（無框架、無 build step）。資料來自 js/data.js 的 window.MAP / window.DISTRICTS。
   存檔用 localStorage；音效用 WebAudio（無外部資產）。 */
(function () {
  "use strict";

  var MAP = window.MAP, DISTRICTS = window.DISTRICTS;

  var NATIONAL = { viewBox: MAP.viewBox, regions: MAP.counties, insets: MAP.insets, hitCircles: MAP.hitCircles };
  function districtDataset(c) { var d = DISTRICTS[c]; return { viewBox: d.viewBox, regions: d.towns, insets: {}, hitCircles: {} }; }
  function worldDataset() { var w = window.WORLD; return { viewBox: w.viewBox, regions: w.regions, insets: w.insets || {}, hitCircles: w.hitCircles || {} }; }

  var COUNTY_ORDER = ["基隆市","台北市","新北市","桃園市","新竹市","新竹縣","苗栗縣","台中市","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","台南市","高雄市","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"];

  // 景點題索引：景點名 → 所屬縣市（資料來自 data/landmarks.js 的 window.LANDMARKS）
  var LMAP = {}, WLMAP = {};
  (function () {
    var L = window.LANDMARKS || {};
    Object.keys(L).forEach(function (county) { L[county].forEach(function (lm) { LMAP[lm] = county; }); });
    var W = window.WORLD_LANDMARKS || {};
    Object.keys(W).forEach(function (nation) { W[nation].forEach(function (lm) { WLMAP[lm] = nation; }); });
  })();
  function lmMap() { return S.level === "world" ? WLMAP : LMAP; }
  function isAssoc() { return S.mode === "landmark" || S.mode === "capital" || S.mode === "flag"; }
  function correctAns() {
    if (S.mode === "landmark") return lmMap()[S.target];
    if (S.mode === "capital") return window.CAPMAP[S.target];
    return S.target;  // flag 模式的題目本身就是國家
  }
  // 知名度三級權重：FAME3（家喻戶曉）5、有地標入庫者 2、其餘 1 —— 降低冷門國連發的挫折感
  var FAME3 = {};
  ["美國","中國","日本","南韓","北韓","英國","法國","德國","義大利","西班牙","葡萄牙","荷蘭","瑞士","瑞典","挪威","丹麥","芬蘭","俄羅斯","烏克蘭","波蘭","希臘","土耳其","埃及","南非","印度","巴基斯坦","泰國","越南","菲律賓","馬來西亞","新加坡","印尼","澳大利亞","紐西蘭","加拿大","墨西哥","巴西","阿根廷","智利","沙烏地阿拉伯","阿拉伯聯合大公國","以色列","伊朗","伊拉克","台灣","蒙古","緬甸","柬埔寨","古巴","奧地利","比利時","愛爾蘭","冰島","捷克","匈牙利","梵蒂岡","摩納哥","肯亞","衣索比亞","摩洛哥","哥倫比亞","秘魯"].forEach(function (n) { FAME3[n] = 1; });
  function famWeight(nation) {
    if (FAME3[nation]) return 5;
    if (window.WORLD_LANDMARKS && window.WORLD_LANDMARKS[nation]) return 2;
    return 1;
  }
  function weightedSample(names, wOf, k) {
    var bag = [];
    names.forEach(function (n) { var w = wOf(n); for (var i = 0; i < w; i++) bag.push(n); });
    bag = shuffle(bag);
    var out = [], seen = {};
    for (var i = 0; i < bag.length && out.length < k; i++) { if (!seen[bag[i]]) { seen[bag[i]] = 1; out.push(bag[i]); } }
    return out;
  }
  function pickFact(nation) {
    var FS = window.WORLD_FACTS && window.WORLD_FACTS[nation];
    return (FS && FS.length) ? FS[Math.floor(Math.random() * FS.length)] : null;
  }
  function optPool(ds) {
    var names = Object.keys(ds.regions);
    if (S.level !== "world") return names;
    var c = contOf(correctAns());
    var pool = names.filter(function (n) { return contOf(n) === c; });
    return pool.length >= 4 ? pool : names;
  }
  function contOf(nation) { var r = window.WORLD && window.WORLD.regions[nation]; return r ? r.cont : null; }
  function worldFocusBox() {
    if (S.level !== "world" || !S.target) return null;
    var Wd = window.WORLD; if (!Wd) return null;
    var nation = correctAns();
    var c = contOf(nation);
    var cb = (c && Wd.contBox && Wd.contBox[c]) || null;
    if (S.mode === "name2map") return expandIfZoomedOut(cb);  // 提示到「洲」為止，再緊會洩答
    var r = Wd.regions[nation]; if (!r || !r.bb) return cb;
    // 目標國置中的緊聚焦：目標約佔畫面 1/4，保留鄰國當參照
    var bw = r.bb[2] - r.bb[0], bh = r.bb[3] - r.bb[1];
    var size = Math.max(bw, bh);
    var vw = Math.min(Math.max(size * 4, 150), 980);
    var vh = vw * 0.62;
    if (vh < Math.max(size * 4, 96) * 0.62) vh = vw * 0.62;
    var cx = (r.bb[0] + r.bb[2]) / 2, cy = (r.bb[1] + r.bb[3]) / 2;
    var x = Math.max(0, Math.min(980 - vw, cx - vw / 2));
    var y = Math.max(0, Math.min(520 - vh, cy - vh / 2));
    return expandIfZoomedOut([Math.round(x), Math.round(y), Math.round(vw), Math.round(vh)]);
  }
  function expandIfZoomedOut(box) {
    if (!box || S.zoom >= 1) return box;
    var f = 1 / S.zoom;
    var cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
    var w = Math.min(980, box[2] * f), h = Math.min(520, box[3] * f);
    var x = Math.max(0, Math.min(980 - w, cx - w / 2));
    var y = Math.max(0, Math.min(520 - h, cy - h / 2));
    return [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
  }

  var COL = { land:"#D7DFE3", active:"#3C6078", correct:"#4A9B7F", wrong:"#9A8585", sea:"#EEF2F5", seaLine:"#DCE4E8", muted:"#8A9BA8", deep:"#2C4A5E", white:"#FFFFFF" };

  // scoring
  var BASE = 100, SPEED_CAP = 8, SPEED_MAX = 50;
  function comboMult(c) { return c >= 10 ? 3 : c >= 6 ? 2 : c >= 3 ? 1.5 : 1; }
  var VERSION = "2.0.1";
  var MAX_Q = 15, WRONG_POINTS = 50;
  function isMap2() { return S.mode === "map2name"; }

  // sound
  var ACTX = null;
  function beep(freq, dur, type, when, gain) {
    try {
      ACTX = ACTX || new (window.AudioContext || window.webkitAudioContext)();
      var o = ACTX.createOscillator(), g = ACTX.createGain();
      o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ACTX.destination);
      var t = ACTX.currentTime + (when || 0);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  var sfx = {
    correct: function (combo) { var b = 520 + Math.min(combo, 9) * 45; beep(b, 0.12, "triangle", 0, 0.16); beep(b * 1.5, 0.12, "triangle", 0.05, 0.10); },
    wrong: function () { beep(196, 0.18, "sawtooth", 0, 0.14); beep(150, 0.2, "sawtooth", 0.04, 0.12); },
    finish: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.16, "triangle", i * 0.11, 0.16); }); }
  };

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sampleOptions(names, target) { var pool = names.filter(function (n) { return n !== target; }); return shuffle([target].concat(shuffle(pool).slice(0, 3))); }
  function rankOf(pct) {
    if (pct >= 100) return { g: "S+", label: "完美，全圖通關" };
    if (pct >= 90) return { g: "S", label: "神之地理腦" };
    if (pct >= 75) return { g: "A", label: "相當熟練" };
    if (pct >= 60) return { g: "B", label: "有底子了" };
    if (pct >= 40) return { g: "C", label: "再多跑幾輪" };
    return { g: "D", label: "先用自由練習熟悉位置" };
  }

  // persistence
  function load(k) { try { var v = localStorage.getItem(k); return v == null ? null : v; } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // state
  var S = {
    screen: "home", level: "county", activeCounty: null, mode: null,
    queue: [], idx: 0, answers: [], picked: null, locked: false,
    zoom: 1, revealed: null, points: 0, combo: 0, bestCombo: 0,
    lastGain: 0, floatId: 0, startTime: 0, newBest: false,
    best: {}, miss: {}, muted: false
  };
  (function init() {
    try { S.best = JSON.parse(load("tw-best") || "{}"); } catch (e) { S.best = {}; }
    try { S.miss = JSON.parse(load("tw-miss") || "{}"); } catch (e) { S.miss = {}; }
    S.muted = load("tw-muted") === "1";
  })();

  function dataset() { return S.level === "county" ? NATIONAL : S.level === "world" ? worldDataset() : districtDataset(S.activeCounty); }
  function bestId(lv, m, c) { return lv === "county" ? "c-" + m : lv === "world" ? "w-" + m : "d-" + c + "-" + m; }

  // ---------- map SVG ----------
  function buildMap(ds, fillOf, clickAct, target, labelName, focusBox) {
    var insets = ds.insets || {}, hits = ds.hitCircles || {};
    var vb = focusBox ? [focusBox[0], focusBox[1], focusBox[2], focusBox[3]] : ds.viewBox.split(" ").map(Number);
    var order = Object.keys(ds.regions).sort(function (a, b) { return ds.regions[b].area - ds.regions[a].area; });
    var parts = [];
    parts.push('<rect x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '" fill="' + COL.sea + '" pointer-events="none"/>');
    Object.keys(insets).forEach(function (nm) {
      var b = insets[nm];
      parts.push('<g pointer-events="none"><rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="10" fill="#ffffff55" stroke="' + COL.seaLine + '" stroke-width="1" stroke-dasharray="4 4"/><text x="' + (b.x + 8) + '" y="' + (b.y + 16) + '" font-size="11" fill="' + COL.muted + '">' + b.label + '</text></g>');
    });
    order.forEach(function (nm) {
      var click = clickAct ? ' data-act="' + clickAct + '" data-arg="' + nm + '" style="cursor:pointer"' : "";
      parts.push('<path d="' + ds.regions[nm].d + '" fill="' + fillOf(nm) + '" stroke="' + COL.white + '" stroke-width="0.8" stroke-linejoin="round"' + click + '></path>');
    });
    if (clickAct) {
      Object.keys(insets).forEach(function (nm) { var b = insets[nm]; parts.push('<rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" fill="transparent" data-act="' + clickAct + '" data-arg="' + nm + '" style="cursor:pointer"/>'); });
      Object.keys(hits).forEach(function (nm) { var c = hits[nm]; parts.push('<circle cx="' + c.cx + '" cy="' + c.cy + '" r="' + c.r + '" fill="transparent" data-act="' + clickAct + '" data-arg="' + nm + '" style="cursor:pointer"/>'); });
    }
    if (target && ds.regions[target]) {
      var r = ds.regions[target];
      parts.push('<circle cx="' + r.cx + '" cy="' + r.cy + '" r="15" fill="none" stroke="' + COL.deep + '" stroke-width="2.5" class="tw-ring" pointer-events="none"/>');
    }
    if (labelName && ds.regions[labelName]) {
      var l = ds.regions[labelName];
      parts.push('<text x="' + l.cx + '" y="' + (l.cy + 4) + '" text-anchor="middle" font-size="14" font-weight="800" stroke="#fff" stroke-width="3.5" paint-order="stroke" fill="#16302A" pointer-events="none">' + labelName + '</text>');
    }
    var zc = S.zoom > 1 ? " zoomed" : "";
    var wh = (Math.max(1, S.zoom) * 100) + "%";
    return '<div class="map-box' + zc + '"><svg viewBox="' + vb.join(" ") + '" width="' + wh + '" height="' + wh + '" preserveAspectRatio="xMidYMid meet">' + parts.join("") + '</svg></div>';
  }

  function zoomBar() {
    return '<div class="zoombar"><button class="iconbtn" data-act="zoomOut" aria-label="縮小">−</button><span class="pct">' + Math.round(S.zoom * 100) + '%</span><button class="iconbtn" data-act="zoomIn" aria-label="放大">+</button></div>';
  }
  function muteBtn() {
    return '<button class="iconbtn' + (S.muted ? " off" : "") + '" data-act="mute" aria-label="音效">♪</button>';
  }

  // ---------- fills ----------
  function fillQuiz(nm) {
    if (isAssoc()) {
      if (!S.locked) return COL.land;
      if (nm === correctAns()) return COL.correct;
      if (nm === S.picked && S.picked !== correctAns()) return COL.wrong;
      return COL.land;
    }
    if (isMap2()) return nm === S.target ? COL.active : COL.land;
    if (!S.locked) return COL.land;
    if (nm === S.target) return COL.correct;
    if (nm === S.picked && S.picked !== S.target) return COL.wrong;
    return COL.land;
  }
  function fillExplore(nm) { return nm === S.revealed ? COL.active : COL.land; }
  function fillResult(nm) {
    for (var i = 0; i < S.answers.length; i++) if ((S.answers[i].county || S.answers[i].name) === nm) return S.answers[i].correct ? COL.correct : COL.wrong;
    return COL.land;
  }
  function fillFlat() { return COL.land; }

  // ---------- screens ----------
  function topMiss() {
    return Object.keys(S.miss).map(function (k) { return [k, S.miss[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4).map(function (x) { return x[0]; });
  }

  function homeCard(act, arg, title, desc, best) {
    var b = best > 0 ? '<span class="best">最高 ' + best + ' 分</span>' : "";
    return '<button class="card" data-act="' + act + '"' + (arg ? ' data-arg="' + arg + '"' : "") + '><div class="row"><span class="title">' + title + '</span>' + b + '</div><div class="desc">' + desc + '</div></button>';
  }

  function viewHome() {
    var tm = topMiss();
    var missBox = tm.length ? '<div class="box"><div class="desc" style="margin-bottom:8px">你最常答錯的縣市</div><div class="chips">' + tm.map(function (n) { return '<span class="chip">' + n + '</span>'; }).join("") + '</div></div>' : "";
    return '' +
      '<div class="hero">' +
        '<div class="hero-chip"><img src="assets/app-logo.png" alt="MapQuiz"/></div>' +
        '<div class="hero-txt"><div class="hero-kicker">地理挑戰</div><div class="hero-title">台灣及世界地圖測驗</div><div class="hero-sub">台灣縣市、鄉鎮市區到世界 196 國；答對加分、答錯扣分，越快加成越多。</div></div>' +
      '</div>' +
      '<div class="eyebrow sub">選一個層級開始</div><div style="height:8px"></div>' +
      '<button class="card lvcard" data-act="toCountyMenu"><span class="lvthumb">' + buildMap(NATIONAL, fillFlat, null, null, null) + '</span><span class="lvtxt"><span class="row"><span class="title">縣市</span><span class="best">22 個</span></span><span class="desc">全台縣市的位置與名稱。</span></span></button>' +
      '<button class="card lvcard" data-act="toPicker"><span class="lvthumb">' + buildMap(NATIONAL, fillFlat, null, null, null) + '</span><span class="lvtxt"><span class="row"><span class="title">鄉鎮市區</span><span class="best">368 個</span></span><span class="desc">選一個縣市，考它的分區。</span></span></button>' +
      '<button class="card lvcard" data-act="toWorldMenu"><span class="lvthumb lvworld">' + buildMap(worldDataset(), fillFlat, null, null, null) + '</span><span class="lvtxt"><span class="row"><span class="title">世界國家</span><span class="best">196 個</span></span><span class="desc">含梵蒂岡、巴勒斯坦與台灣。</span></span></button>' +
      missBox +
      '<p class="note">金門、馬祖（連江縣）在地圖左上角小框內。地圖可用 +/− 放大。計分：答對 +100（連擊有倍率）、答錯 −50，每題 8 秒內越快加成越多（最高 +50）。</p>' +
      '<div class="attrib"><img src="assets/sela.svg" alt="SELA"/><span>Made by SELA ・ V' + VERSION + '</span></div>';
  }

  // 線條圖示（stroke=currentColor，北歐極簡）
  var ICON = {
    map2name: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    name2map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    landmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6"/></svg>',
    capital: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7l1.5 3 3.3.4-2.4 2.2.6 3.2-3-1.6-3 1.6.6-3.2L7.2 10.4l3.3-.4z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4c3-2 6 2 9 0v9c-3 2-6-2-9 0"/></svg>',
    explore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>'
  };
  function tile(act, arg, icon, title, desc, bid) {
    var b = (bid && S.best[bid] > 0) ? '<span class="tile-best">' + S.best[bid] + '</span>' : "";
    return '<button class="tile" data-act="' + act + '"' + (arg ? ' data-arg="' + arg + '"' : "") + '>' +
      '<span class="tile-ic">' + icon + '</span>' + b +
      '<span class="tile-t">' + title + '</span>' +
      '<span class="tile-d">' + desc + '</span></button>';
  }
  var CONTS = ["亞洲", "歐洲", "非洲", "北美洲", "南美洲", "大洋洲"];
  function contChips() {
    var all = '<button class="contchip' + (!S.worldCont ? " on" : "") + '" data-act="setCont" data-arg="">全部</button>';
    var rest = CONTS.map(function (c) { return '<button class="contchip' + (S.worldCont === c ? " on" : "") + '" data-act="setCont" data-arg="' + c + '">' + c + '</button>'; }).join("");
    return '<div class="controw">' + all + rest + '</div>';
  }

  function viewCountyMenu() {
    return '<div class="topbar"><button class="linkbtn" data-act="home">‹ 回首頁</button></div>' +
      '<div class="eyebrow" style="margin-top:8px">22 個縣市</div><h2>全台縣市</h2>' +
      '<div style="height:148px;margin-bottom:12px">' + buildMap(NATIONAL, fillFlat, null, null, null) + '</div>' +
      '<div class="tilegrid">' +
      tile("startCounty", "map2name", ICON.map2name, "看地圖選名字", "點亮縣市四選一", "c-map2name") +
      tile("startCounty", "name2map", ICON.name2map, "看名字點地圖", "依名稱點出位置", "c-name2map") +
      tile("startCounty", "landmark", ICON.landmark, "景點題", "景點在哪個縣市", "c-landmark") +
      tile("exploreCounty", "", ICON.explore, "自由練習", "點縣市看名稱", null) +
      '</div>';
  }

  function viewWorldMenu() {
    return '<div class="topbar"><button class="linkbtn" data-act="home">‹ 回首頁</button></div>' +
      '<div class="eyebrow" style="margin-top:8px">196 個國家</div><h2>世界國家</h2>' +
      contChips() +
      '<div style="height:128px;margin-bottom:12px">' + buildMap(worldDataset(), fillFlat, null, null, null, S.worldCont ? window.WORLD.contBox[S.worldCont] : null) + '</div>' +
      '<div class="tilegrid">' +
      tile("startWorld", "map2name", ICON.map2name, "看地圖選名字", "點亮國家四選一", "w-map2name") +
      tile("startWorld", "name2map", ICON.name2map, "看名字點地圖", "依國名點出位置", "w-name2map") +
      tile("startWorld", "landmark", ICON.landmark, "地標題", "地標在哪個國家", "w-landmark") +
      tile("startWorld", "capital", ICON.capital, "首都題", "首都屬於哪一國", "w-capital") +
      tile("startWorld", "flag", ICON.flag, "國旗題", "看國旗認國家", "w-flag") +
      tile("exploreWorld", "", ICON.explore, "自由練習", "點國家看名稱", null) +
      '</div>';
  }

  function viewCountyPicker() {
    var grid = COUNTY_ORDER.map(function (c) {
      var n = Object.keys(DISTRICTS[c].towns).length;
      return '<button class="county-btn" data-act="pickCounty" data-arg="' + c + '"><span class="nm">' + c + '</span><span class="cnt">' + n + ' 區</span></button>';
    }).join("");
    return '<div class="topbar"><button class="linkbtn" data-act="home">‹ 回首頁</button></div>' +
      '<div class="eyebrow" style="margin-top:8px">分區測驗</div><h2>選一個縣市</h2>' +
      '<div class="grid3">' + grid + '</div>';
  }

  function viewDistrictMenu() {
    var d = DISTRICTS[S.activeCounty];
    return '<div class="topbar"><button class="linkbtn" data-act="toPicker">‹ 換縣市</button></div>' +
      '<div class="eyebrow" style="margin-top:8px">' + Object.keys(d.towns).length + ' 個鄉鎮市區</div><h2>' + S.activeCounty + '</h2>' +
      '<div style="height:148px;margin-bottom:12px">' + buildMap(districtDataset(S.activeCounty), fillFlat, null, null, null) + '</div>' +
      '<div class="tilegrid">' +
      tile("startDistrict", "map2name", ICON.map2name, "看地圖選名字", "點亮分區四選一", bestId("district", "map2name", S.activeCounty)) +
      tile("startDistrict", "name2map", ICON.name2map, "看名字點地圖", "依名稱點出位置", bestId("district", "name2map", S.activeCounty)) +
      tile("explore", "", ICON.explore, "自由練習", "點分區看名稱", null) +
      '</div>';
  }

  function viewQuiz() {
    var ds = dataset();
    var ctx = S.level === "county" ? "" : S.level === "world" ? "世界 ・ " : S.activeCounty + " ・ ";
    var score = S.answers.filter(function (a) { return a.correct; }).length;
    var mult = comboMult(S.combo);
    var comboCls = mult >= 2 ? "combo m2" : mult > 1 ? "combo m15" : "combo";
    var comboHtml = S.combo >= 2 ? '<div class="' + comboCls + ' tw-pop">連擊 ' + S.combo + (mult > 1 ? " ・ ×" + mult : "") + '</div>' : "";
    var floatHtml = (S.locked && S.lastGain !== 0) ? '<span class="float tw-float' + (S.lastGain < 0 ? ' neg' : '') + '">' + (S.lastGain > 0 ? '+' : '') + S.lastGain + '</span>' : "";
    var speedCls = S.locked ? "speedbar locked" : "speedbar run";

    var promptHtml = '<div class="prompt"><div class="q">' + (S.mode === "landmark" ? (S.level === "world" ? "這個地標位於哪個國家？" : "這個景點位於哪個縣市？") : S.mode === "capital" ? "這是哪個國家的首都？" : S.mode === "flag" ? "這是哪一國的國旗？" : isMap2() ? "點亮的是哪一個？" : "在地圖上找出：") + '</div>' +
      ((S.mode === "name2map" || S.mode === "landmark" || S.mode === "capital") ? '<div class="name">' + S.target + '</div>' : S.mode === "flag" ? '<div class="name flagbig">' + (window.WORLD_FLAGS[S.target] || "") + '</div>' : "") + '</div>';

    var clickAct = (S.mode === "name2map" && !S.locked) ? "answer" : null;
    var ringTarget = isMap2() ? S.target : (isAssoc() && S.locked ? correctAns() : null);
    var labelName = (S.mode === "name2map" && S.locked) ? S.target : (isAssoc() && S.locked ? correctAns() : null);
    var mapH = (isMap2() || isAssoc()) ? "40vh" : "50vh";
    var mapHtml = '<div style="height:' + mapH + ';margin-bottom:12px">' + buildMap(ds, fillQuiz, clickAct, ringTarget, labelName, worldFocusBox()) + '</div>';

    var bottom;
    if (isMap2() || isAssoc()) {
      bottom = '<div class="opts">' + S.options.map(function (opt) {
        var cls = "opt";
        if (S.locked) { if (opt === correctAns()) cls = "opt correct"; else if (opt === S.picked) cls = "opt wrong"; else cls = "opt dim"; }
        var mark = "";
        if (S.locked && opt === correctAns()) mark = "  ✓";
        else if (S.locked && opt === S.picked && opt !== correctAns()) mark = "  ✗";
        return '<button class="' + cls + '" data-act="answer" data-arg="' + opt + '"' + (S.locked ? " disabled" : "") + '>' + opt + mark + '</button>';
      }).join("") + '</div>';
    } else {
      if (S.locked) {
        bottom = (S.picked === S.target)
          ? '<div class="fb ok">答對了</div>'
          : '<div class="fb no">不對，正解是 ' + S.target + '（你點了 ' + (S.picked || "別處") + '）</div>';
      } else {
        bottom = '<div class="fb hint">點選你認為正確的位置。</div>';
      }
    }
    var factHtml = (S.locked && S.fact) ? '<div class="fact"><span class="fact-tag">小知識</span><span>' + (S.factName ? '<b class="fact-name">' + S.factName + '</b>' : '') + S.fact + '</span></div>' : '';
    var nextBtn = S.locked ? '<div style="margin-top:12px"><button class="btn btn-primary" data-act="next">' + (S.idx + 1 >= S.queue.length ? "看成績" : "下一題") + '</button></div>' : "";
    var stopBtn = '<div style="margin-top:10px"><button class="btn btn-ghost" data-act="stopQuiz">停止測驗並結算</button></div>';

    return '<div class="topbar"><span style="display:flex;align-items:center;gap:10px"><button class="linkbtn" data-act="quitQuiz">‹ 離開</button><span class="muted" style="font-size:13px">' + ctx + '第 ' + (S.idx + 1) + '/' + S.queue.length + '</span></span><span class="right">' + muteBtn() + zoomBar() + '</span></div>' +
      '<div class="scorestrip"><div><span class="lbl">分數</span><div class="pts">' + S.points + '</div></div><div class="srtright">' + comboHtml + '</div>' + floatHtml + '</div>' +
      '<div class="speedtrack"><div class="' + speedCls + '"></div></div>' +
      promptHtml + mapHtml + bottom + factHtml + nextBtn + stopBtn;
  }

  function viewExplore() {
    var ds = dataset();
    var backTo = S.level === "county" ? "countyMenuBack" : S.level === "world" ? "worldMenuBack" : "districtMenuBack";
    var ctx = S.level === "county" ? "全台縣市" : S.level === "world" ? "世界國家" : S.activeCounty;
    var status = S.revealed ? S.revealed : ("點" + (ctx === "全台縣市" ? "縣市" : ctx === "世界國家" ? "國家" : "區") + "看名稱");
    var exFact = (S.revealed && S.fact) ? '<div class="fact"><span class="fact-tag">小知識</span><span>' + (S.factName ? '<b class="fact-name">' + S.factName + '</b>' : '') + S.fact + '</span></div>' : '';
    var statusCls = S.revealed ? "" : "muted";
    return '<div class="topbar"><button class="linkbtn" data-act="' + backTo + '">‹ 返回</button><span class="right">' + zoomBar() + '</span></div>' +
      '<div style="text-align:center;font-size:15px;font-weight:700;min-height:24px;margin:6px 0 10px" class="' + statusCls + '">' + status + '</div>' +
      exFact +
      '<div style="flex:1;min-height:56vh">' + buildMap(ds, fillExplore, "reveal", null, S.revealed) + '</div>';
  }

  function viewResult() {
    var ds = dataset();
    var total = S.answers.length;
    var score = S.answers.filter(function (a) { return a.correct; }).length;
    var pct = Math.round((score / total) * 100);
    var rk = rankOf(pct);
    var wrong = S.answers.filter(function (a) { return !a.correct; }).map(function (a) { return a.name; });
    var avgMs = S.answers.length ? Math.round(S.answers.reduce(function (s, a) { return s + a.ms; }, 0) / S.answers.length) : 0;
    var ctx = S.level === "county" ? "全台縣市" : S.level === "world" ? "世界國家" : S.activeCounty;
    var rc = pct >= 90 ? COL.deep : pct >= 60 ? COL.correct : COL.muted;
    var chips = wrong.length ? '<div style="margin-bottom:16px"><div class="desc" style="margin-bottom:8px">這幾個再看看</div><div class="chips">' + wrong.map(function (n) { return '<span class="chip">' + n + '</span>'; }).join("") + '</div></div>' : "";
    var retry = wrong.length ? '<button class="btn btn-outline" data-act="retry">只考錯的 ' + wrong.length + ' 個</button>' : "";
    var backMenu = S.level === "district" ? '<button class="btn btn-outline" data-act="toPicker">換個縣市</button>' : '<button class="btn btn-outline" data-act="' + (S.level === "world" ? "toWorldMenu" : "toCountyMenu") + '">回模式選單</button>';
    return '<div class="topbar"><span class="muted" style="font-size:13px">' + ctx + '</span></div>' +
      '<div class="rankrow"><div class="rankbadge tw-pop" style="border-color:' + rc + '"><span class="g" style="color:' + rc + '">' + rk.g + '</span></div>' +
      '<div><div class="muted" style="font-size:13px">' + rk.label + (S.newBest ? " ・ 新紀錄!" : "") + '</div>' +
      '<div class="bigpts" style="color:' + rc + '">' + S.points + ' <small>分</small></div></div></div>' +
      '<div class="stats"><span>答對 <b>' + score + '/' + total + '</b>（' + pct + '%）</span>' + (total < S.queue.length ? '<span>提前結算（共 ' + S.queue.length + ' 題）</span>' : '') + '<span>最佳連擊 <b>' + S.bestCombo + '</b></span><span>平均 <b>' + (avgMs / 1000).toFixed(1) + 's</b></span></div>' +
      '<div style="height:42vh;margin-bottom:12px">' + buildMap(ds, fillResult, null, null, null) + '</div>' +
      '<div class="legend"><span><span class="dot" style="background:' + COL.correct + '"></span>答對 ' + score + '</span><span><span class="dot" style="background:' + COL.wrong + '"></span>答錯 ' + wrong.length + '</span></div>' +
      chips +
      '<div class="btn-col"><button class="btn btn-primary" data-act="again">再玩一次</button>' + retry + backMenu +
      '<button class="btn btn-ghost" data-act="home">回首頁</button></div>';
  }

  function render() {
    var html;
    if (S.screen === "home") html = viewHome();
    else if (S.screen === "countyMenu") html = viewCountyMenu();
    else if (S.screen === "worldMenu") html = viewWorldMenu();
    else if (S.screen === "countyPicker") html = viewCountyPicker();
    else if (S.screen === "districtMenu") html = viewDistrictMenu();
    else if (S.screen === "explore") html = viewExplore();
    else if (S.screen === "result") html = viewResult();
    else html = viewQuiz();
    document.getElementById("app").innerHTML = html;
  }

  // ---------- logic ----------
  function start(mode, level, county, list) {
    var ds = level === "county" ? NATIONAL : level === "world" ? worldDataset() : districtDataset(county);
    var names = (list && list.length) ? list : (mode === "landmark" ? Object.keys(level === "world" ? WLMAP : LMAP) : mode === "capital" ? Object.keys(window.CAPMAP) : Object.keys(ds.regions));
    if (level === "world" && S.worldCont && !(list && list.length)) {
      names = names.filter(function (n) { var nation = mode === "landmark" ? WLMAP[n] : mode === "capital" ? window.CAPMAP[n] : n; return contOf(nation) === S.worldCont; });
    }
    S.level = level; S.activeCounty = county; S.mode = (mode === "explore" ? null : mode);
    if (level === "world" && !(list && list.length)) {
      var wOf = (mode === "landmark") ? function (lm) { return famWeight(WLMAP[lm]); } : (mode === "capital") ? function (cp) { return famWeight(window.CAPMAP[cp]); } : famWeight;
      S.queue = weightedSample(names, wOf, MAX_Q);
    } else {
      S.queue = shuffle(names).slice(0, MAX_Q);
    }
    S.idx = 0; S.answers = []; S.picked = null; S.locked = false;
    S.zoom = 1; S.revealed = null; S.points = 0; S.combo = 0; S.bestCombo = 0; S.lastGain = 0; S.newBest = false;
    S.startTime = Date.now();
    S.screen = (mode === "explore") ? "explore" : "quiz";
    S.target = S.queue[0];
    if (S.screen === "quiz" && isMap2()) S.options = sampleOptions(optPool(ds), S.target);
    if (S.screen === "quiz" && isAssoc()) S.options = sampleOptions(optPool(ds), correctAns());
    render();
  }

  function bumpMiss(name) {
    if (S.level !== "county") return;
    S.miss[name] = (S.miss[name] || 0) + 1; save("tw-miss", JSON.stringify(S.miss));
  }

  function pickAnswer(name) {
    if (S.locked || S.screen !== "quiz") return;
    var correct = name === correctAns();
    var ms = Date.now() - S.startTime;
    S.picked = name; S.locked = true; S.lastMs = ms;
    S.fact = null; S.factName = null;
    if (S.level === "world") { S.fact = pickFact(correctAns()); S.factName = correctAns(); }
    else if (S.level === "county") {
      if (S.mode === "landmark" && window.TW_LM_DESC && window.TW_LM_DESC[S.target]) { S.fact = window.TW_LM_DESC[S.target]; S.factName = S.target; }
      else if (window.TW_FACTS && window.TW_FACTS[correctAns()]) { var tf = window.TW_FACTS[correctAns()]; S.fact = tf[Math.floor(Math.random() * tf.length)]; S.factName = correctAns(); }
    }
    if (correct) {
      var nc = S.combo + 1, mult = comboMult(nc);
      var speed = Math.round(SPEED_MAX * Math.max(0, 1 - Math.min(ms / 1000, SPEED_CAP) / SPEED_CAP));
      var gained = Math.round(BASE * mult) + speed;
      S.combo = nc; S.bestCombo = Math.max(S.bestCombo, nc); S.points += gained; S.lastGain = gained;
      if (!S.muted) sfx.correct(nc);
    } else {
      S.combo = 0; var loss = Math.min(WRONG_POINTS, S.points); S.points -= loss; S.lastGain = -loss; bumpMiss(correctAns());
      if (!S.muted) sfx.wrong();
    }
    render();
  }

  function next() {
    S.fact = null;
    var correct = S.picked === correctAns();
    S.answers.push({ name: S.target, county: correctAns(), correct: correct, picked: S.picked, ms: S.lastMs || 0 });
    S.picked = null; S.locked = false; S.lastGain = 0;
    if (S.idx + 1 >= S.queue.length) { finish(); return; }
    S.idx += 1; S.target = S.queue[S.idx]; S.startTime = Date.now();
    if (isMap2()) S.options = sampleOptions(optPool(dataset()), S.target);
    if (isAssoc()) S.options = sampleOptions(optPool(dataset()), correctAns());
    render();
  }

  function finish() {
    var score = S.answers.filter(function (a) { return a.correct; }).length;
    var id = bestId(S.level, S.mode, S.activeCounty);
    var prev = S.best[id] || 0;
    S.newBest = S.points > prev;
    if (S.newBest) { S.best[id] = S.points; save("tw-best", JSON.stringify(S.best)); }
    if (!S.muted) sfx.finish();
    S.screen = "result"; render();
  }

  function toggleMute() {
    S.muted = !S.muted; save("tw-muted", S.muted ? "1" : "0");
    if (!S.muted) { try { ACTX = ACTX || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  }

  // ---------- events (delegation) ----------
  function zoomFloor() { return (S.screen === "quiz" && S.level === "world") ? 0.2 : 1; }
  function zoomBy(d) { S.zoom = Math.min(4, Math.max(zoomFloor(), +(S.zoom + d).toFixed(2))); render(); }
  document.getElementById("app").addEventListener("wheel", function (e) {
    var box = e.target.closest ? e.target.closest(".map-box") : null;
    if (!box) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.5 : -0.5);  // 滾輪一格 ±0.5，比按鈕快
  }, { passive: false });

  // 雙指捏合縮放：移動中用 CSS transform 即時預覽（不重繪），放手才提交 S.zoom 並 render()
  var pinch = { active: false, startDist: 0, startZoom: 1, tent: 1, svg: null };
  function touchDist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
  document.getElementById("app").addEventListener("touchstart", function (e) {
    if (e.touches.length !== 2) return;
    var box = e.target.closest ? e.target.closest(".map-box") : null;
    if (!box) return;
    pinch.active = true; pinch.startDist = touchDist(e.touches); pinch.startZoom = S.zoom; pinch.tent = S.zoom;
    pinch.svg = box.querySelector("svg");
    if (pinch.svg) { pinch.svg.style.transformOrigin = "center center"; }
  }, { passive: true });
  document.getElementById("app").addEventListener("touchmove", function (e) {
    if (!pinch.active || e.touches.length !== 2) return;
    e.preventDefault();  // 阻止瀏覽器整頁縮放
    var ratio = touchDist(e.touches) / pinch.startDist;
    pinch.tent = Math.min(4, Math.max(zoomFloor(), +(pinch.startZoom * ratio).toFixed(2)));
    if (pinch.svg) pinch.svg.style.transform = "scale(" + (pinch.tent / pinch.startZoom) + ")";
  }, { passive: false });
  function endPinch() {
    if (!pinch.active) return;
    pinch.active = false;
    if (pinch.svg) pinch.svg.style.transform = "";
    if (pinch.tent !== S.zoom) { S.zoom = pinch.tent; render(); }
  }
  document.getElementById("app").addEventListener("touchend", endPinch, { passive: true });
  document.getElementById("app").addEventListener("touchcancel", endPinch, { passive: true });

  // 雙指捏合縮放：移動中用 transform 預覽（避免重繪大 SVG），放手才 commit 重繪
  var pinch = { active: false, d0: 0, z0: 1, scale: 1, el: null };
  function tDist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy) || 1; }
  var appEl = document.getElementById("app");
  appEl.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 2) return;
    var box = e.target.closest ? e.target.closest(".map-box") : null;
    if (!box) return;
    e.preventDefault();
    pinch.active = true; pinch.el = box; pinch.d0 = tDist(e.touches); pinch.z0 = S.zoom; pinch.scale = 1;
  }, { passive: false });
  appEl.addEventListener("touchmove", function (e) {
    if (!pinch.active || e.touches.length !== 2) return;
    e.preventDefault();
    pinch.scale = tDist(e.touches) / pinch.d0;
    var svg = pinch.el.querySelector("svg");
    if (svg) { svg.style.transformOrigin = "center"; svg.style.transform = "scale(" + pinch.scale + ")"; }
  }, { passive: false });
  function endPinch() {
    if (!pinch.active) return;
    pinch.active = false;
    var svg = pinch.el && pinch.el.querySelector("svg");
    if (svg) svg.style.transform = "";
    S.zoom = Math.min(4, Math.max(zoomFloor(), +(pinch.z0 * pinch.scale).toFixed(2)));
    render();
  }
  appEl.addEventListener("touchend", endPinch);
  appEl.addEventListener("touchcancel", endPinch);
  document.getElementById("app").addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!el) return;
    var act = el.getAttribute("data-act"), arg = el.getAttribute("data-arg");
    switch (act) {
      case "home": S.screen = "home"; render(); break;
      case "toPicker": S.screen = "countyPicker"; render(); break;
      case "toCountyMenu": S.screen = "countyMenu"; render(); break;
      case "toWorldMenu": S.screen = "worldMenu"; render(); break;
      case "setCont": S.worldCont = arg || null; render(); break;
      case "worldMenuBack": S.screen = "worldMenu"; render(); break;
      case "startWorld": start(arg, "world"); break;
      case "exploreWorld": start("explore", "world"); break;
      case "countyMenuBack": S.screen = "countyMenu"; render(); break;
      case "pickCounty": S.activeCounty = arg; S.screen = "districtMenu"; render(); break;
      case "districtMenuBack": S.screen = "districtMenu"; render(); break;
      case "startCounty": start(arg, "county"); break;
      case "exploreCounty": start("explore", "county"); break;
      case "startDistrict": start(arg, "district", S.activeCounty); break;
      case "answer": pickAnswer(arg); break;
      case "reveal": S.revealed = arg; S.fact = (S.level === "world") ? pickFact(arg) : ((S.level === "county" && window.TW_FACTS && window.TW_FACTS[arg]) ? window.TW_FACTS[arg][Math.floor(Math.random() * window.TW_FACTS[arg].length)] : null); S.factName = S.fact ? arg : null; render(); break;
      case "next": next(); break;
      case "stopQuiz":
        if (S.locked) { S.answers.push({ name: S.target, county: correctAns(), correct: S.picked === correctAns(), picked: S.picked, ms: S.lastMs || 0 }); S.picked = null; S.locked = false; }
        if (S.answers.length === 0) { S.screen = (S.level === "county") ? "countyMenu" : (S.level === "world") ? "worldMenu" : "districtMenu"; render(); break; }
        finish(); break;
      case "quitQuiz": S.picked = null; S.locked = false; S.lastGain = 0; S.screen = (S.level === "county") ? "countyMenu" : (S.level === "world") ? "worldMenu" : "districtMenu"; render(); break;
      case "again": start(S.mode, S.level, S.activeCounty); break;
      case "retry": start(S.mode, S.level, S.activeCounty, S.answers.filter(function (a) { return !a.correct; }).map(function (a) { return a.name; })); break;
      case "zoomIn": zoomBy(+0.25); break;
      case "zoomOut": zoomBy(-0.25); break;
      case "mute": toggleMute(); render(); break;
    }
  });

  render();
})();
