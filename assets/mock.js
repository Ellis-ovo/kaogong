/* 考公学习系统 · 模拟考试
 * 依赖 system.js 暴露的 window.KG（esc / save / S）
 * 结构：mk = { phase, cfg, qs, idx, picks, left, t, started, res }
 */
window.MOCK = (function () {
  'use strict';

  function K() { return window.KG; }
  function esc(s) { return K().esc(s); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(s) { s = Math.max(0, s | 0); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }

  var MODES = {
    full: { name: '行测全卷', n: 100, secs: 120 * 60, desc: '五模块混合，按国考配比抽题，120 分钟' },
    quick: { name: '快速模拟', n: 40, secs: 40 * 60, desc: '40 题，40 分钟，适合每天一次' },
    one: { name: '单模块', n: 20, secs: 25 * 60, desc: '专练一个模块，20 题，25 分钟' }
  };
  var FULL_RATIO = { '言语理解': 28, '判断推理': 30, '数量关系': 12, '资料分析': 15, '常识判断': 15 };

  var mk = {
    phase: 'idle',
    mode: 'quick',
    mod: '言语理解',
    qs: [],
    idx: 0,
    picks: {},
    left: 0,
    started: 0,
    t: null,
    res: null
  };

  function state() { return K().S; }

  function pool(mod) {
    var all = (window.APP_DATA.questions || []).filter(function (q) {
      return q && q.opts && q.opts.length === 4 && q.ans >= 0 && (!mod || q.mod === mod);
    });
    return all;
  }

  function shuffle(a, seed) {
    var r = seed || (Date.now() % 100000);
    for (var i = a.length - 1; i > 0; i--) {
      r = (r * 9301 + 49297) % 233280;
      var j = Math.floor(r / 233280 * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 按模块配额抽题；资料分析按材料成组抽取 */
  function sample(quotas) {
    var out = [];
    Object.keys(quotas).forEach(function (mod) {
      var need = quotas[mod];
      if (!need) return;
      var arr = shuffle(pool(mod).slice(), Date.now() + mod.length * 17);
      if (mod === '资料分析') {
        var groups = {}, keys = [];
        arr.forEach(function (q) {
          var k = q.mat || ('x' + (q.stem || '').slice(0, 6));
          if (!groups[k]) { groups[k] = []; keys.push(k); }
          groups[k].push(q);
        });
        shuffle(keys, Date.now() + 31);
        for (var i = 0; i < keys.length && countIn(out, mod) < need; i++) {
          var g = groups[keys[i]];
          for (var j = 0; j < g.length && countIn(out, mod) < need; j++) out.push(g[j]);
        }
      } else {
        arr.slice(0, need).forEach(function (q) { out.push(q); });
      }
    });
    return out;
  }

  function countIn(list, mod) {
    return list.filter(function (q) { return q.mod === mod; }).length;
  }

  function build() {
    var mode = MODES[mk.mode];
    var qs;
    if (mk.mode === 'one') {
      qs = pool(mk.mod).slice(0, mode.n);
      qs = shuffle(qs, Date.now());
    } else if (mk.mode === 'full') {
      qs = sample(FULL_RATIO);
    } else {
      var q2 = {};
      D_modules().forEach(function (m) { q2[m] = Math.round(mode.n * (FULL_RATIO[m] / 100)); });
      qs = sample(q2);
    }
    // 全卷 / 快测按模块顺序排列；同模块内保持随机
    if (mk.mode !== 'one') {
      qs.sort(function (a, b) { return D_modules().indexOf(a.mod) - D_modules().indexOf(b.mod); });
    }
    return qs.slice(0, mode.n);
  }

  function D_modules() {
    return (window.APP_DATA.modules || ['言语理解', '判断推理', '数量关系', '资料分析', '常识判断']);
  }

  /* ---------------- 计时 ---------------- */

  function tick() {
    if (mk.phase !== 'run') return;
    var used = Math.round((Date.now() - mk.started) / 1000);
    mk.left = MODES[mk.mode].secs - used;
    var el = document.getElementById('mkTimer');
    if (el) {
      el.textContent = fmt(mk.left);
      el.classList.toggle('warn', mk.left <= 300);
    }
    if (mk.left <= 0) submit(true);
  }

  function startTimer() {
    stopTimer();
    mk.started = Date.now();
    mk.left = MODES[mk.mode].secs;
    mk.t = setInterval(tick, 1000);
  }
  function stopTimer() { if (mk.t) { clearInterval(mk.t); mk.t = null; } }

  /* ---------------- 渲染 ---------------- */

  function render() {
    if (mk.phase === 'run') return viewRun();
    if (mk.phase === 'done') return viewDone();
    return viewIdle();
  }

  function viewIdle() {
    var hist = state().mock || [];
    var mode = MODES[mk.mode];
    var counts = {};
    D_modules().forEach(function (m) { counts[m] = pool(m).length; });
    var bank = D_modules().reduce(function (s, m) { return s + counts[m]; }, 0);

    var modBtns = D_modules().map(function (m) {
      return '<button class="' + (mk.mod === m ? 'on' : '') + '" data-act="mkMode" data-m="' + esc(m) + '">' + esc(m) + '</button>';
    }).join('');

    var modeCards = Object.keys(MODES).map(function (k) {
      var m = MODES[k];
      return '<button class="mk-mode' + (mk.mode === k ? ' on' : '') + '" data-act="mkPick" data-k="' + k + '">' +
        '<b>' + m.name + '</b><span>' + m.desc + '</span>' +
        '<em>' + m.n + ' 题 · ' + Math.round(m.secs / 60) + ' 分钟</em></button>';
    }).join('');

    return '<div class="tool-line"><h2>模拟考试</h2>' +
        '<span class="sub">按考试节奏完整做一套，交卷即出分与逐题解析</span>' +
        '<div class="spacer"></div>' +
        '<span class="tag">题库 ' + bank + ' 题</span></div>' +

      '<div class="mk-grid">' +
        '<div class="card">' +
          '<div class="card-h"><h2>选一套卷子</h2><span class="hint">交卷前不显示答案</span></div>' +
          '<div class="mk-modes">' + modeCards + '</div>' +
          (mk.mode === 'one'
            ? '<div class="mk-one"><div class="small muted" style="margin:2px 0 8px">选择模块</div>' +
              '<div class="seg wrap">' + modBtns + '</div></div>'
            : '') +
          '<div class="mk-start"><button class="btn" data-act="mkStart">开始考试</button>' +
          '<span class="small muted">倒计时 ' + Math.round(mode.secs / 60) + ' 分钟，到点自动交卷</span></div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-h"><h2>历史成绩</h2><span class="hint">最多 10 次</span></div>' +
          (hist.length
            ? '<div class="mk-hist">' + hist.map(function (h) {
              var cls = h.score >= 75 ? 'hi' : h.score >= 55 ? 'mid' : 'lo';
              var d = new Date(h.t);
              return '<div class="mk-hrow"><div class="sc ' + cls + '">' + h.score + '</div>' +
                '<div class="txt"><b>' + esc(h.name) + '</b> · ' + h.correct + '/' + h.total + ' 题 · 用时 ' +
                Math.round(h.used / 60) + ' 分钟<br><span class="muted">' +
                (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) +
                '</span></div></div>';
            }).join('') + '</div>'
            : '<div class="empty">还没有模拟成绩。做一套，成绩会留在这里。</div>') +
        '</div>' +
      '</div>' +

      '<div class="card"><div class="card-h"><h2>题库构成</h2><span class="hint">按模块随机抽题</span></div>' +
        D_modules().map(function (m) {
          var w = Math.max(2, Math.round(counts[m] / Math.max(1, bank) * 100));
          return '<div class="progrow"><span class="nm">' + esc(m) + '</span>' +
            '<span class="tr"><i style="width:' + w + '%"></i></span>' +
            '<span class="pc">' + counts[m] + ' 题</span></div>';
        }).join('') +
      '</div>';
  }

  function viewRun() {
    var q = mk.qs[mk.idx];
    if (!q) return viewDone();
    var mode = MODES[mk.mode];
    var done = Object.keys(mk.picks).length;
    var pickIdx = mk.picks[q.id];

    var opts = q.opts.map(function (o, i) {
      return '<button class="opt2' + (pickIdx === i ? ' pick' : '') + '" data-act="mkPickOpt" data-i="' + i + '">' +
        '<span class="k">' + 'ABCD'[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('');

    var sheet = mk.qs.map(function (x, i) {
      var cls = mk.picks[x.id] !== undefined ? 'done' : '';
      if (i === mk.idx) cls += ' cur';
      return '<button class="mk-no ' + cls + '" data-act="mkGo" data-i="' + i + '">' + (i + 1) + '</button>';
    }).join('');

    return '<div class="mk-run">' +
      '<div class="card mk-qcard">' +
        '<div class="mk-top"><span class="tag blue">' + esc(q.mod) + '</span>' +
          '<span class="tag">' + esc(q.tag || '') + '</span>' +
          '<div class="spacer"></div>' +
          '<span class="mk-counter">' + (mk.idx + 1) + ' / ' + mk.qs.length + '</span>' +
          '<span class="mk-timer' + (mk.left <= 300 ? ' warn' : '') + '" id="mkTimer">' + fmt(mk.left) + '</span>' +
        '</div>' +
        (q.mat ? '<div class="matbox">' + esc(q.mat) + '</div>' : '') +
        '<p class="qstem">' + esc(q.stem) + '</p>' +
        '<div class="opts2">' + opts + '</div>' +
        '<div class="qbar">' +
          '<button class="btn ghost sm" data-act="mkPrev"' + (mk.idx === 0 ? ' disabled' : '') + '>上一题</button>' +
          '<button class="btn sm" data-act="mkNext">' + (mk.idx === mk.qs.length - 1 ? '最后一题' : '下一题') + '</button>' +
          '<div class="spacer"></div>' +
          '<span class="small muted">已答 ' + done + ' / ' + mk.qs.length + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="card mk-sheet">' +
        '<div class="card-h"><h2>答题卡</h2><span class="hint">' + mode.name + '</span></div>' +
        '<div class="mk-nos">' + sheet + '</div>' +
        '<div class="divider"></div>' +
        '<button class="btn ghost sm" data-act="mkSubmit" style="width:100%">交卷</button>' +
        '<div class="small muted" style="margin-top:8px;line-height:1.7">交卷后立即出分，并给出每题解析。</div>' +
      '</div>' +
    '</div>';
  }

  function viewDone() {
    var r = mk.res;
    if (!r) return viewIdle();
    var cls = r.score >= 75 ? 'hi' : r.score >= 55 ? 'mid' : 'lo';
    var modRows = r.mods.map(function (m) {
      return '<div class="progrow"><span class="nm">' + esc(m.mod) + '</span>' +
        '<span class="tr"><i style="width:' + m.rate + '%"></i></span>' +
        '<span class="pc">' + m.correct + '/' + m.total + '</span></div>';
    }).join('');

    var wrongRows = r.items.filter(function (it) { return !it.ok; }).map(function (it) {
      return '<div class="mk-wrong"><div class="qh"><span class="tag">' + esc(it.q.mod) + '</span>' +
        '<span class="muted small">第 ' + (it.i + 1) + ' 题</span></div>' +
        '<p class="stmt">' + esc(it.q.stem) + '</p>' +
        '<div class="ansline"><span class="bad">你选 ' + (it.pick >= 0 ? 'ABCD'[it.pick] : '未答') + '</span>' +
        '<span class="good">正确 ' + 'ABCD'[it.q.ans] + '</span></div>' +
        '<div class="exp"><b>解析</b>' + esc(it.q.exp) + '</div></div>';
    }).join('');

    return '<div class="tool-line"><h2>考试成绩</h2>' +
        '<span class="sub">' + esc(r.name) + ' · ' + r.correct + '/' + r.total + ' 题 · 用时 ' + fmt(r.used) + '</span>' +
        '<div class="spacer"></div>' +
        '<button class="btn" data-act="mkRestart">再考一次</button></div>' +

      '<div class="mk-result">' +
        '<div class="card mk-score"><div class="sc ' + cls + '">' + r.score + '</div>' +
          '<div class="small muted">百分制</div>' +
          '<div class="divider"></div>' +
          '<div class="kv"><span>正确</span><b>' + r.correct + ' 题</b></div>' +
          '<div class="kv"><span>错误</span><b>' + (r.total - r.correct) + ' 题</b></div>' +
          '<div class="kv"><span>用时</span><b>' + fmt(r.used) + '</b></div>' +
        '</div>' +
        '<div class="card"><div class="card-h"><h2>分模块</h2><span class="hint">正确率</span></div>' + modRows + '</div>' +
      '</div>' +

      '<div class="card"><div class="card-h"><h2>错题解析</h2><span class="hint">' +
        (r.total - r.correct) + ' 题' + '</span></div>' +
        (wrongRows || '<div class="empty">全对，没有错题。</div>') +
      '</div>';
  }

  /* ---------------- 交互 ---------------- */

  function start() {
    var qs = build();
    if (!qs.length) { K().toast('题库为空'); return; }
    mk.qs = qs;
    mk.idx = 0;
    mk.picks = {};
    mk.res = null;
    mk.phase = 'run';
    startTimer();
    paint();
  }

  function paint() {
    K().mount(MOCK.render());
  }

  function submit(auto) {
    if (mk.phase !== 'run') return;
    stopTimer();
    var used = Math.round((Date.now() - mk.started) / 1000);
    var items = mk.qs.map(function (q, i) {
      var pick = mk.picks[q.id];
      return { i: i, q: q, pick: pick === undefined ? -1 : pick, ok: pick === q.ans };
    });
    var correct = items.filter(function (x) { return x.ok; }).length;
    var mods = D_modules().map(function (m) {
      var sub = items.filter(function (x) { return x.q.mod === m; });
      if (!sub.length) return null;
      return { mod: m, total: sub.length, correct: sub.filter(function (x) { return x.ok; }).length, rate: Math.round(sub.filter(function (x) { return x.ok; }).length / sub.length * 100) };
    }).filter(Boolean);

    mk.res = {
      name: MODES[mk.mode].name + (mk.mode === 'one' ? ' · ' + mk.mod : ''),
      total: items.length,
      correct: correct,
      score: Math.round(correct / items.length * 100),
      used: used,
      mods: mods,
      items: items
    };
    mk.phase = 'done';

    var S = state();
    S.mock = S.mock || [];
    S.mock.unshift({ t: Date.now(), name: mk.res.name, score: mk.res.score, correct: correct, total: items.length, used: used });
    S.mock = S.mock.slice(0, 10);
    // 错题入错题本
    items.forEach(function (it) {
      if (it.ok) return;
      var w = S.wrong[it.q.id] || { n: 0, kind: '' };
      w.n += 1;
      S.wrong[it.q.id] = w;
    });
    K().save();
    paint();
    if (auto) K().toast('时间到，已自动交卷');
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    if (act.indexOf('mk') !== 0) return;

    if (act === 'mkPick') { mk.mode = t.getAttribute('data-k'); paint(); return; }
    if (act === 'mkMode') { mk.mod = t.getAttribute('data-m'); paint(); return; }
    if (act === 'mkStart') { start(); return; }
    if (act === 'mkPickOpt') {
      var q = mk.qs[mk.idx];
      mk.picks[q.id] = +t.getAttribute('data-i');
      if (mk.idx < mk.qs.length - 1) mk.idx++;
      paint();
      return;
    }
    if (act === 'mkNext') { if (mk.idx < mk.qs.length - 1) mk.idx++; paint(); return; }
    if (act === 'mkPrev') { if (mk.idx > 0) mk.idx--; paint(); return; }
    if (act === 'mkGo') { mk.idx = +t.getAttribute('data-i'); paint(); return; }
    if (act === 'mkSubmit') {
      var done = Object.keys(mk.picks).length;
      var rest = mk.qs.length - done;
      if (rest > 0 && !confirm('还有 ' + rest + ' 题没答，确定交卷？')) return;
      submit(false);
      return;
    }
    if (act === 'mkRestart') { mk.phase = 'idle'; mk.res = null; paint(); return; }
  });

  return {
    render: function () { return render(); },
    kill: function () { stopTimer(); },
    get phase() { return mk.phase; }
  };
})();
