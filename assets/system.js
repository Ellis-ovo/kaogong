/* ============================================================
   考公学习系统 · 工作台逻辑
   数据全部留在浏览器 localStorage，不上传。
   ============================================================ */
(function () {
  'use strict';

  var D = window.APP_DATA || { questions: [], news: [], essays: [], interview: [], tasks: [], modules: [] };
  var KEY = 'kg-app-v1';
  var EXAM_DATE = '2027-04-28';

  /* ---------------- 1. 状态 ---------------- */
  var DEFAULTS = { answers: {}, wrong: {}, essays: {}, saved: [], iv: [], tasks: {}, days: {}, ivf: {} };

  var S = (function () {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') raw = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      if (!raw[k] || typeof raw[k] !== 'object' && typeof raw[k] !== 'string') raw[k] = DEFAULTS[k];
      else if (Array.isArray(DEFAULTS[k]) && !Array.isArray(raw[k])) raw[k] = DEFAULTS[k];
    });
    return raw;
  })();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  /* ---------------- 2. 小工具 ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function daysUntil(str) {
    var t = new Date(str + 'T00:00:00');
    var n = new Date();
    var a = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((t - a) / 86400000);
  }
  function addMinutes(min) {
    var k = dayKey();
    S.days[k] = (S.days[k] || 0) + min;
  }
  function streak() {
    var n = 0, d = new Date();
    while (true) {
      if (S.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
      else break;
      if (n > 999) break;
    }
    return n || (Object.keys(S.days).length ? 1 : 1);
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }
  function todayTasks() {
    var k = dayKey();
    if (!S.tasks[k]) S.tasks[k] = {};
    return S.tasks[k];
  }
  function doneCount() {
    var t = todayTasks(), n = 0;
    D.tasks.forEach(function (x) { if (t[x.id]) n++; });
    return n;
  }

  /* ---------------- 3. 路由 ---------------- */
  var ROUTES = {
    today: { t: '今日', s: '今天该做什么，一次讲清', render: renderToday },
    xingce: { t: '行测刷题', s: '答完即判分，错题自动归因', render: renderXingce },
    shenlun: { t: '申论批改', s: '按采分点逐条对照，不是笼统给分', render: renderShenlun },
    shizheng: { t: '时政素材', s: '只留能写进文章的东西', render: renderShizheng },
    mianshi: { t: '面试陪练', s: '抽题、计时、复盘，一条龙', render: renderMianshi },
    stats: { t: '数据看板', s: '看清弱项，才知道下一步练什么', render: renderStats }
  };
  var CURRENT = 'today';

  function go(view) {
    if (!ROUTES[view]) view = 'today';
    CURRENT = view;
    ROUTES[view].render();
    document.getElementById('pageTitle').textContent = ROUTES[view].t;
    document.getElementById('pageSub').textContent = ROUTES[view].s;
    document.querySelectorAll('.nav-link').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('data-view') === view);
    });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function mount(html) {
    document.getElementById('view').innerHTML = html;
    refreshSide();
  }

  function refreshSide() {
    var n = doneCount(), total = D.tasks.length || 5;
    var p = total ? Math.round(n / total * 100) : 0;
    var sd = document.getElementById('sideDone');
    var sb = document.getElementById('sideBar');
    if (sd) sd.textContent = n + '/' + total;
    if (sb) sb.style.width = p + '%';
    var ss = document.getElementById('sideStreak');
    if (ss) ss.textContent = '第 ' + streak() + ' 天';
    var cp = document.getElementById('clockPill');
    if (cp) cp.innerHTML = '距考试 <b>' + Math.max(0, daysUntil(EXAM_DATE)) + '</b> 天';
  }

  /* ============================================================
     今日
     ============================================================ */
  function renderToday() {
    var n = doneCount(), total = D.tasks.length || 5;
    var p = total ? Math.round(n / total * 100) : 0;
    var t = todayTasks();
    var mins = 0, plan = 0;
    D.tasks.forEach(function (x) { plan += x.min; if (t[x.id]) mins += x.min; });

    var weak = weakModule();

    var html = '' +
      '<div class="hero-grid">' +
        '<div class="card">' +
          '<div class="ring-card">' +
            '<div class="ring" style="--p:' + p + '"><b>' + p + '<span>%</span></b></div>' +
            '<div class="meta">' +
              '<h3>' + (p === 100 ? '今天收工了' : '今天还有 ' + (total - n) + ' 项') + '</h3>' +
              '<p>' + (p === 100
                  ? '全部完成，共投入 ' + mins + ' 分钟。今天可以收工了。'
                  : p === 0
                    ? total + ' 项待办，约 ' + plan + ' 分钟的量。先挑一项开始。'
                    : '已完成 ' + n + ' 项，累计 ' + mins + ' 分钟，还剩 ' + (total - n) + ' 项。') + '</p>' +
              '<p style="margin-top:6px">' + (p === 100 ? '连着的天数比单天时长更重要，明天见。' : p === 0 ? '从最短的时政开始，动起来比规划更重要。' : '保持节奏，比一次性猛学更管用。') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="divider"></div>' +
          '<div class="tasklist" id="taskList">' + D.tasks.map(function (x) {
            var done = !!t[x.id];
            return '<div class="taskitem' + (done ? ' done' : '') + '" data-act="task" data-id="' + x.id + '">' +
              '<div class="box"></div>' +
              '<div class="t">' + esc(x.text) + '<small>' + x.min + ' 分钟</small></div>' +
              '<span class="go">去练习 ›</span>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-h"><h2>今日建议</h2></div>' +
          '<p style="margin:0 0 10px; font-size:13px; color:var(--ink-2); line-height:1.7">' +
            (weak ? '最近 <b>' + esc(weak.mod) + '</b> 的正确率是 ' + weak.rate + '%，今天优先补这一块。' : '还没有作答记录，先做 10 道题，系统就能给出弱项判断。') +
          '</p>' +
          '<div class="divider" style="margin:12px 0"></div>' +
          '<div style="font-size:12.5px; color:var(--ink-3); line-height:1.8">' +
            '· 行测：先限时，再对答案，错题当场归因<br>' +
            '· 申论：先写，再看采分点，最后抄一遍范文<br>' +
            '· 面试：开口说，计时比逐字稿更重要' +
          '</div>' +
          '<div class="divider" style="margin:12px 0"></div>' +
          '<div class="small muted" style="margin-bottom:6px">最近练习</div>' +
          recentHTML() +
          '<div class="divider" style="margin:12px 0"></div>' +
          '<button class="btn" data-act="go" data-to="xingce">' + (weak ? '去补 ' + esc(weak.mod) : '开始练习') + '</button>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-h"><h2>常用入口</h2><span class="hint">跳到最常练的四个模块</span></div>' +
        '<div class="quick">' +
          '<a href="#xingce"><b>行测刷题</b><span>' + D.questions.length + ' 道题 · 答完即判分</span></a>' +
          '<a href="#shenlun"><b>申论批改</b><span>' + D.essays.length + ' 套题 · 采分点对照</span></a>' +
          '<a href="#shizheng"><b>时政素材</b><span>' + D.news.length + ' 条 · 可搜索收藏</span></a>' +
          '<a href="#mianshi"><b>面试陪练</b><span>' + D.interview.length + ' 题 · 计时作答</span></a>' +
        '</div>' +
      '</div>';

    mount(html);
  }

  function recentHTML() {
    var ids = Object.keys(S.answers).sort(function (a, b) { return (S.answers[b].t || 0) - (S.answers[a].t || 0); }).slice(0, 3);
    if (!ids.length) return '<div class="small" style="color:var(--ink-3)">还没有记录。</div>';
    return ids.map(function (id) {
      var q = D.questions.filter(function (x) { return x.id === id; })[0];
      if (!q) return '';
      var a = S.answers[id];
      return '<div class="row" style="padding:4px 0;font-size:12.5px">' +
        '<span style="color:' + (a.ok ? 'var(--green)' : 'var(--red)') + '">' + (a.ok ? '✓' : '✕') + '</span>' +
        '<span style="color:var(--ink-2)">' + esc(q.mod) + ' · ' + esc(q.tag) + '</span>' +
        '<span class="spacer"></span></div>';
    }).join('');
  }

  function weakModule() {
    var stat = {};
    D.questions.forEach(function (q) {
      var a = S.answers[q.id];
      if (!a) return;
      stat[q.mod] = stat[q.mod] || { ok: 0, n: 0 };
      stat[q.mod].n++;
      if (a.ok) stat[q.mod].ok++;
    });
    var worst = null;
    Object.keys(stat).forEach(function (m) {
      if (stat[m].n < 2) return;
      var rate = Math.round(stat[m].ok / stat[m].n * 100);
      if (!worst || rate < worst.rate) worst = { mod: m, rate: rate };
    });
    return worst;
  }

  /* ============================================================
     行测
     ============================================================ */
  var xc = { mod: '全部', i: 0, picked: -1, graded: false, tab: 'practice', attrib: null };

  function xcList() {
    return xc.mod === '全部' ? D.questions : D.questions.filter(function (q) { return q.mod === xc.mod; });
  }

  function renderXingce() {
    var html = '<div class="tool-line">' +
      '<h2>行测刷题</h2>' +
      '<span class="sub">共 ' + D.questions.length + ' 道 · 已做 ' + Object.keys(S.answers).length + ' 道</span>' +
      '<div class="spacer"></div>' +
      '<div class="seg">' +
        '<button class="' + (xc.tab === 'practice' ? 'on' : '') + '" data-act="xctab" data-t="practice">练习</button>' +
        '<button class="' + (xc.tab === 'wrong' ? 'on' : '') + '" data-act="xctab" data-t="wrong">错题本 ' + Object.keys(S.wrong).length + '</button>' +
      '</div>' +
    '</div>';

    var mods = ['全部'].concat(D.modules).map(function (m) {
      return '<button class="mod-chip' + (m === xc.mod ? ' on' : '') + '" data-act="xcmod" data-m="' + esc(m) + '">' + esc(m) + '</button>';
    }).join('');
    html += '<div class="mods" style="margin-bottom:16px">' + mods + '</div>';

    if (xc.tab === 'wrong') { mount(html + wrongBook()); return; }

    var list = xcList();
    if (xc.i >= list.length) xc.i = 0;
    var q = list[xc.i];
    if (!q) { mount(html + '<div class="empty">这个模块暂时没有题目。</div>'); return; }

    var picked = xc.picked;
    var graded = xc.graded;

    var qh = '' +
      '<div class="qhead">' +
        '<span class="tag blue">' + esc(q.mod) + '</span>' +
        '<span class="tag">' + esc(q.tag) + '</span>' +
        '<span class="tag ' + (q.level === 3 ? 'red' : q.level === 2 ? 'amber' : 'green') + '">' +
          (q.level === 3 ? '难度较高' : q.level === 2 ? '中等' : '基础') + '</span>' +
        '<div class="spacer"></div>' +
        '<span class="muted small tabular">' + (xc.i + 1) + ' / ' + list.length + '</span>' +
      '</div>';

    var opts = q.opts.map(function (o, i) {
      var cls = 'opt2';
      if (graded) {
        if (i === q.ans) cls += ' right';
        else if (i === picked) cls += ' wrong';
      } else if (i === picked) cls += ' pick';
      return '<button class="' + cls + '" data-act="pick" data-i="' + i + '"' + (graded ? ' disabled' : '') + '>' +
        '<span class="k">' + 'ABCD'[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('');

    var after = '';
    if (graded) {
      var ok = picked === q.ans;
      after += '<div class="explain"><b>' + (ok ? '答对了。' : '正确答案 ' + 'ABCD'[q.ans] + '。') + '</b>' + esc(q.exp) + '</div>';
      if (!ok) {
        var cur = S.wrong[q.id] || {};
        after += '<div class="attrib"><span class="small muted">这次错在哪：</span>' +
          '<div class="seg">' +
          ['知识盲区', '审题偏差', '计算失误'].map(function (k) {
            return '<button class="' + (cur.kind === k ? 'on' : '') + '" data-act="attrib" data-k="' + k + '">' + k + '</button>';
          }).join('') +
          '</div><span class="small muted">已自动进入错题本</span></div>';
      }
    }

    mount(html +
      '<div class="card">' + qh +
        '<p class="qstem">' + esc(q.stem) + '</p>' +
        '<div class="opts2">' + opts + '</div>' +
        after +
        '<div class="qbar">' +
          '<button class="btn ghost sm" data-act="prev"' + (list.length < 2 ? ' disabled' : '') + '>上一题</button>' +
          '<button class="btn sm" data-act="next">下一题</button>' +
          (graded ? '<button class="btn ghost sm" data-act="resetq">重做本题</button>' : '') +
          '<div class="spacer"></div>' +
          '<span class="small muted">' + (graded ? '已记录到错题本与数据看板' : '选一个选项即判分') + '</span>' +
        '</div>' +
      '</div>' +
      moduleBars());
  }

  function moduleBars() {
    var rows = D.modules.map(function (m) {
      var all = D.questions.filter(function (q) { return q.mod === m; });
      var done = all.filter(function (q) { return S.answers[q.id]; });
      var ok = done.filter(function (q) { return S.answers[q.id].ok; });
      var rate = done.length ? Math.round(ok.length / done.length * 100) : 0;
      return '<div class="progrow"><span class="nm">' + esc(m) + '</span>' +
        '<span class="tr"><i style="width:' + rate + '%"></i></span>' +
        '<span class="pc">' + (done.length ? rate + '% · ' + done.length + ' 题' : '未练习') + '</span></div>';
    }).join('');
    return '<div class="card"><div class="card-h"><h2>模块正确率</h2><span class="hint">只统计已作答的题</span></div>' + rows + '</div>';
  }

  function wrongBook() {
    var ids = Object.keys(S.wrong);
    if (!ids.length) return '<div class="card"><div class="empty">错题本是空的。做完题答错会自动进来，并记录你的错因。</div></div>';
    var rows = ids.map(function (id) {
      var q = D.questions.filter(function (x) { return x.id === id; })[0];
      if (!q) return '';
      var w = S.wrong[id];
      return '<tr>' +
        '<td><span class="tag blue">' + esc(q.mod) + '</span></td>' +
        '<td style="max-width:360px">' + esc(q.stem.slice(0, 46)) + (q.stem.length > 46 ? '…' : '') + '</td>' +
        '<td>' + 'ABCD'[q.ans] + '</td>' +
        '<td>' + (w.kind ? '<span class="tag amber">' + esc(w.kind) + '</span>' : '<span class="muted">未归因</span>') + '</td>' +
        '<td class="num">' + (w.n || 1) + ' 次</td>' +
        '<td><button class="btn ghost sm" data-act="redo" data-id="' + id + '">重做</button></td>' +
      '</tr>';
    }).join('');
    return '<div class="card"><div class="card-h"><h2>错题本</h2><span class="hint">共 ' + ids.length + ' 道</span>' +
      '<div class="spacer"></div><button class="btn ghost sm" data-act="clearWrong">清空</button></div>' +
      '<table class="tbl"><thead><tr><th>模块</th><th>题干</th><th>答案</th><th>错因</th><th>次数</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function pickOption(i) {
    if (xc.graded) return;
    var q = xcList()[xc.i];
    if (!q) return;
    xc.picked = i;
    xc.graded = true;
    var ok = i === q.ans;
    S.answers[q.id] = { pick: i, ok: ok, t: Date.now() };
    if (!ok) {
      var w = S.wrong[q.id] || { n: 0 };
      w.n = (w.n || 0) + 1;
      w.t = Date.now();
      S.wrong[q.id] = w;
    }
    addMinutes(2);
    save();
    renderXingce();
  }

  function resetQuestion() {
    var q = xcList()[xc.i];
    if (q && S.answers[q.id]) { delete S.answers[q.id]; save(); }
    xc.picked = -1;
    xc.graded = false;
    renderXingce();
  }

  /* ============================================================
     申论
     ============================================================ */
  var es = { id: 'e1', result: null, text: '' };

  function curEssay() {
    return D.essays.filter(function (e) { return e.id === es.id; })[0] || D.essays[0];
  }

  function renderShenlun() {
    var e = curEssay();
    var saved = S.essays[e.id];

    var html = '<div class="tool-line">' +
      '<h2>申论批改</h2>' +
      '<span class="sub">先自己写，再看采分点</span>' +
      '<div class="spacer"></div>' +
      '<div class="seg">' + D.essays.map(function (x) {
        return '<button class="' + (x.id === e.id ? 'on' : '') + '" data-act="essaySel" data-id="' + x.id + '">' + esc(x.type) + '</button>';
      }).join('') + '</div>' +
    '</div>' +

    '<div class="essay-grid">' +
      '<div class="card">' +
        '<div class="card-h"><h2>' + esc(e.title) + '</h2><span class="hint">' + e.limit + ' 字以内</span></div>' +
        '<div class="material">' + esc(e.material) + '</div>' +
        '<p class="ask">' + esc(e.ask) + '</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-h"><h2>你的作答</h2>' +
          '<span class="hint">' + (saved ? '上次 ' + saved.score + ' 分' : '未提交过') + '</span>' +
        '</div>' +
        '<textarea id="ansBox" placeholder="按“总—分”结构写，一条一个要点，不要写成散文。">' + esc(es.text) + '</textarea>' +
        '<div class="essay-foot">' +
          '<span class="counter" id="ansCount">0 / ' + e.limit + '</span>' +
          '<div class="spacer"></div>' +
          '<button class="btn ghost sm" data-act="essaySample">看范文</button>' +
          '<button class="btn" data-act="essayGrade">对照采分点批改</button>' +
        '</div>' +
        '<div id="essayResult">' + (es.result ? essayResultHTML(es.result) : '') + '</div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-h"><h2>顺便用一下：口语规范化</h2><span class="hint">把大白话改成能落笔的句子</span></div>' +
      '<textarea id="slIn" placeholder="例：我觉得有些干部就是不下基层，坐在办公室里拍脑袋决策。" style="width:100%;min-height:84px;padding:12px;border-radius:11px;border:1px solid var(--line-2);font-family:var(--serif);font-size:15px;line-height:1.8;outline:none;resize:vertical"></textarea>' +
      '<div class="essay-foot"><span class="small muted">本地规则引擎 · 词库 ' + (window.SL ? window.SL.dictSize : 0) + ' 条</span>' +
        '<div class="spacer"></div><button class="btn sm" data-act="slRun">转成申论句</button></div>' +
      '<div id="slOut" class="sl-out"></div>' +
    '</div>';

    mount(html);

    var box = document.getElementById('ansBox');
    if (box) {
      var sync = function () {
        es.text = box.value;
        var c = box.value.replace(/\s/g, '').length;
        var el = document.getElementById('ansCount');
        el.textContent = c + ' / ' + e.limit;
        el.classList.toggle('over', c > e.limit);
      };
      box.addEventListener('input', sync);
      sync();
    }
  }

  function essayResultHTML(r) {
    var lvl = r.score >= 80 ? '一类文（80+）' : r.score >= 60 ? '二类文（60–79）' : r.score >= 40 ? '三类文（40–59）' : '四类文（40 以下）';
    var hitN = r.hits.filter(function (h) { return h.hit; }).length;
    return '<div class="divider"></div>' +
      '<div class="grade">' +
        '<div><div class="score-big">' + r.score + '<small>/100</small></div><div class="lvl">' + lvl + '</div></div>' +
        '<div class="small muted" style="line-height:1.8">' +
          '采分点命中 <b style="color:var(--ink)">' + hitN + ' / ' + r.hits.length + '</b><br>' +
          '字数 ' + r.chars + ' 字' + (r.chars > r.limit ? '，<span style="color:var(--red)">超出上限</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="point-hit">' + r.hits.map(function (h) {
        return '<div class="ph' + (h.hit ? ' hit' : '') + '">' +
          '<span class="ic">' + (h.hit ? '✓' : '·') + '</span>' +
          '<span><b>' + esc(h.label) + '</b>' + (h.hit ? '' : ' <em>未涉及，可用' + esc(h.k.slice(0, 3).join('、')) + '等词切入</em>') + '</span>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="explain" style="margin-top:12px">' + r.comment + '</div>';
  }

  function gradeEssay() {
    var e = curEssay();
    var text = (es.text || '').replace(/\s/g, '');
    if (text.length < 30) { toast('先写够 30 个字再批改'); return; }

    var total = 0, got = 0;
    var hits = e.points.map(function (p) {
      var hit = p.k.some(function (k) { return text.indexOf(k) >= 0; });
      total += p.w;
      if (hit) got += p.w;
      return { label: p.label, hit: hit, k: p.k, w: p.w };
    });

    var ratio = total ? got / total : 0;
    var lenRate = text.length / e.limit;
    var sPoint = ratio * 72;                                   // 采分点：72 分
    var sLen = lenRate >= 1 ? 6 : lenRate >= 0.8 ? 12 : lenRate >= 0.5 ? 9 : 3;  // 篇幅：12 分
    var sStruct = /一是|二是|首先|其次|第一|其一/.test(text) ? 8 : 2;           // 分条：8 分
    var score = Math.round(sPoint + sLen + sStruct);
    if (lenRate > 1.1) score -= 5;
    score = Math.max(18, Math.min(96, score));

    var pct = Math.round(lenRate * 100);
    var tail;
    if (ratio >= 0.85 && lenRate >= 0.7) {
      tail = '要点齐、篇幅也够，是接近采分点满分的写法。再把每条压缩成“判断句 + 材料依据”，语言分还能提。';
    } else if (ratio >= 0.85) {
      tail = '要点基本齐全，但篇幅只写到上限的 ' + pct + '%。概括题字数不足，往往意味着少写了限定语或漏了并列项，建议每条再补一句材料中的具体表现。';
    } else if (ratio >= 0.6) {
      tail = '主体要点抓到了，还差 ' + (hits.filter(function (h) { return !h.hit; }).length) + ' 条。补的时候不要另起一段堆砌，归并到已有结构里，保持条目数量稳定。';
    } else if (ratio >= 0.35) {
      tail = '只覆盖了部分要点，说明读材料时漏了并列信息。建议先给每则材料写一个关键词，再合并同类项，最后按“一是……二是……”成文。';
    } else {
      tail = '要点偏离较多。先确认题干问的是“问题”“原因”还是“对策”，答案必须与问法一一对应；再回材料找反复出现的高频词。';
    }

    var r = {
      score: score, hits: hits, chars: text.length, limit: e.limit,
      comment: '<b>批改建议：</b>' + tail
    };
    es.result = r;
    S.essays[e.id] = { score: score, chars: text.length, t: Date.now() };
    addMinutes(25);
    save();

    var box = document.getElementById('essayResult');
    if (box) {
      box.innerHTML = essayResultHTML(r);
    }
    refreshSide();
  }

  /* ============================================================
     时政
     ============================================================ */
  var nz = { q: '', cat: '全部' };

  function renderShizheng() {
    var cats = ['全部'];
    D.news.forEach(function (n) { if (cats.indexOf(n.cat) < 0) cats.push(n.cat); });

    var list = D.news.filter(function (n) {
      if (nz.cat !== '全部' && n.cat !== nz.cat) return false;
      if (nz.q && (n.title + n.body + n.angle).indexOf(nz.q) < 0) return false;
      return true;
    });

    var html = '<div class="tool-line"><h2>时政素材</h2>' +
      '<span class="sub">共 ' + D.news.length + ' 条 · 已收藏 ' + S.saved.length + ' 条</span></div>' +
      '<div class="news-tools">' +
        '<input id="newsQ" placeholder="搜索关键词，如：基层、数字、托育" value="' + esc(nz.q) + '">' +
        '<div class="mods">' + cats.map(function (c) {
          return '<button class="mod-chip' + (c === nz.cat ? ' on' : '') + '" data-act="ncat" data-c="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      (list.length ? '<div class="news-grid">' + list.map(function (n) {
        var i = D.news.indexOf(n);
        var on = S.saved.indexOf(i) >= 0;
        return '<div class="nitem">' +
          '<div class="row"><span class="tag">' + esc(n.d) + ' · ' + esc(n.cat) + '</span><div class="spacer"></div>' +
            '<button class="icobtn' + (on ? ' on' : '') + '" data-act="nsave" data-i="' + i + '" title="收藏">' +
            '<svg width="13" height="13" viewBox="0 0 20 20" fill="' + (on ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.6"><path d="M5.5 3h9v14l-4.5-3.4L5.5 17z"/></svg></button>' +
          '</div>' +
          '<h4>' + esc(n.title) + '</h4>' +
          '<p>' + esc(n.body) + '</p>' +
          '<div class="foot"><span class="tag blue">可用角度：' + esc(n.angle) + '</span><div class="spacer"></div>' +
            '<button class="btn ghost sm" data-act="ncopy" data-i="' + i + '">复制论据</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>' : '<div class="card"><div class="empty">没有匹配的素材，换个关键词试试。</div></div>');

    mount(html);
    var inp = document.getElementById('newsQ');
    if (inp) {
      inp.addEventListener('input', function () {
        nz.q = inp.value.trim();
        var pos = inp.selectionStart;
        renderShizheng();
        var again = document.getElementById('newsQ');
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} }
      });
    }
  }

  /* ============================================================
     面试
     ============================================================ */
  var iv = { q: null, phase: 'idle', left: 300, t: null, covered: [] };

  function renderMianshi() {
    var html = '<div class="tool-line"><h2>面试陪练</h2>' +
      '<span class="sub">抽题 → 思考 1 分钟 → 作答 4 分钟</span>' +
      '<div class="spacer"></div>' +
      '<button class="btn ghost sm" data-act="ivDraw">随机抽题</button></div>' +
      '<div class="iv-stage">' +
        '<div class="card" id="ivMain">' + ivCardHTML() + '</div>' +
        '<div class="card timerbox">' +
          '<div class="lbl">作答倒计时</div>' +
          '<div class="timer" id="ivTimer">' + fmt(iv.left) + '</div>' +
          '<div class="small muted" id="ivPhase">' + phaseText() + '</div>' +
          '<div class="divider" style="margin:14px 0"></div>' +
          (iv.phase === 'scored'
            ? '<button class="btn sm" data-act="ivDraw" style="width:100%">换一题</button>'
            : '<button class="btn sm" id="ivBtn" data-act="ivToggle" style="width:100%">' + (iv.phase === 'run' ? '结束作答' : '开始作答') + '</button>') +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="card-h"><h2>练习记录</h2><span class="hint">最近 6 次</span></div>' +
        (S.iv.length ? '<div class="iv-log">' + S.iv.slice(0, 6).map(function (r) {
          var cls = r.score >= 80 ? 'hi' : r.score >= 60 ? 'mid' : 'lo';
          var d = new Date(r.t);
          return '<div class="iv-row"><div class="sc ' + cls + '">' + r.score + '</div>' +
            '<div class="txt"><b style="color:var(--ink)">' + esc(r.type) + '</b> · 用时 ' + r.used + ' 秒 · ' +
            (d.getMonth() + 1) + '/' + d.getDate() + '<br>' + esc(r.q) + '</div></div>';
        }).join('') + '</div>' : '<div class="empty">还没有练习记录。抽一道题，开口说三分钟就有记录。</div>') +
      '</div>';

    mount(html);
  }

  function phaseText() {
    return iv.phase === 'run' ? '正在作答，注意结构' : iv.phase === 'scored' ? '已评分，可抽取下一题' : '抽题后可开始计时';
  }
  function fmt(s) {
    var m = Math.floor(s / 60);
    return pad(m) + ':' + pad(s % 60);
  }

  function ivCardHTML() {
    if (!iv.q) {
      return '<div class="empty" style="padding:60px 10px">还没抽题。<br><br>' +
        '<button class="btn" data-act="ivDraw">随机抽一道</button></div>';
    }
    var q = iv.q;
    var points = q.points.map(function (p, i) {
      var on = iv.covered.indexOf(i) >= 0;
      return '<span class="' + (on ? 'tag green' : '') + '" data-act="ivPoint" data-i="' + i + '" ' +
        'style="cursor:pointer;' + (on ? '' : 'background:#f1f2f5;color:var(--ink-2)') + '">' + (on ? '✓ ' : '') + esc(p) + '</span>';
    }).join('');

    return '<div class="qhead"><span class="tag blue">' + esc(q.type) + '</span>' +
        '<div class="spacer"></div><span class="muted small">已说到 ' + iv.covered.length + ' / ' + q.points.length + ' 个要点</span></div>' +
      '<p class="iv-q">' + esc(q.q) + '</p>' +
      (iv.phase === 'scored' ?
        '<div class="divider"></div>' +
        '<div class="grade"><div><div class="score-big">' + iv.score + '<small>/100</small></div>' +
        '<div class="lvl">要点覆盖 ' + iv.covered.length + ' / ' + q.points.length + ' · 用时 ' + iv.used + ' 秒</div></div>' +
        '<div class="small muted" style="line-height:1.8">' +
          (iv.score >= 80 ? '结构完整，考场可直接用。' : iv.score >= 60 ? '主干有了，结尾缺“落实/长效”一层。' : '要点覆盖偏少，先练“表态—分析—对策”三段。') +
        '</div></div>' +
        '<div class="explain"><b>追问：</b>' + esc(q.follow) + '<br><span class="small muted">参考作答要点：' + q.points.map(function (p) { return esc(p); }).join(' / ') + '</span></div>' +
        '<div class="qbar"><button class="btn sm" data-act="ivSave">保存本次评分</button>' +
        '<button class="btn ghost sm" data-act="ivDraw">换一题</button></div>'
        :
        '<div class="divider"></div>' +
        '<div class="small muted" style="margin-bottom:8px">作答后，点选你说到的要点（自评，比逐字打分更接近真实考场）：</div>' +
        '<div class="iv-points">' + points + '</div>' +
        '<div class="qbar"><button class="btn" data-act="ivGrade">结束并看评分</button>' +
        '<span class="small muted">按要点覆盖比例计分</span></div>');
  }

  function ivToggle() {
    if (!iv.q) { toast('先抽一道题'); return; }
    if (iv.phase === 'run') {
      clearInterval(iv.t);
      iv.t = null;
      iv.phase = 'review';
      renderMianshi();
      return;
    }
    iv.phase = 'run';
    iv.left = 300;
    renderMianshi();
    clearInterval(iv.t);
    iv.t = setInterval(function () {
      iv.left--;
      var el = document.getElementById('ivTimer');
      if (el) {
        el.textContent = fmt(Math.max(0, iv.left));
        el.classList.toggle('warn', iv.left <= 60);
      }
      if (iv.left <= 0) { clearInterval(iv.t); iv.t = null; iv.phase = 'review'; renderMianshi(); toast('时间到，先看要点覆盖'); }
    }, 1000);
  }

  function ivGrade() {
    if (!iv.covered.length) { toast('至少要勾选一个说到的要点'); return; }
    iv.phase = 'scored';
    iv.score = Math.round(iv.covered.length / iv.q.points.length * 100);
    iv.used = Math.max(1, 300 - Math.max(0, iv.left));
    renderMianshi();
  }

  function ivSave() {
    S.iv.unshift({ id: iv.q.id, q: iv.q.q, type: iv.q.type, score: iv.score, used: iv.used, t: Date.now() });
    S.iv = S.iv.slice(0, 30);
    addMinutes(18);
    save();
    iv.phase = 'idle';
    iv.covered = [];
    toast('已保存到练习记录');
    renderMianshi();
  }

  /* ============================================================
     数据看板
     ============================================================ */
  function renderStats() {
    var ids = Object.keys(S.answers);
    var ok = ids.filter(function (id) { return S.answers[id].ok; }).length;
    var rate = ids.length ? Math.round(ok / ids.length * 100) : 0;
    var days = Object.keys(S.days).length;
    var mins = Object.keys(S.days).reduce(function (a, k) { return a + S.days[k]; }, 0);

    // 近 7 日
    var bars = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var k = dayKey(d);
      var n = ids.filter(function (id) {
        var t = S.answers[id].t;
        return t && dayKey(new Date(t)) === k;
      }).length;
      bars.push({ k: k, n: n, label: (d.getMonth() + 1) + '/' + d.getDate() });
    }
    var max = Math.max.apply(null, bars.map(function (b) { return b.n; }).concat([1]));

    var html = '<div class="tool-line"><h2>数据看板</h2><span class="sub">本地统计，不联网</span>' +
      '<div class="spacer"></div><button class="btn danger sm" data-act="resetAll">清空全部记录</button></div>' +

      '<div class="kpis">' +
        '<div class="kpi"><div class="k">累计做题</div><div class="v">' + ids.length + '<small>道</small></div></div>' +
        '<div class="kpi"><div class="k">正确率</div><div class="v">' + rate + '<small>%</small></div></div>' +
        '<div class="kpi"><div class="k">学习时长</div><div class="v">' + mins + '<small>分钟</small></div></div>' +
        '<div class="kpi"><div class="k">在练天数</div><div class="v">' + days + '<small>天</small></div></div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-h"><h2>近 7 日做题量</h2><span class="hint">按作答时间统计</span></div>' +
        (max <= 1 && !ids.length ? '<div class="empty">还没有作答记录。做几道题，这里就会出现趋势。</div>' : '') +
        '<div class="bars">' + bars.map(function (b) {
          var h = Math.round(b.n / max * 100);
          return '<div class="b' + (b.n === max && b.n > 0 ? ' hot' : '') + '"><i style="height:' + Math.max(4, h) + '%"></i><span>' + b.label + '</span></div>';
        }).join('') + '</div>' +
      '</div>' +

      moduleBars() +

      '<div class="card"><div class="card-h"><h2>练习分布</h2></div>' +
        row('申论批改', Object.keys(S.essays).length + ' 篇') +
        row('面试练习', S.iv.length + ' 次') +
        row('时政收藏', S.saved.length + ' 条') +
        row('错题待清', Object.keys(S.wrong).length + ' 道') +
      '</div>';

    mount(html);
  }

  function row(a, b) {
    return '<div class="progrow"><span class="nm" style="width:96px">' + a + '</span><span class="pc" style="width:auto">' + b + '</span></div>';
  }

  /* ============================================================
     事件
     ============================================================ */
  document.getElementById('view').addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    switch (act) {
      case 'go':
        location.hash = '#' + t.getAttribute('data-to');
        break;

      /* --- 今日 --- */
      case 'task': {
        var id = t.getAttribute('data-id');
        if (ev.target.closest('.go')) {
          var target = D.tasks.filter(function (x) { return x.id === id; })[0];
          if (target && target.go) location.hash = '#' + target.go;
          break;
        }
        var ts = todayTasks();
        if (ts[id]) delete ts[id]; else ts[id] = true;
        save();
        renderToday();
        break;
      }

      /* --- 行测 --- */
      case 'xctab':
        xc.tab = t.getAttribute('data-t');
        xc.picked = -1; xc.graded = false;
        renderXingce();
        break;
      case 'xcmod':
        xc.mod = t.getAttribute('data-m');
        xc.i = 0; xc.picked = -1; xc.graded = false;
        renderXingce();
        break;
      case 'pick':
        pickOption(+t.getAttribute('data-i'));
        break;
      case 'next': {
        var list = xcList();
        xc.i = (xc.i + 1) % list.length;
        xc.picked = -1; xc.graded = false;
        renderXingce();
        break;
      }
      case 'prev': {
        var l2 = xcList();
        xc.i = (xc.i - 1 + l2.length) % l2.length;
        xc.picked = -1; xc.graded = false;
        renderXingce();
        break;
      }
      case 'resetq':
        resetQuestion();
        break;
      case 'attrib': {
        var q = xcList()[xc.i];
        if (q && S.wrong[q.id]) {
          S.wrong[q.id].kind = t.getAttribute('data-k');
          save();
          toast('已记录错因：' + t.getAttribute('data-k'));
          renderXingce();
        }
        break;
      }
      case 'redo': {
        var rid = t.getAttribute('data-id');
        var qq = D.questions.filter(function (x) { return x.id === rid; })[0];
        xc.tab = 'practice';
        xc.mod = qq.mod;
        xc.i = xcList().indexOf(qq);
        xc.picked = -1; xc.graded = false;
        renderXingce();
        break;
      }
      case 'clearWrong':
        S.wrong = {};
        save();
        renderXingce();
        toast('错题本已清空');
        break;

      /* --- 申论 --- */
      case 'essaySel':
        es.id = t.getAttribute('data-id');
        es.result = null;
        es.text = '';
        renderShenlun();
        break;
      case 'essayGrade':
        gradeEssay();
        break;
      case 'essaySample': {
        var e = curEssay();
        var box = document.getElementById('essayResult');
        box.innerHTML = '<div class="divider"></div><div class="explain"><b>参考范文（' + e.sample.replace(/\s/g, '').length + ' 字）：</b><br>' + esc(e.sample) + '</div>';
        break;
      }
      case 'slRun': {
        var inp = document.getElementById('slIn');
        var out = document.getElementById('slOut');
        if (!inp) break;
        var src = inp.value.trim();
        if (!src) { toast('先写一句大白话'); break; }
        if (!window.SL) { out.innerHTML = '<div class="small muted">规则引擎未加载。</div>'; break; }
        var r = window.SL.convert(src, { level: 'standard', scene: 'auto' });
        if (!r) break;
        out.innerHTML = '<div class="card-h" style="margin-top:16px"><h2 style="font-size:13px">申论表述</h2>' +
          '<span class="hint">黄底为改动处，鼠标悬停看原文</span></div>' +
          '<div class="essay-out">' + window.SL.toHTML(r.text, r.marks) + '</div>' +
          '<div class="small muted" style="margin-top:6px">主题判断：' + esc(r.topic) + ' · 场景：' + esc(r.scene) + '</div>';
        break;
      }

      /* --- 时政 --- */
      case 'ncat':
        nz.cat = t.getAttribute('data-c');
        renderShizheng();
        break;
      case 'nsave': {
        var i = +t.getAttribute('data-i');
        var at = S.saved.indexOf(i);
        if (at >= 0) { S.saved.splice(at, 1); toast('已取消收藏'); }
        else { S.saved.push(i); toast('已收藏'); }
        save();
        renderShizheng();
        break;
      }
      case 'ncopy': {
        var ni = D.news[+t.getAttribute('data-i')];
        var txt = ni.title + '。' + ni.body + '（可用角度：' + ni.angle + '）';
        if (navigator.clipboard) navigator.clipboard.writeText(txt);
        toast('已复制，可直接粘进素材本');
        break;
      }

      /* --- 面试 --- */
      case 'ivDraw': {
        clearInterval(iv.t);
        var pool = D.interview.filter(function (x) { return !iv.q || x.id !== iv.q.id; });
        iv.q = pool[Math.floor(Math.random() * pool.length)];
        iv.phase = 'idle';
        iv.left = 300;
        iv.covered = [];
        renderMianshi();
        break;
      }
      case 'ivToggle':
        ivToggle();
        break;
      case 'ivPoint': {
        var pi = +t.getAttribute('data-i');
        var at2 = iv.covered.indexOf(pi);
        if (at2 >= 0) iv.covered.splice(at2, 1);
        else iv.covered.push(pi);
        renderMianshi();
        break;
      }
      case 'ivGrade':
        ivGrade();
        break;
      case 'ivSave':
        ivSave();
        break;

      /* --- 数据 --- */
      case 'resetAll':
        if (confirm('清空全部练习记录？（不可恢复）')) {
          Object.keys(DEFAULTS).forEach(function (k) { S[k] = Array.isArray(DEFAULTS[k]) ? [] : {}; });
          save();
          renderStats();
          refreshSide();
          toast('已清空');
        }
        break;
    }
  });

  /* 导航 */
  document.getElementById('nav').addEventListener('click', function (ev) {
    var a = ev.target.closest('.nav-link');
    if (!a) return;
    // 由 hashchange 统一处理
    ev.preventDefault();
    location.hash = '#' + a.getAttribute('data-view');
  });

  window.addEventListener('hashchange', function () {
    var v = (location.hash || '#today').slice(1);
    go(v);
  });

  /* 启动 */
  (function boot() {
    var v = (location.hash || '#today').slice(1);
    if (!ROUTES[v]) v = 'today';
    go(v);
  })();

})();
