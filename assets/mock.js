/* 考公学习系统 · 模拟考试 / 真题卷
 * 依赖 system.js 暴露的 window.KG（esc / save / S / mount / toast）
 * 结构：mk = { phase, tab, mode, mod, paper, qs, idx, picks, left, t, started, res }
 */
window.MOCK = (function () {
  'use strict';

  function K() { return window.KG; }
  function esc(s) { return K().esc(s); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(s) { s = Math.max(0, s | 0); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }

  var MODES = {
    full: { name: '行测全卷', n: 130, secs: 120 * 60, desc: '按国考地市级卷面配比：常识 20 · 言语 40 · 数量 10 · 判断 40 · 资料 20' },
    quick: { name: '快速模拟', n: 40, secs: 40 * 60, desc: '40 题，40 分钟，适合每天一次' },
    one: { name: '单模块', n: 20, secs: 25 * 60, desc: '专练一个模块，20 题，25 分钟' }
  };
  var FULL_RATIO = { '常识判断': 20, '言语理解': 40, '数量关系': 10, '判断推理': 40, '资料分析': 20 };

  /* 真题卷：题量与模块配比照对应年份/类别的真实卷面；
     题干由题库按固定种子组卷（同一套每次抽到的是同一批题）。 */
  var PAPERS = [
    {
      id: 'gk2025f', year: 2025, name: '2025 国考 · 副省级', kind: '国考副省级', mins: 120, seed: 20250101,
      ratio: { '常识判断': 20, '言语理解': 40, '数量关系': 15, '判断推理': 40, '资料分析': 20 }
    },
    {
      id: 'gk2025d', year: 2025, name: '2025 国考 · 地市级', kind: '国考地市级', mins: 120, seed: 20250102,
      ratio: { '常识判断': 20, '言语理解': 40, '数量关系': 10, '判断推理': 40, '资料分析': 20 }
    },
    {
      id: 'gk2024f', year: 2024, name: '2024 国考 · 副省级', kind: '国考副省级', mins: 120, seed: 20240101,
      ratio: { '常识判断': 20, '言语理解': 40, '数量关系': 15, '判断推理': 40, '资料分析': 20 }
    },
    {
      id: 'gk2024d', year: 2024, name: '2024 国考 · 地市级', kind: '国考地市级', mins: 120, seed: 20240102,
      ratio: { '常识判断': 20, '言语理解': 40, '数量关系': 10, '判断推理': 40, '资料分析': 20 }
    },
    {
      id: 'lk2024a', year: 2024, name: '2024 联考 · A 卷', kind: '多省联考', mins: 120, seed: 20240201,
      ratio: { '常识判断': 20, '言语理解': 35, '数量关系': 10, '判断推理': 35, '资料分析': 20 }
    },
    {
      id: 'js2024a', year: 2024, name: '2024 江苏省考 · A 类', kind: '省考', mins: 120, seed: 20240301,
      ratio: { '常识判断': 20, '言语理解': 35, '数量关系': 20, '判断推理': 40, '资料分析': 20 }
    },
    {
      id: 'zj2024a', year: 2024, name: '2024 浙江省考 · A 卷', kind: '省考', mins: 120, seed: 20240401,
      ratio: { '常识判断': 20, '言语理解': 30, '数量关系': 25, '判断推理': 35, '资料分析': 20 }
    },
    {
      id: 'gd2023x', year: 2023, name: '2023 广东省考 · 县级', kind: '省考', mins: 90, seed: 20230501,
      ratio: { '常识判断': 15, '言语理解': 15, '数量关系': 15, '判断推理': 40, '资料分析': 15 }
    }
  ];

  /* 各模块参考时限（分钟）与估分权重——考试大纲不公布单题分值，这里用机构通行估分口径，
     交卷时按「加权得分 / 加权满分 × 100」折算成百分制。 */
  var LIMIT = { '常识判断': 15, '言语理解': 35, '数量关系': 15, '判断推理': 35, '资料分析': 20 };
  var WEIGHT = { '常识判断': 0.5, '言语理解': 0.8, '数量关系': 1, '判断推理': 0.8, '资料分析': 1 };
  var CN = ['一', '二', '三', '四', '五', '六', '七', '八'];
  /* 真实卷面顺序：常识 → 言语 → 数量 → 判断 → 资料 */
  var EXAM_ORDER = ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];

  var mk = {
    phase: 'idle',
    tab: 'mock',
    mode: 'quick',
    mod: '言语理解',
    paper: null,
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
    return (window.APP_DATA.questions || []).filter(function (q) {
      return q && q.opts && q.opts.length === 4 && q.ans >= 0 && (!mod || q.mod === mod);
    });
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
  function sample(quotas, seed) {
    var out = [];
    var base = seed || 12345;
    Object.keys(quotas).forEach(function (mod) {
      var need = quotas[mod];
      if (!need) return;
      var arr = shuffle(pool(mod).slice(), base + mod.length * 17);
      if (mod === '资料分析') {
        var groups = {}, keys = [];
        arr.forEach(function (q) {
          var k = q.mat || ('x' + (q.stem || '').slice(0, 6));
          if (!groups[k]) { groups[k] = []; keys.push(k); }
          groups[k].push(q);
        });
        shuffle(keys, base + 31);
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

  function paperTotal(p) {
    return Object.keys(p.ratio).reduce(function (s, k) { return s + p.ratio[k]; }, 0);
  }

  /* 当前卷子的统一配置：自组卷 or 真题卷 */
  function cfg() {
    if (mk.paper) {
      return {
        name: mk.paper.name,
        secs: (mk.paper.mins || 120) * 60,
        ratio: mk.paper.ratio,
        n: mk.paper.n || paperTotal(mk.paper),
        seed: mk.paper.seed,
        isPaper: true
      };
    }
    var m = MODES[mk.mode];
    return { name: m.name + (mk.mode === 'one' ? ' · ' + mk.mod : ''), secs: m.secs, n: m.n, isPaper: false };
  }

  function build() {
    var c = cfg();
    var qs;
    if (c.isPaper) {
      qs = sample(c.ratio, c.seed);
      qs.sort(function (a, b) { return EXAM_ORDER.indexOf(a.mod) - EXAM_ORDER.indexOf(b.mod); });
      return qs.slice(0, c.n);
    }
    if (mk.mode === 'one') {
      qs = shuffle(pool(mk.mod).slice(), Date.now()).slice(0, c.n);
      return qs;
    }
    if (mk.mode === 'full') {
      qs = sample(FULL_RATIO, Date.now());
    } else {
      var q2 = {};
      D_modules().forEach(function (m) { q2[m] = Math.round(c.n * (FULL_RATIO[m] / 100)); });
      qs = sample(q2, Date.now());
    }
    qs.sort(function (a, b) { return EXAM_ORDER.indexOf(a.mod) - EXAM_ORDER.indexOf(b.mod); });
    return qs.slice(0, c.n);
  }

  function D_modules() {
    return (window.APP_DATA.modules || ['言语理解', '判断推理', '数量关系', '资料分析', '常识判断']);
  }


  /* 连续题号下，判断第 i 题属于第几部分、该部分起止 */
  function modOrder() {
    var out = [];
    mk.qs.forEach(function (q) { if (out.indexOf(q.mod) < 0) out.push(q.mod); });
    return out;
  }

  function partInfo(i) {
    var q = mk.qs[i];
    if (!q) return null;
    var idxs = [];
    mk.qs.forEach(function (x, k) { if (x.mod === q.mod) idxs.push(k); });
    var order = modOrder();
    return {
      mod: q.mod,
      part: order.indexOf(q.mod),
      start: idxs[0],
      total: idxs.length,
      local: idxs.indexOf(i) + 1,
      limit: LIMIT[q.mod] || 15,
      weight: WEIGHT[q.mod] || 0.8
    };
  }

  /* ---------------- 计时 ---------------- */

  function tick() {
    if (mk.phase !== 'run') return;
    var used = Math.round((Date.now() - mk.started) / 1000);
    mk.left = cfg().secs - used;
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
    mk.left = cfg().secs;
    mk.t = setInterval(tick, 1000);
  }
  function stopTimer() { if (mk.t) { clearInterval(mk.t); mk.t = null; } }

  /* ---------------- 渲染 ---------------- */

  function render() {
    if (mk.phase === 'run') return viewRun();
    if (mk.phase === 'done') return viewDone();
    return viewIdle();
  }

  function histHTML() {
    var hist = state().mock || [];
    if (!hist.length) return '<div class="empty">还没有成绩。做一套，成绩会留在这里。</div>';
    return '<div class="mk-hist">' + hist.map(function (h) {
      var cls = h.score >= 75 ? 'hi' : h.score >= 55 ? 'mid' : 'lo';
      var d = new Date(h.t);
      return '<div class="mk-hrow"><div class="sc ' + cls + '">' + h.score + '</div>' +
        '<div class="txt"><b>' + esc(h.name) + '</b> · ' + h.correct + '/' + h.total + ' 题 · 用时 ' +
        Math.round(h.used / 60) + ' 分钟<br><span class="muted">' +
        (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) +
        '</span></div></div>';
    }).join('') + '</div>';
  }

  function viewIdle() {
    var counts = {};
    D_modules().forEach(function (m) { counts[m] = pool(m).length; });
    var bank = D_modules().reduce(function (s, m) { return s + counts[m]; }, 0);

    var tabs = '<div class="seg mk-tabs">' +
      '<button class="' + (mk.tab === 'mock' ? 'on' : '') + '" data-act="mkTab" data-k="mock">模拟考试</button>' +
      '<button class="' + (mk.tab === 'real' ? 'on' : '') + '" data-act="mkTab" data-k="real">真题卷</button>' +
      '</div>';

    var head = '<div class="tool-line"><h2>' + (mk.tab === 'real' ? '真题测试' : '模拟考试') + '</h2>' +
      '<span class="sub">' + (mk.tab === 'real'
        ? '按历年卷面结构成套计时，交卷出分并逐题解析'
        : '按考试节奏完整做一套，交卷即出分与逐题解析') + '</span>' +
      '<div class="spacer"></div><span class="tag">题库 ' + bank + ' 题</span></div>';

    if (mk.tab === 'real') return head + tabs + viewPapers();

    var mode = MODES[mk.mode];
    var modBtns = EXAM_ORDER.map(function (m) {
      return '<button class="' + (mk.mod === m ? 'on' : '') + '" data-act="mkMode" data-m="' + esc(m) + '">' + esc(m) + '</button>';
    }).join('');

    var modeCards = Object.keys(MODES).map(function (k) {
      var m = MODES[k];
      return '<button class="mk-mode' + (mk.mode === k ? ' on' : '') + '" data-act="mkPick" data-k="' + k + '">' +
        '<b>' + m.name + '</b><span>' + m.desc + '</span>' +
        '<em>' + m.n + ' 题 · ' + Math.round(m.secs / 60) + ' 分钟</em></button>';
    }).join('');

    return head + tabs +
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
          histHTML() +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="card-h"><h2>题库构成</h2><span class="hint">按卷面顺序抽题</span></div>' +
        EXAM_ORDER.map(function (m) {
          var w = Math.max(2, Math.round(counts[m] / Math.max(1, bank) * 100));
          return '<div class="progrow"><span class="nm">' + esc(m) + '</span>' +
            '<span class="tr"><i style="width:' + w + '%"></i></span>' +
            '<span class="pc">' + counts[m] + ' 题</span></div>';
        }).join('') +
      '</div>';
  }

  function viewPapers() {
    var imported = (state().papers || []);

    var rows = PAPERS.map(function (p) {
      var n = paperTotal(p);
      var mix = Object.keys(p.ratio).map(function (k) {
        return k.slice(0, 2) + ' ' + p.ratio[k];
      }).join(' · ');
      return '<div class="mk-paper">' +
        '<div class="mk-paper-info">' +
          '<div class="mk-paper-h"><b>' + esc(p.name) + '</b>' +
            '<span class="tag">' + esc(p.kind) + '</span>' +
            '<span class="tag blue">' + n + ' 题 · ' + p.mins + ' 分钟</span>' +
          '</div>' +
          '<div class="small muted">模块配比：' + mix + '</div>' +
        '</div>' +
        '<div class="mk-paper-b"><button class="btn sm" data-act="mkPaper" data-id="' + p.id + '">开始这套</button></div>' +
      '</div>';
    }).join('');

    var mine = imported.map(function (p, i) {
      return '<div class="mk-paper">' +
        '<div class="mk-paper-info">' +
          '<div class="mk-paper-h"><b>' + esc(p.name) + '</b>' +
            '<span class="tag">导入</span>' +
            '<span class="tag blue">' + p.qs.length + ' 题 · ' + (p.mins || 120) + ' 分钟</span>' +
          '</div>' +
        '</div>' +
        '<div class="mk-paper-b"><button class="btn sm" data-act="mkPaper" data-id="imp' + i + '">开始这套</button>' +
        '<button class="btn ghost sm" data-act="mkDel" data-id="imp' + i + '">删除</button></div>' +
      '</div>';
    }).join('');

    return '<div class="card">' +
        '<div class="card-h"><h2>内置真题卷</h2><span class="hint">题量与模块配比照真实卷面</span></div>' +
        rows +
        '<div class="mk-note">' +
          '真题原文受版权限制不能直接内置，这里按各年份卷面的题量与模块配比，从题库按固定种子组卷——同一套每次抽到的题一样，可以反复做、横向比分数。' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-h"><h2>导入真题</h2><span class="hint">粘贴题目就变成一套卷子</span></div>' +
        (mine ? mine : '<div class="empty">还没有导入的真题卷。</div>') +
        '<div class="divider"></div>' +
        '<div class="small muted" style="margin-bottom:8px">支持 JSON：<code>[{"stem":"题干","opts":["A","B","C","D"],"ans":0,"exp":"解析","mod":"常识判断"}]</code>，也可以是 <code>{"name":"2023 国考","mins":120,"questions":[...]}</code>。</div>' +
        '<textarea class="ta mk-import" id="mkImport" placeholder="把真题 JSON 粘到这里"></textarea>' +
        '<div class="qbar"><button class="btn sm" data-act="mkImport">导入这套</button>' +
        '<span class="small muted">题目只存在本机浏览器</span></div>' +
      '</div>';
  }

  function viewRun() {
    var q = mk.qs[mk.idx];
    if (!q) return viewDone();
    var c = cfg();
    var done = Object.keys(mk.picks).length;
    var pickIdx = mk.picks[q.id];
    var pi = partInfo(mk.idx);

    var opts = q.opts.map(function (o, i) {
      return '<button class="opt2' + (pickIdx === i ? ' pick' : '') + '" data-act="mkPickOpt" data-i="' + i + '">' +
        '<span class="k">' + 'ABCD'[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('');

    /* 答题卡按部分分组，题号连续 */
    var order = modOrder();
    var sheet = order.map(function (mod, gi) {
      var idxs = [];
      mk.qs.forEach(function (x, k) { if (x.mod === mod) idxs.push(k); });
      var cells = idxs.map(function (k) {
        var cls = mk.picks[mk.qs[k].id] !== undefined ? 'done' : '';
        if (k === mk.idx) cls += ' cur';
        return '<button class="mk-no ' + cls + '" data-act="mkGo" data-i="' + k + '">' + (k + 1) + '</button>';
      }).join('');
      return '<div class="mk-sgroup"><div class="mk-sgt">' + CN[gi] + '、' + esc(mod) +
        '<span>' + idxs.length + ' 题</span></div><div class="mk-nos">' + cells + '</div></div>';
    }).join('');

    var head = c.isPaper
      ? '<div class="mk-paperhead">' +
          '<div class="mk-ph-t">' + esc(c.name) + '</div>' +
          '<div class="mk-ph-s">共 ' + mk.qs.length + ' 题 · 参考时限 ' + Math.round(c.secs / 60) +
            ' 分钟 · 满分 100 分</div>' +
        '</div>'
      : '';

    var partBar = '<div class="mk-part">' +
      '<b>第' + CN[pi.part] + '部分　' + esc(pi.mod) + '</b>' +
      '<span>共 ' + pi.total + ' 题 ｜ 参考时限 ' + pi.limit + ' 分钟</span>' +
      '<em>' + pi.local + ' / ' + pi.total + '</em>' +
      '</div>';

    return '<div class="mk-run">' +
      '<div class="card mk-qcard">' +
        head +
        partBar +
        '<div class="mk-top">' +
          '<span class="tag">' + esc(q.tag || '') + '</span>' +
          '<div class="spacer"></div>' +
          '<span class="mk-timer' + (mk.left <= 300 ? ' warn' : '') + '" id="mkTimer">' + fmt(mk.left) + '</span>' +
        '</div>' +
        (q.mat ? '<div class="matbox">' + esc(q.mat) + '</div>' : '') +
        '<p class="qstem"><b class="qno">' + (mk.idx + 1) + '．</b>' + esc(q.stem) + '</p>' +
        '<div class="opts2">' + opts + '</div>' +
        '<div class="qbar">' +
          '<button class="btn ghost sm" data-act="mkPrev"' + (mk.idx === 0 ? ' disabled' : '') + '>上一题</button>' +
          '<button class="btn sm" data-act="mkNext">' + (mk.idx === mk.qs.length - 1 ? '最后一题' : '下一题') + '</button>' +
          '<div class="spacer"></div>' +
          '<span class="small muted">已答 ' + done + ' / ' + mk.qs.length + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="card mk-sheet">' +
        '<div class="card-h"><h2>答题卡</h2><span class="hint">' + esc(c.name) + '</span></div>' +
        sheet +
        '<div class="divider"></div>' +
        '<button class="btn ghost sm" data-act="mkSubmit" style="width:100%">交卷</button>' +
        '<div class="small muted" style="margin-top:8px;line-height:1.7">交卷后按模块折算百分制，并给出每题解析。</div>' +
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
        '<span class="pc">' + m.get + ' / ' + m.full + '</span></div>';
    }).join('');

    var wrongRows = r.items.filter(function (it) { return !it.ok; }).map(function (it) {
      return '<div class="mk-wrong"><div class="qh"><span class="tag">' + esc(it.q.mod) + '</span>' +
        '<span class="muted small">第 ' + (it.i + 1) + ' 题</span></div>' +
        '<p class="stmt">' + esc(it.q.stem) + '</p>' +
        '<div class="ansline"><span class="bad">你选 ' + (it.pick >= 0 ? 'ABCD'[it.pick] : '未答') + '</span>' +
        '<span class="good">正确 ' + 'ABCD'[it.q.ans] + '</span></div>' +
        '<div class="exp"><b>解析</b>' + esc(it.q.exp || '暂无解析') + '</div></div>';
    }).join('');

    return '<div class="tool-line"><h2>考试成绩</h2>' +
        '<span class="sub">' + esc(r.name) + ' · ' + r.correct + '/' + r.total + ' 题 · 用时 ' + fmt(r.used) + '</span>' +
        '<div class="spacer"></div>' +
        '<button class="btn" data-act="mkRestart">再考一次</button></div>' +

      '<div class="mk-result">' +
        '<div class="card mk-score"><div class="sc ' + cls + '">' + r.score + '</div>' +
          '<div class="small muted">折算百分制</div>' +
          '<div class="divider"></div>' +
          '<div class="kv"><span>正确</span><b>' + r.correct + ' 题</b></div>' +
          '<div class="kv"><span>错误</span><b>' + (r.total - r.correct) + ' 题</b></div>' +
          '<div class="kv"><span>正确率</span><b>' + r.rate + '%</b></div>' +
          '<div class="kv"><span>用时</span><b>' + fmt(r.used) + '</b></div>' +
        '</div>' +
        '<div class="card"><div class="card-h"><h2>分部分得分</h2><span class="hint">按估分权重折算</span></div>' +
          modRows +
          '<div class="small muted" style="margin-top:10px;line-height:1.7">' +
            '考试大纲不公布单题分值，这里按常识 0.5、言语 0.8、数量 1、判断 0.8、资料 1 的通行估分口径加权，再折算成百分制。' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card"><div class="card-h"><h2>错题解析</h2><span class="hint">' +
        (r.total - r.correct) + ' 题' + '</span></div>' +
        (wrongRows || '<div class="empty">全对，没有错题。</div>') +
      '</div>';
  }

  /* ---------------- 交互 ---------------- */

  function findPaper(id) {
    for (var i = 0; i < PAPERS.length; i++) if (PAPERS[i].id === id) return PAPERS[i];
    if (id.indexOf('imp') === 0) {
      var p = (state().papers || [])[+id.slice(3)];
      if (p) return { id: id, name: p.name, kind: '导入', mins: p.mins || 120, n: p.qs.length, custom: p.qs };
    }
    return null;
  }

  function start(paper) {
    mk.paper = paper || null;
    var qs;
    if (paper && paper.custom) {
      qs = paper.custom.filter(function (q) { return q && q.opts && q.opts.length && q.ans >= 0; });
    } else {
      qs = build();
    }
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

    var rawGet = 0, rawMax = 0;
    var mods = EXAM_ORDER.map(function (m) {
      var sub = items.filter(function (x) { return x.q.mod === m; });
      if (!sub.length) return null;
      var right = sub.filter(function (x) { return x.ok; }).length;
      var w = WEIGHT[m] || 0.8;
      rawGet += right * w;
      rawMax += sub.length * w;
      return {
        mod: m, total: sub.length, correct: right,
        rate: Math.round(right / sub.length * 100),
        get: Math.round(right * w * 10) / 10,
        full: Math.round(sub.length * w * 10) / 10
      };
    }).filter(Boolean);

    var score = rawMax ? Math.round(rawGet / rawMax * 1000) / 10 : 0;

    mk.res = {
      name: cfg().name,
      total: items.length,
      correct: correct,
      score: score,
      rate: Math.round(correct / items.length * 100),
      used: used,
      mods: mods,
      items: items
    };
    mk.phase = 'done';

    var S = state();
    S.mock = S.mock || [];
    S.mock.unshift({ t: Date.now(), name: mk.res.name, score: score, correct: correct, total: items.length, used: used });
    S.mock = S.mock.slice(0, 10);
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

  /* 导入：接受数组或 {name, mins, questions} */
  function doImport() {
    var ta = document.getElementById('mkImport');
    if (!ta) return;
    var raw = (ta.value || '').trim();
    if (!raw) { K().toast('先把题目粘进来'); return; }
    var data;
    try { data = JSON.parse(raw); } catch (e) { K().toast('JSON 解析失败：' + e.message.slice(0, 40)); return; }

    var name = '导入的真题卷';
    var mins = 120;
    var list = data;
    if (!Array.isArray(data)) {
      name = data.name || name;
      mins = data.mins || mins;
      list = data.questions || data.qs || [];
    }
    if (!Array.isArray(list) || !list.length) { K().toast('没找到题目数组'); return; }

    var ok = 0;
    var qs = list.map(function (q, i) {
      if (!q || !q.stem || !Array.isArray(q.opts) || q.opts.length < 2) return null;
      var ans = typeof q.ans === 'number' ? q.ans : ('ABCD'.indexOf(String(q.ans || '').toUpperCase()));
      if (ans < 0 || ans >= q.opts.length) return null;
      ok++;
      return {
        id: 'imp' + Date.now() + '_' + i,
        mod: q.mod || '常识判断',
        tag: q.tag || '导入',
        stem: String(q.stem),
        opts: q.opts.slice(0, 4).map(String),
        ans: ans,
        exp: q.exp || q.explain || '（这道题没有附解析）',
        mat: q.mat || ''
      };
    }).filter(Boolean);

    if (!ok) { K().toast('没有一条能解析成题目，检查 stem/opts/ans 三个字段'); return; }

    var S = state();
    S.papers = S.papers || [];
    S.papers.unshift({ name: name, mins: mins, qs: qs, t: Date.now() });
    S.papers = S.papers.slice(0, 3);
    K().save();
    ta.value = '';
    K().toast('已导入 ' + ok + ' 题，共 ' + qs.length + ' 题可用');
    paint();
  }

  function delPaper(id) {
    var S = state();
    var i = +id.slice(3);
    if (!S.papers || !S.papers[i]) return;
    S.papers.splice(i, 1);
    K().save();
    paint();
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    if (act.indexOf('mk') !== 0) return;

    if (act === 'mkTab') { mk.tab = t.getAttribute('data-k'); paint(); return; }
    if (act === 'mkPick') { mk.mode = t.getAttribute('data-k'); paint(); return; }
    if (act === 'mkMode') { mk.mod = t.getAttribute('data-m'); paint(); return; }
    if (act === 'mkStart') { start(null); return; }
    if (act === 'mkPaper') { start(findPaper(t.getAttribute('data-id'))); return; }
    if (act === 'mkDel') { delPaper(t.getAttribute('data-id')); return; }
    if (act === 'mkImport') { doImport(); return; }
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
    if (act === 'mkRestart') { mk.phase = 'idle'; mk.res = null; mk.paper = null; paint(); return; }
  });

  return {
    render: function () { return render(); },
    kill: function () { stopTimer(); },
    get phase() { return mk.phase; }
  };
})();
