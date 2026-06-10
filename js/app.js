/* TaiwanMapQuiz — app.js
   純原生 JS（無框架、無 build step）。資料來自 js/data.js 的 window.MAP / window.DISTRICTS。
   存檔用 localStorage；音效用 WebAudio（無外部資產）。 */
(function () {
  "use strict";

  var MAP = window.MAP, DISTRICTS = window.DISTRICTS;

  var NATIONAL = { viewBox: MAP.viewBox, regions: MAP.counties, insets: MAP.insets, hitCircles: MAP.hitCircles };
  function districtDataset(c) { var d = DISTRICTS[c]; return { viewBox: d.viewBox, regions: d.towns, insets: {}, hitCircles: {} }; }

  var COUNTY_ORDER = ["基隆市","台北市","新北市","桃園市","新竹市","新竹縣","苗栗縣","台中市","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","台南市","高雄市","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"];

  var COL = { land:"#D7DFE3", active:"#537387", correct:"#4A9B7F", wrong:"#9A8585", sea:"#EEF2F5", seaLine:"#DCE4E8", muted:"#8A9BA8", deep:"#3E5666", white:"#FFFFFF" };

  // scoring
  var BASE = 100, SPEED_CAP = 8, SPEED_MAX = 50;
  function comboMult(c) { return c >= 10 ? 3 : c >= 6 ? 2 : c >= 3 ? 1.5 : 1; }
  var TARGET_PER_Q = 6, TIME_BONUS_K = 12, WRONG_PENALTY = 5000;
  function isMap2() { return S.mode === "map2name" || S.mode === "timed"; }
  function fmtTime(ms) { var s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? s + " 秒" : Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  var timerInt = null;
  function startTimer() {
    if (timerInt) clearInterval(timerInt);
    timerInt = setInterval(function () {
      if (S.screen === "quiz" && S.mode === "timed") {
        var el = document.getElementById("rt");
        if (el) el.textContent = fmtTime((Date.now() - S.roundStart) + S.penaltyMs);
      } else { clearInterval(timerInt); timerInt = null; }
    }, 500);
  }

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

  function dataset() { return S.level === "county" ? NATIONAL : districtDataset(S.activeCounty); }
  function bestId(lv, m, c) { return lv === "county" ? "c-" + m : "d-" + c + "-" + m; }

  // ---------- map SVG ----------
  function buildMap(ds, fillOf, clickAct, target, labelName) {
    var insets = ds.insets || {}, hits = ds.hitCircles || {};
    var vb = ds.viewBox.split(" ").map(Number);
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
    var wh = (S.zoom * 100) + "%";
    return '<div class="map-box' + zc + '"><svg viewBox="' + ds.viewBox + '" width="' + wh + '" height="' + wh + '" preserveAspectRatio="xMidYMid meet">' + parts.join("") + '</svg></div>';
  }

  function zoomBar() {
    return '<div class="zoombar"><button class="iconbtn" data-act="zoomOut" aria-label="縮小">−</button><span class="pct">' + Math.round(S.zoom * 100) + '%</span><button class="iconbtn" data-act="zoomIn" aria-label="放大">+</button></div>';
  }
  function muteBtn() {
    return '<button class="iconbtn' + (S.muted ? " off" : "") + '" data-act="mute" aria-label="音效">♪</button>';
  }

  // ---------- fills ----------
  function fillQuiz(nm) {
    if (isMap2()) return nm === S.target ? COL.active : COL.land;
    if (!S.locked) return COL.land;
    if (nm === S.target) return COL.correct;
    if (nm === S.picked && S.picked !== S.target) return COL.wrong;
    return COL.land;
  }
  function fillExplore(nm) { return nm === S.revealed ? COL.active : COL.land; }
  function fillResult(nm) {
    for (var i = 0; i < S.answers.length; i++) if (S.answers[i].name === nm) return S.answers[i].correct ? COL.correct : COL.wrong;
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
        '<div class="hero-txt"><div class="hero-kicker">地理挑戰</div><div class="hero-title">台灣縣市地圖</div><div class="hero-sub">連擊加倍、限時加分，邊玩邊記 22 縣市與 368 區。</div></div>' +
      '</div>' +
      '<div class="eyebrow sub">縣市</div><div style="height:8px"></div>' +
      homeCard("startCounty", "timed", "限時挑戰", "看地圖選名字；時間越短，分數越高。答錯加 5 秒。", S.best["c-timed"]) +
      homeCard("startCounty", "map2name", "看地圖，選名字", "地圖點亮一個縣市，從四個選項選出它。", S.best["c-map2name"]) +
      homeCard("startCounty", "name2map", "看名字，點地圖", "給你縣市名稱，在地圖上點出位置。", S.best["c-name2map"]) +
      homeCard("exploreCounty", "", "自由練習", "點任一縣市看名稱，先把位置摸熟。", 0) +
      '<div class="eyebrow sub section-gap">鄉鎮市區</div>' +
      homeCard("toPicker", "", "分區測驗", "選一個縣市，放大考它底下的鄉鎮市區。", 0) +
      missBox +
      '<p class="note">金門、馬祖（連江縣）在地圖左上角小框內。地圖可用 +/− 放大。</p>' +
      '<div class="attrib"><img src="assets/sela.svg" alt="SELA"/><span>Made by SELA</span></div>';
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
    var c = S.activeCounty, n = Object.keys(DISTRICTS[c].towns).length;
    function card(m, title, desc) {
      var bid = "d-" + c + "-" + m, b = (m !== "explore" && S.best[bid] > 0) ? '<span class="best">最高 ' + S.best[bid] + ' 分</span>' : "";
      return '<button class="card" data-act="startDistrict" data-arg="' + m + '"><div class="row"><span class="title">' + title + '</span>' + b + '</div><div class="desc">' + desc + '</div></button>';
    }
    return '<div class="topbar"><button class="linkbtn" data-act="toPicker">‹ 換縣市</button></div>' +
      '<div class="eyebrow" style="margin-top:8px">' + n + ' 個鄉鎮市區</div><h2>' + c + '</h2>' +
      '<div style="height:230px;margin-bottom:16px">' + buildMap(districtDataset(c), fillFlat, null, null, null) + '</div>' +
      card("timed", "限時挑戰", "看地圖選名字；時間越短分數越高。答錯加 5 秒。") +
      card("map2name", "看地圖，選名字", "地圖點亮一個區，從四個選項選出它。") +
      card("name2map", "看名字，點地圖", "給你區名，在地圖上點出位置。") +
      card("explore", "自由練習", "點任一區看名稱。");
  }

  function viewQuiz() {
    var ds = dataset();
    var ctx = S.level === "county" ? "" : S.activeCounty + " ・ ";
    var score = S.answers.filter(function (a) { return a.correct; }).length;
    var mult = comboMult(S.combo);
    var comboCls = mult >= 2 ? "combo m2" : mult > 1 ? "combo m15" : "combo";
    var comboHtml = S.combo >= 2 ? '<div class="' + comboCls + ' tw-pop">連擊 ' + S.combo + (mult > 1 ? " ・ ×" + mult : "") + '</div>' : "";
    var floatHtml = (S.locked && S.lastGain > 0) ? '<span class="float tw-float">+' + S.lastGain + '</span>' : "";
    var speedCls = S.locked ? "speedbar locked" : "speedbar run";
    var timerHtml = (S.mode === "timed") ? '<span class="timerchip" id="rt">' + fmtTime((Date.now() - S.roundStart) + S.penaltyMs) + '</span>' : "";

    var promptHtml = '<div class="prompt"><div class="q">' + (isMap2() ? "點亮的是哪一個？" : "在地圖上找出：") + '</div>' +
      (S.mode === "name2map" ? '<div class="name">' + S.target + '</div>' : "") + '</div>';

    var clickAct = (S.mode === "name2map" && !S.locked) ? "answer" : null;
    var ringTarget = isMap2() ? S.target : null;
    var labelName = (S.mode === "name2map" && S.locked) ? S.target : null;
    var mapH = isMap2() ? "40vh" : "50vh";
    var mapHtml = '<div style="height:' + mapH + ';margin-bottom:12px">' + buildMap(ds, fillQuiz, clickAct, ringTarget, labelName) + '</div>';

    var bottom;
    if (isMap2()) {
      bottom = '<div class="opts">' + S.options.map(function (opt) {
        var cls = "opt";
        if (S.locked) { if (opt === S.target) cls = "opt correct"; else if (opt === S.picked) cls = "opt wrong"; else cls = "opt dim"; }
        var mark = "";
        if (S.locked && opt === S.target) mark = "  ✓";
        else if (S.locked && opt === S.picked) mark = "  ✗";
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
    var nextBtn = S.locked ? '<div style="margin-top:12px"><button class="btn btn-primary" data-act="next">' + (S.idx + 1 >= S.queue.length ? "看成績" : "下一題") + '</button></div>' : "";

    return '<div class="topbar"><span class="muted" style="font-size:13px">' + ctx + '第 ' + (S.idx + 1) + '/' + S.queue.length + '</span><span class="right">' + muteBtn() + zoomBar() + '</span></div>' +
      '<div class="scorestrip"><div><span class="lbl">分數</span><div class="pts">' + S.points + '</div></div><div class="srtright">' + timerHtml + comboHtml + '</div>' + floatHtml + '</div>' +
      '<div class="speedtrack"><div class="' + speedCls + '"></div></div>' +
      promptHtml + mapHtml + bottom + nextBtn;
  }

  function viewExplore() {
    var ds = dataset();
    var backTo = S.level === "county" ? "home" : "districtMenuBack";
    var ctx = S.level === "county" ? "全台縣市" : S.activeCounty;
    var status = S.revealed ? S.revealed : ("點" + (ctx === "全台縣市" ? "縣市" : "區") + "看名稱");
    var statusCls = S.revealed ? "" : "muted";
    return '<div class="topbar"><button class="linkbtn" data-act="' + backTo + '">‹ 返回</button><span class="right">' + zoomBar() + '</span></div>' +
      '<div style="text-align:center;font-size:15px;font-weight:700;min-height:24px;margin:6px 0 10px" class="' + statusCls + '">' + status + '</div>' +
      '<div style="flex:1;min-height:56vh">' + buildMap(ds, fillExplore, "reveal", null, S.revealed) + '</div>';
  }

  function viewResult() {
    var ds = dataset();
    var total = S.queue.length;
    var score = S.answers.filter(function (a) { return a.correct; }).length;
    var pct = Math.round((score / total) * 100);
    var rk = rankOf(pct);
    var wrong = S.answers.filter(function (a) { return !a.correct; }).map(function (a) { return a.name; });
    var avgMs = S.answers.length ? Math.round(S.answers.reduce(function (s, a) { return s + a.ms; }, 0) / S.answers.length) : 0;
    var ctx = S.level === "county" ? "全台縣市" : S.activeCounty;
    var timedStats = (S.mode === "timed") ? '<span>用時 <b>' + fmtTime(S.elapsedMs) + '</b></span><span>時間獎勵 <b>+' + S.timeBonus + '</b></span>' : '';
    var rc = pct >= 90 ? COL.deep : pct >= 60 ? COL.correct : COL.muted;
    var chips = wrong.length ? '<div style="margin-bottom:16px"><div class="desc" style="margin-bottom:8px">這幾個再看看</div><div class="chips">' + wrong.map(function (n) { return '<span class="chip">' + n + '</span>'; }).join("") + '</div></div>' : "";
    var retry = wrong.length ? '<button class="btn btn-outline" data-act="retry">只考錯的 ' + wrong.length + ' 個</button>' : "";
    var changeCounty = S.level === "district" ? '<button class="btn btn-outline" data-act="toPicker">換個縣市</button>' : "";
    return '<div class="topbar"><span class="muted" style="font-size:13px">' + ctx + '</span></div>' +
      '<div class="rankrow"><div class="rankbadge tw-pop" style="border-color:' + rc + '"><span class="g" style="color:' + rc + '">' + rk.g + '</span></div>' +
      '<div><div class="muted" style="font-size:13px">' + rk.label + (S.newBest ? " ・ 新紀錄!" : "") + '</div>' +
      '<div class="bigpts" style="color:' + rc + '">' + S.points + ' <small>分</small></div></div></div>' +
      '<div class="stats"><span>答對 <b>' + score + '/' + total + '</b>（' + pct + '%）</span><span>最佳連擊 <b>' + S.bestCombo + '</b></span><span>平均 <b>' + (avgMs / 1000).toFixed(1) + 's</b></span>' + timedStats + '</div>' +
      '<div style="height:42vh;margin-bottom:12px">' + buildMap(ds, fillResult, null, null, null) + '</div>' +
      '<div class="legend"><span><span class="dot" style="background:' + COL.correct + '"></span>答對 ' + score + '</span><span><span class="dot" style="background:' + COL.wrong + '"></span>答錯 ' + wrong.length + '</span></div>' +
      chips +
      '<div class="btn-col"><button class="btn btn-primary" data-act="again">再玩一次</button>' + retry + changeCounty +
      '<button class="btn btn-ghost" data-act="home">回首頁</button></div>';
  }

  function render() {
    var html;
    if (S.screen === "home") html = viewHome();
    else if (S.screen === "countyPicker") html = viewCountyPicker();
    else if (S.screen === "districtMenu") html = viewDistrictMenu();
    else if (S.screen === "explore") html = viewExplore();
    else if (S.screen === "result") html = viewResult();
    else html = viewQuiz();
    document.getElementById("app").innerHTML = html;
  }

  // ---------- logic ----------
  function start(mode, level, county, list) {
    var ds = level === "county" ? NATIONAL : districtDataset(county);
    var names = (list && list.length) ? list : Object.keys(ds.regions);
    S.level = level; S.activeCounty = county; S.mode = (mode === "explore" ? null : mode);
    S.queue = shuffle(names); S.idx = 0; S.answers = []; S.picked = null; S.locked = false;
    S.zoom = 1; S.revealed = null; S.points = 0; S.combo = 0; S.bestCombo = 0; S.lastGain = 0; S.newBest = false;
    S.startTime = Date.now();
    S.screen = (mode === "explore") ? "explore" : "quiz";
    S.target = S.queue[0];
    S.roundStart = Date.now(); S.penaltyMs = 0; S.timeBonus = 0; S.elapsedMs = 0;
    if (S.screen === "quiz" && isMap2()) S.options = sampleOptions(Object.keys(ds.regions), S.target);
    render();
    if (S.mode === "timed") startTimer();
  }

  function bumpMiss(name) {
    if (S.level !== "county") return;
    S.miss[name] = (S.miss[name] || 0) + 1; save("tw-miss", JSON.stringify(S.miss));
  }

  function pickAnswer(name) {
    if (S.locked || S.screen !== "quiz") return;
    var correct = name === S.target;
    var ms = Date.now() - S.startTime;
    S.picked = name; S.locked = true; S.lastMs = ms;
    if (correct) {
      var nc = S.combo + 1, mult = comboMult(nc);
      var speed = Math.round(SPEED_MAX * Math.max(0, 1 - Math.min(ms / 1000, SPEED_CAP) / SPEED_CAP));
      var gained = Math.round(BASE * mult) + speed;
      S.combo = nc; S.bestCombo = Math.max(S.bestCombo, nc); S.points += gained; S.lastGain = gained;
      if (!S.muted) sfx.correct(nc);
    } else {
      S.combo = 0; S.lastGain = 0; bumpMiss(S.target); if (S.mode === "timed") S.penaltyMs += WRONG_PENALTY;
      if (!S.muted) sfx.wrong();
    }
    render();
  }

  function next() {
    var correct = S.picked === S.target;
    S.answers.push({ name: S.target, correct: correct, picked: S.picked, ms: S.lastMs || 0 });
    S.picked = null; S.locked = false; S.lastGain = 0;
    if (S.idx + 1 >= S.queue.length) { finish(); return; }
    S.idx += 1; S.target = S.queue[S.idx]; S.startTime = Date.now();
    if (isMap2()) S.options = sampleOptions(Object.keys(dataset().regions), S.target);
    render();
  }

  function finish() {
    var score = S.answers.filter(function (a) { return a.correct; }).length;
    if (S.mode === "timed") {
      S.elapsedMs = (Date.now() - S.roundStart) + S.penaltyMs;
      var elapsedSec = S.elapsedMs / 1000;
      S.timeBonus = Math.max(0, Math.round((S.queue.length * TARGET_PER_Q - elapsedSec) * TIME_BONUS_K));
      S.points += S.timeBonus;
    }
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
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
  document.getElementById("app").addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!el) return;
    var act = el.getAttribute("data-act"), arg = el.getAttribute("data-arg");
    switch (act) {
      case "home": S.screen = "home"; render(); break;
      case "toPicker": S.screen = "countyPicker"; render(); break;
      case "pickCounty": S.activeCounty = arg; S.screen = "districtMenu"; render(); break;
      case "districtMenuBack": S.screen = "districtMenu"; render(); break;
      case "startCounty": start(arg, "county"); break;
      case "exploreCounty": start("explore", "county"); break;
      case "startDistrict": start(arg, "district", S.activeCounty); break;
      case "answer": pickAnswer(arg); break;
      case "reveal": S.revealed = arg; render(); break;
      case "next": next(); break;
      case "again": start(S.mode, S.level, S.activeCounty); break;
      case "retry": start(S.mode, S.level, S.activeCounty, S.answers.filter(function (a) { return !a.correct; }).map(function (a) { return a.name; })); break;
      case "zoomIn": S.zoom = Math.min(3, +(S.zoom + 0.25).toFixed(2)); render(); break;
      case "zoomOut": S.zoom = Math.max(1, +(S.zoom - 0.25).toFixed(2)); render(); break;
      case "mute": toggleMute(); render(); break;
    }
  });

  render();
})();
