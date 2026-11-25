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
  var DEFAULTS = { answers: {}, wrong: {}, essays: {}, notes: {}, saved: [], iv: [],
    mock: [], papers: [], tasks: {}, days: {}, ivf: {}, ks: { n: 0 }, ksHist: [], ksFav: [],
    theme: 'light' };

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
    koushu: { t: '口语规范化', s: '把大白话翻成能落笔的申论句子', render: renderKoushu },
    shizheng: { t: '时政素材', s: '只留能写进文章的东西', render: renderShizheng },
    mianshi: { t: '面试陪练', s: '抽题、计时、复盘，一条龙', render: renderMianshi },
    ciku: { t: '词库', s: '常识专项 · 申论规范词 · 成语 · 实词辨析', render: renderCiku },
    mock: { t: '模拟考试', s: '按考试节奏做一整套，交卷即出分', render: renderMock },
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
        '<div class="card-h"><h2>常用入口</h2><span class="hint">跳到最常练的几个模块</span></div>' +
        '<div class="quick">' +
          '<a href="#xingce"><b>行测刷题</b><span>' + QCOUNT + ' 道题 · 答完即判分</span></a>' +
          '<a href="#mock"><b>模拟考试</b><span>限时整套卷 · 交卷即出分</span></a>' +
          '<a href="#shenlun"><b>申论批改</b><span>' + D.essays.length + ' 套题 · 采分点对照</span></a>' +
          '<a href="#shizheng"><b>时政素材</b><span>' + D.news.length + ' 条 · 可搜索收藏</span></a>' +
          '<a href="#ciku"><b>词库</b><span>规范词 · 成语 · 实词 · 常识专项</span></a>' +
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
  var xc = { mod: '全部', i: 0, picked: -1, graded: false, tab: 'practice', attrib: null, tag: null, kind: 'all' };
  var noteOpen = false;
  var bankOpen = false, bankMsg = '';

  function xcList() {
    var pool = D.questions.filter(function (q) { return q.opts && q.opts.length >= 2 && q.ans >= 0; });
    if (xc.mod !== '全部') pool = pool.filter(function (q) { return q.mod === xc.mod; });
    if (xc.tag) pool = pool.filter(function (q) { return q.tag === xc.tag; });
    if (xc.kind === 'zt') pool = pool.filter(function (q) { return q.zt; });
    else if (xc.kind === 'mock') pool = pool.filter(function (q) { return !q.zt; });
    return pool;
  }

  var MATS = {};
  D.questions.forEach(function (q) { if (q.material) MATS[q.id] = q.stem.replace(/^【材料】/, ''); });
  var QCOUNT = D.questions.filter(function (q) { return q.opts && q.opts.length >= 2; }).length;

  function noteBoxHTML(q) {
    var note = S.notes['q:' + q.id] || '';
    return '<div class="notebox">' +
      '<div class="note-h"><span class="small muted">' + (note ? '我的笔记（已记）' : '随手记：思路 · 易错点 · 口诀') + '</span>' +
      '<div class="spacer"></div>' +
      '<button class="btn ghost sm" data-act="noteToggle">' + (noteOpen ? '收起' : '笔记') + '</button></div>' +
      (noteOpen ? '<textarea id="noteText" class="note-text" placeholder="记下这题的思路、易错点、口诀…">' + esc(note) + '</textarea>' +
        '<div class="note-f"><div class="spacer"></div>' +
        (note ? '<button class="btn ghost sm" data-act="noteDel">删除</button>' : '') +
        '<button class="btn sm" data-act="noteSave">保存笔记</button></div>' : '') +
      '</div>';
  }

  /* ---------- 本地真题导入 ---------- */
  function bankItems() {
    return (window.KG_BANK && window.KG_BANK.read) ? window.KG_BANK.read() : [];
  }

  function hash36(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h.toString(36);
  }

  function ansIndex(v) {
    var t = String(v == null ? '' : v).trim().toUpperCase();
    if (t === 'A') return 0; if (t === 'B') return 1; if (t === 'C') return 2; if (t === 'D') return 3;
    var n = parseInt(t, 10);
    if (isNaN(n)) return -1;
    if (n >= 1 && n <= 4) return n - 1;
    if (n === 0) return 0;
    return -1;
  }

  function mkQ(o, idx, defSrc) {
    var opts = (o.opts || []).map(function (x) { return String(x == null ? '' : x).trim(); });
    while (opts.length < 4) opts.push('');
    opts = opts.slice(0, 4);
    var ans = ansIndex(o.ans);
    var stem = String(o.stem == null ? '' : o.stem).trim();
    if (stem.length < 4 || opts.filter(Boolean).length !== 4 || ans < 0) return null;
    var mod = String(o.mod || '').trim() || '常识判断';
    return {
      id: o.id || ('ub' + hash36(stem + '|' + opts.join('|'))),
      mod: mod,
      tag: String(o.tag || '').trim() || (mod === '常识判断' ? '政治' : ''),
      level: o.level === 3 || o.level === 1 || o.level === 2 ? o.level : 2,
      stem: stem,
      opts: opts,
      ans: ans,
      exp: String(o.exp || o.explain || '').trim() || '（暂无解析）',
      src: String(o.src || o.source || '').trim() || String(defSrc || '').trim(),
      imp: 1
    };
  }

  function parseCsv(text, defSrc) {
    var out = [];
    text.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var f = line.indexOf('\t') >= 0 ? line.split('\t') : line.split(/[,，]/);
      f = f.map(function (x) { return x.trim(); });
      if (f.length < 6) return;
      if (/^(题干|题目|stem)/.test(f[0])) return;
      var q = mkQ({
        stem: f[0], opts: [f[1], f[2], f[3], f[4]],
        ans: f[5], exp: f[6] || '', src: f[7] || '', mod: f[8] || '', tag: f[9] || ''
      }, out.length, defSrc);
      if (q) out.push(q);
    });
    return out;
  }

  function parseBlocks(text, defSrc) {
    var out = [];
    text.split(/\n\s*\n/).forEach(function (block) {
      var lines = block.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (lines.length < 3) return;
      var stem = '', opts = [], ans = '', exp = '', src = '', mod = '';
      lines.forEach(function (ln) {
        var m = ln.match(/^[A-Da-d][\.、:：\)]\s*(.+)$/);
        if (m) { opts.push(m[1].trim()); return; }
        var a = ln.match(/^(?:答案|正确答案)[:：\s]*([A-Da-d1-4])/);
        if (a) { ans = a[1]; return; }
        var e = ln.match(/^(?:解析|分析)[:：\s]*(.+)$/);
        if (e) { exp = e[1].trim(); return; }
        var s2 = ln.match(/^(?:出处|来源|题源)[:：\s]*(.+)$/);
        if (s2) { src = s2[1].trim(); return; }
        var mm = ln.match(/^(?:模块|科目)[:：\s]*(.+)$/);
        if (mm) { mod = mm[1].trim(); return; }
        if (!stem && !/^\d+[\.、]/.test(ln)) stem = ln.replace(/^\d+[\.、]\s*/, '');
      });
      if (!stem) return;
      var q = mkQ({ stem: stem, opts: opts, ans: ans, exp: exp, src: src, mod: mod }, out.length, defSrc);
      if (q) out.push(q);
    });
    return out;
  }

  function parseBank(text, defSrc) {
    text = String(text || '').trim();
    if (!text) return { items: [], err: '还没粘内容' };
    if (text.charAt(0) === '[' || text.charAt(0) === '{') {
      var data = null;
      try { data = JSON.parse(text); } catch (e) { return { items: [], err: 'JSON 格式有误：' + e.message.slice(0, 60) }; }
      var arr = Array.isArray(data) ? data : (data.questions || []);
      if (!Array.isArray(arr)) return { items: [], err: 'JSON 里没找到题目数组' };
      var items = [];
      arr.forEach(function (o) { var q = mkQ(o, items.length, defSrc); if (q) items.push(q); });
      return { items: items, err: items.length ? '' : '题目字段不全（需要 stem / opts 四条 / ans）' };
    }
    var csv = parseCsv(text, defSrc);
    if (csv.length) return { items: csv, err: '' };
    var blk = parseBlocks(text, defSrc);
    return { items: blk, err: blk.length ? '' : '没认出来，检查一下格式（题干 + A–D 四个选项 + 答案）' };
  }

  function bankBoxHTML() {
    var n = bankItems().length;
    return '<div class="bank-box">' +
      '<div class="bank-h"><b>导入真题</b>' +
      '<span class="small muted">存在本机，不上传；导入后整页刷新生效</span>' +
      '<div class="spacer"></div>' +
      '<button class="btn ghost sm" data-act="bankClose">收起</button></div>' +
      '<p class="bank-tip">支持 <b>JSON</b>（stem / opts / ans / exp / src / mod）、<b>CSV</b>（题干,选项A,选项B,选项C,选项D,答案,解析,出处,模块）、<b>纯文本</b>（题干 + A–D 四行 + 「答案：B」+「出处：…」）。没写出处的题会用下面的公共出处。</p>' +
      '<input class="bank-src" id="bankSrc" placeholder="公共出处，例如：2024 国考副省级 第 1–20 题">' +
      '<textarea class="bank-text" id="bankText" placeholder="把真题粘到这里，一次可以几百道"></textarea>' +
      (bankMsg ? '<div class="bank-msg">' + esc(bankMsg) + '</div>' : '') +
      '<div class="bank-f"><span class="small muted">已导入 ' + n + ' 道</span>' +
      '<div class="spacer"></div>' +
      (n ? '<button class="btn ghost sm" data-act="bankReset">清空导入</button>' : '') +
      '<button class="btn sm" data-act="bankParse">解析并导入</button></div>' +
      '</div>';
  }

  function renderXingce() {
    var html = '<div class="tool-line">' +
      '<h2>行测刷题</h2>' +
      '<span class="sub">共 ' + QCOUNT + ' 道 · 已做 ' + Object.keys(S.answers).length + ' 道</span>' +
      '<div class="spacer"></div>' +
      '<button class="btn ghost sm" data-act="bankOpen">导入真题</button>' +
      '<div class="seg">' +
        '<button class="' + (xc.kind === 'all' ? 'on' : '') + '" data-act="xckind" data-k="all">全部</button>' +
        '<button class="' + (xc.kind === 'zt' ? 'on' : '') + '" data-act="xckind" data-k="zt">真题</button>' +
        '<button class="' + (xc.kind === 'mock' ? 'on' : '') + '" data-act="xckind" data-k="mock">模拟</button>' +
      '</div>' +
      '<div class="seg">' +
        '<button class="' + (xc.tab === 'practice' ? 'on' : '') + '" data-act="xctab" data-t="practice">练习</button>' +
        '<button class="' + (xc.tab === 'wrong' ? 'on' : '') + '" data-act="xctab" data-t="wrong">错题本 ' + Object.keys(S.wrong).length + '</button>' +
      '</div>' +
    '</div>';

    if (bankOpen) html += bankBoxHTML();

    var mods = ['全部'].concat(D.modules).map(function (m) {
      return '<button class="mod-chip' + (m === xc.mod ? ' on' : '') + '" data-act="xcmod" data-m="' + esc(m) + '">' + esc(m) + '</button>';
    }).join('');
    html += '<div class="mods" style="margin-bottom:16px">' + mods + '</div>';

    if (xc.mod === '常识判断' && xc.tab === 'practice') {
      var csTags = ['全部', '法律', '政治', '经济', '科技', '人文历史', '地理国情'].map(function (tg) {
        var cur = (xc.tag || '全部') === tg;
        return '<button class="mod-chip' + (cur ? ' on' : '') + '" data-act="xctag" data-t="' + (tg === '全部' ? '' : tg) + '">' + tg + '</button>';
      }).join('');
      html += '<div class="mods" style="margin-bottom:16px">' + csTags + '</div>';
    }

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
        (q.src ? '<span class="tag src" title="出处">' + esc(q.src) + '</span>' : '') +
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
        (q.mat && MATS[q.mat] ? '<div class="matbox">' + esc(MATS[q.mat]) + '</div>' : '') +
        '<p class="qstem">' + esc(q.stem) + '</p>' +
        '<div class="opts2">' + opts + '</div>' +
        after +
        noteBoxHTML(q) +
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

  function printWrongBook() {
    var ids = Object.keys(S.wrong);
    if (!ids.length) { toast('错题本是空的'); return; }
    var body = ids.map(function (id) {
      var q = D.questions.filter(function (x) { return x.id === id; })[0];
      if (!q) return '';
      var w = S.wrong[id];
      var note = S.notes['q:' + id] || '';
      return '<div class="pw-item"><h3>' + esc(q.stem) + '</h3>' +
        q.opts.map(function (o, i) {
          return '<p>' + (i === q.ans ? '<b>✔ ' : '') + 'ABCD'[i] + '. ' + esc(o) + (i === q.ans ? '</b>' : '') + '</p>';
        }).join('') +
        '<p class="pw-exp">解析：' + esc(q.exp || '无') + '</p>' +
        '<p class="pw-meta">错因：' + esc(w.kind || '未归因') + ' · 错 ' + (w.n || 1) + ' 次' + (note ? ' · 笔记：' + esc(note) : '') + '</p></div>';
    }).join('');
    var wnd = window.open('', '_blank', 'width=780,height=940');
    if (!wnd) { toast('浏览器拦截了弹窗，请允许后重试'); return; }
    wnd.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>错题本</title><style>' +
      'body{font-family:"Microsoft YaHei",sans-serif;padding:30px 36px;color:#171b24;font-size:13.5px}' +
      '.pw-item{border-bottom:1px solid #e4e7ec;padding:14px 0;break-inside:avoid}' +
      'h1{font-size:19px;margin:0 0 4px}h3{font-size:14.5px;margin:0 0 9px}' +
      'p{margin:4px 0;line-height:1.8}.pw-exp{color:#3d4a5f}.pw-meta{color:#8a93a3;font-size:12px}' +
      '.sub{color:#8a93a3;font-size:12.5px;margin-bottom:12px}@media print{body{padding:6px}}' +
      '</style></head><body><h1>错题本</h1><div class="sub">共 ' + ids.length + ' 道 · 打印于 ' + dayKey() + '</div>' + body + '</body></html>');
    wnd.document.close();
    setTimeout(function () { try { wnd.focus(); wnd.print(); } catch (e) {} }, 300);
    toast('已生成打印版（共 ' + ids.length + ' 道）');
  }

  function exportNews() {
    var list = D.news.filter(function (n) {
      if (nz.cat !== '全部' && n.cat !== nz.cat) return false;
      if (nz.q && (n.title + n.body + n.angle + (n.src || '') + (n.cat || '')).indexOf(nz.q) < 0) return false;
      return true;
    });
    if (!list.length) { toast('没有可导出的素材'); return; }
    var txt = '时政素材导出（共 ' + list.length + ' 条）\n导出时间：' + dayKey() + '\n' + new Array(41).join('=') + '\n\n';
    txt += list.map(function (n) {
      return '【' + n.d + ' · ' + n.cat + '】' + n.title + '\n' + n.body + '\n可用角度：' + n.angle + (n.src ? '\n来源：' + n.src + (n.url ? ' ' + n.url : '') : '') + '\n';
    }).join('\n');
    var blob = new Blob(['\ufeff' + txt], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '时政素材-' + dayKey() + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 400);
    toast('已导出 ' + list.length + ' 条素材');
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
      '<div class="spacer"></div><button class="btn ghost sm" data-act="printWrong">打印错题本</button>' +
      '<button class="btn ghost sm" data-act="clearWrong">清空</button></div>' +
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
  var es = { id: 'e1', type: '概括归纳', result: null, text: '', pick: 0, level: 'high' };
  var eNoteOpen = false;

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
      '<div class="es-picker">' +
        '<div class="seg">' + (function () {
          var types = [];
          D.essays.forEach(function (x) { if (types.indexOf(x.type) < 0) types.push(x.type); });
          return types.map(function (t) {
            var n = D.essays.filter(function (x) { return x.type === t; }).length;
            return '<button class="' + (t === e.type ? 'on' : '') + '" data-act="essayType" data-t="' + esc(t) + '">' +
              esc(t) + '<i>' + n + '</i></button>';
          }).join('');
        })() + '</div>' +
        '<div class="es-list">' + (function () {
          var same = D.essays.filter(function (x) { return x.type === e.type; });
          return same.map(function (x, i) {
            var done = S.essays[x.id] ? ' done' : '';
            return '<button class="es-no' + done + (x.id === e.id ? ' on' : '') + '" data-act="essaySel" data-id="' + x.id + '" title="' + esc(x.title) + '">' + (i + 1) + '</button>';
          }).join('');
        })() + '</div>' +
      '</div>' +
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
          '<button class="btn ghost sm" data-act="eNoteToggle">' + (eNoteOpen ? '收起笔记' : ('笔记' + (S.notes['e:' + e.id] ? ' ✓' : ''))) + '</button>' +
          '<button class="btn" data-act="essayGrade">对照采分点批改</button>' +
        '</div>' +
        (eNoteOpen ? '<div class="notebox"><textarea id="eNoteText" class="note-text" placeholder="记下这套题的思路、范文要点、自己的失分点…">' + esc(S.notes['e:' + e.id] || '') + '</textarea>' +
          '<div class="note-f"><div class="spacer"></div>' +
          (S.notes['e:' + e.id] ? '<button class="btn ghost sm" data-act="eNoteDel">删除</button>' : '') +
          '<button class="btn sm" data-act="eNoteSave">保存</button></div></div>' : '') +
        '<div id="essayResult">' + (es.result ? essayResultHTML(es.result) : '') + '</div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-h"><h2>顺便用一下：口语规范化</h2><span class="hint">把大白话改成能落笔的句子</span><div class="right"><a class="btn ghost sm" href="#koushu">打开完整版 ›</a></div></div>' +
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

  /* 比对前归一：去空白、去各类引号与括号，避免用户/范文用「」“”导致关键词不命中 */
  function normKey(x) {
    return String(x || '')
      .replace(/\s/g, '')
      .replace(/[\u201c\u201d\u2018\u2019"\u300c\u300d\u300e\u300f\u3010\u3011()\uff08\uff09\u3014\u3015]/g, '');
  }


  /* 范文三档对照：低分卷 / 中等卷 / 高分卷 */
  function sampleBoxHTML(e) {
    var lv = e.levels;
    if (!lv) {
      var sTxt = String(e.sample || '');
      return '<div class="divider"></div><div class="sample-box"><div class="sample-cap">参考范文（约 ' +
        sTxt.replace(/\s/g, '').length + ' 字）</div><div class="essay-sample">' + esc(sTxt) + '</div></div>';
    }
    var order = ['low', 'mid', 'high'];
    var cur = lv[es.level] ? es.level : 'high';
    var one = lv[cur];

    var tabs = order.map(function (k) {
      var x = lv[k];
      return '<button class="lv-t' + (k === cur ? ' on' : '') + ' lv-' + k + '" data-act="essayLevel" data-k="' + k + '">' +
        x.name + '<em>' + x.score + '</em></button>';
    }).join('');

    var title = '';
    var body = one.text;
    if (e.type === '贯彻执行' || e.type === '文章论述' || e.type === '文章写作') {
      var at = body.indexOf('\n\n');
      if (at > 0) {
        title = '<div class="sample-title">' + esc(body.slice(0, at).trim()) + '</div>';
        body = body.slice(at + 2);
      }
    }

    return '<div class="divider"></div><div class="sample-box">' +
      '<div class="lv-tabs">' + tabs + '</div>' +
      '<div class="lv-note lv-note-' + cur + '">' + esc(one.note) + '</div>' +
      '<div class="lv-meta"><span>采分点覆盖 <b>' + one.covered + ' / ' + one.total + '</b></span>' +
        '<span>字数 <b>' + one.text.replace(/\s/g, '').length + '</b></span>' +
        '<span>估分 <b>' + one.score + '</b></span></div>' +
      title +
      '<div class="essay-sample">' + esc(body) + '</div>' +
      '<div class="lv-hint">三档用的是同一道题、同一套采分点，差别只在覆盖几条、有没有分条、语言是否规范。</div>' +
    '</div>';
  }

  function gradeEssay() {
    var e = curEssay();
    var raw = es.text || '';
    var chars = String(raw).replace(/\s/g, '').length;   /* 字数按原文计 */
    var text = normKey(raw);
    if (chars < 30) { toast('先写够 30 个字再批改'); return; }

    var total = 0, got = 0;
    var hits = e.points.map(function (p) {
      var hit = p.k.some(function (k) { return text.indexOf(normKey(k)) >= 0; });
      total += p.w;
      if (hit) got += p.w;
      return { label: p.label, hit: hit, k: p.k, w: p.w };
    });

    var ratio = total ? got / total : 0;
    var lenRate = chars / e.limit;
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
      score: score, hits: hits, chars: chars, limit: e.limit,
      comment: '<b>批改建议：</b>' + tail
    };
    es.result = r;
    S.essays[e.id] = { score: score, chars: chars, t: Date.now() };
    addMinutes(25);
    save();

    var box = document.getElementById('essayResult');
    if (box) {
      box.innerHTML = essayResultHTML(r);
    }
    refreshSide();
  }

  /* ============================================================
     口语规范化（核心功能）
     ============================================================ */
  var KLEVELS = [['light', '轻改'], ['standard', '标准'], ['high', '拔高']];
  var KSCENES = [['auto', '自动'], ['problem', '问题'], ['cause', '原因'], ['measure', '对策'], ['meaning', '意义']];
  var KCATS = ['开头', '问题', '原因', '对策', '意义', '结尾'];
  var KEXAMPLES = [
    '我觉得现在有些干部就是不下基层，坐在办公室里拍脑袋决策。',
    '这事不能光靠政府，老百姓自己也得上心。',
    '政策挺好，就是落实的时候老走样，到下面就变味了。',
    '说白了，钱没花在刀刃上，该投的地方没投。'
  ];
  var ks = { level: 'standard', scene: 'auto', cat: '开头', out: null, text: '' };

  function ksSeg(list, cur, act) {
    return '<div class="seg">' + list.map(function (x) {
      return '<button class="' + (x[0] === cur ? 'on' : '') + '" data-act="' + act + '" data-v="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }

  function ksPatterns() { return D.patterns || []; }

  function ksPatternHTML() {
    var ps = ksPatterns();
    if (!ps.length) return '';
    var list = ps.filter(function (p) { return p.cat === ks.cat; });
    return '<div class="card">' +
      '<div class="card-h"><h2>句式模板</h2><span class="hint">点一下复制走，套上材料就能用</span></div>' +
      '<div class="seg" style="margin-bottom:14px">' + KCATS.map(function (c) {
        return '<button class="' + (c === ks.cat ? 'on' : '') + '" data-act="ksCat" data-v="' + c + '">' + c + '</button>';
      }).join('') + '</div>' +
      '<div class="ks-pats">' + list.map(function (p, i) {
        return '<button class="ks-pat" data-act="ksPat" data-i="' + i + '">' +
          '<span>' + esc(p.text) + '</span><em>' + esc(p.note) + '</em></button>';
      }).join('') + '</div>' +
    '</div>';
  }

  function ksHistHTML() {
    var h = S.ksHist || [];
    if (!h.length) return '';
    return '<div class="card">' +
      '<div class="card-h"><h2>最近转换</h2><span class="hint">点一条可以放回左边再改</span>' +
        '<div class="right"><button class="btn ghost sm" data-act="ksHistClear">清空</button></div></div>' +
      '<div class="ks-hist">' + h.slice(0, 6).map(function (x, i) {
        return '<button class="ks-hitem" data-act="ksHist" data-i="' + i + '">' +
          '<span class="src">' + esc(x.src) + '</span>' +
          '<span class="dst">' + esc(x.out) + '</span></button>';
      }).join('') + '</div>' +
    '</div>';
  }

  function ksFavHTML() {
    var f = S.ksFav || [];
    if (!f.length) return '';
    return '<div class="card">' +
      '<div class="card-h"><h2>我的句子</h2><span class="hint">收藏 ' + f.length + ' 句</span></div>' +
      '<div class="ks-favs">' + f.map(function (s, i) {
        return '<div class="ks-fav"><span>' + esc(s) + '</span>' +
          '<button class="btn ghost sm" data-act="ksFavCopy" data-i="' + i + '">复制</button>' +
          '<button class="btn ghost sm" data-act="ksFavDel" data-i="' + i + '">删</button></div>';
      }).join('') + '</div>' +
    '</div>';
  }

  function renderKoushu() {
    var html = '<div class="tool-line">' +
        '<h2>口语规范化</h2>' +
        '<span class="sub">一句大白话，翻成能落笔的申论句子</span>' +
        '<div class="spacer"></div>' +
        '<span class="core-tag">核心功能</span>' +
      '</div>' +

      '<div class="ks-grid">' +
        '<div class="card">' +
          '<div class="card-h"><h2>你的原话</h2><span class="hint" id="ksCount">0 字</span></div>' +
          '<textarea id="ksIn" placeholder="例：我觉得有些干部就是不下基层，坐在办公室里拍脑袋决策。"></textarea>' +
          '<div class="ks-chips">' + KEXAMPLES.map(function (s, i) {
            return '<button class="chip" data-act="ksExample" data-i="' + i + '">' + esc(s.slice(0, 10)) + '…</button>';
          }).join('') + '</div>' +
          '<div class="ks-ctrl">' +
            '<span class="ks-lab">力度</span>' + ksSeg(KLEVELS, ks.level, 'ksLevel') +
            '<span class="ks-lab">场景</span>' + ksSeg(KSCENES, ks.scene, 'ksScene') +
          '</div>' +
          '<div class="essay-foot">' +
            '<button class="btn ghost sm" data-act="ksClear">清空</button>' +
            '<div class="spacer"></div>' +
            '<button class="btn" data-act="ksRun">转成申论句</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-h"><h2>申论表述</h2><span class="hint" id="ksMeta">黄底为改动处，悬停看原文</span></div>' +
          '<div id="ksOut" class="ks-out"><div class="ks-empty">左边写一句大白话，这里出规范句。</div></div>' +
          '<div id="ksMarks" class="ks-marks"></div>' +
          '<div id="ksTerms" class="ks-terms"></div>' +
          '<div class="essay-foot">' +
            '<span class="small muted" id="ksDict">本地规则引擎 · 词库 ' + (window.SL ? window.SL.dictSize : 0) + ' 条</span>' +
            '<div class="spacer"></div>' +
            '<button class="btn ghost sm" data-act="ksFav">收藏这句</button>' +
            '<button class="btn ghost sm" data-act="ksCopy">复制</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      ksPatternHTML() + ksHistHTML() + ksFavHTML();

    mount(html);

    var box = document.getElementById('ksIn');
    if (box) {
      box.value = ks.text || '';
      box.addEventListener('input', function () {
        ks.text = box.value;
        var el = document.getElementById('ksCount');
        if (el) el.textContent = box.value.replace(/\s/g, '').length + ' 字';
      });
      var c0 = document.getElementById('ksCount');
      if (c0) c0.textContent = (ks.text || '').replace(/\s/g, '').length + ' 字';
    }
    if (ks.out) ksPaint();
  }

  function ksPaint() {
    var r = ks.out;
    var out = document.getElementById('ksOut');
    if (!r || !out) return;
    out.innerHTML = window.SL.toHTML(r.text, r.marks);

    var meta = document.getElementById('ksMeta');
    if (meta) { var sn = { auto: '自动', problem: '问题', cause: '原因', measure: '对策', meaning: '意义', mixed: '综合' }; meta.textContent = '主题 ' + r.topic + ' · 场景 ' + (sn[r.scene] || r.scene || '自动'); }

    var mb = document.getElementById('ksMarks');
    if (mb) {
      var chips = (r.marks || []).filter(function (m) { return !m.del && m.from && m.to; }).map(function (m) {
        return '<span class="mk"><em>' + esc(m.from) + '</em>→' + esc(m.to) + '</span>';
      });
      mb.innerHTML = chips.length
        ? '<span class="ks-lab">改动对照</span><div class="ks-mklist">' + chips.join('') + '</div>' : '';
    }

    var tb = document.getElementById('ksTerms');
    if (tb) {
      var terms = r.terms || [];
      tb.innerHTML = terms.length
        ? '<span class="ks-lab">可点缀术语</span><div class="ks-mklist">' +
          terms.map(function (t) { return '<span class="term">' + esc(t) + '</span>'; }).join('') + '</div>' : '';
    }
  }

  function ksRun() {
    if (!window.SL) { toast('规则引擎未加载'); return; }
    var src = (ks.text || '').replace(/\s+$/, '');
    if (!src) { toast('先写一句大白话'); return; }
    var r = window.SL.convert(src, { level: ks.level, scene: ks.scene });
    if (!r) { toast('这句没转换出结果，换一种说法试试'); return; }
    ks.out = r;
    S.ksHist = S.ksHist || [];
    S.ksHist.unshift({ src: src, out: r.text, level: ks.level, scene: r.scene, t: Date.now() });
    S.ksHist = S.ksHist.slice(0, 12);
    S.ks.n = (S.ks.n || 0) + 1;
    save();
    renderKoushu();
    toast('已转换 · 累计第 ' + S.ks.n + ' 句');
  }

  /* ============================================================
     时政
     ============================================================ */
  var nz = { q: '', cat: '全部' , limit: 36 };

  function renderShizheng() {
    var order = ['民生', '治理', '经济', '文化', '生态', '乡村', '科技', '法治'];
    var cats = ['全部'];
    order.forEach(function (c) {
      if (D.news.some(function (n) { return n.cat === c; })) cats.push(c);
    });
    D.news.forEach(function (n) { if (cats.indexOf(n.cat) < 0) cats.push(n.cat); });

    var list = D.news.filter(function (n) {
      if (nz.cat !== '全部' && n.cat !== nz.cat) return false;
      if (nz.q && (n.title + n.body + n.angle + (n.src || '') + (n.cat || '')).indexOf(nz.q) < 0) return false;
      return true;
    });

    var html = '<div class="tool-line"><h2>时政素材</h2>' +
      '<span class="sub">共 ' + D.news.length + ' 条 · 已收藏 ' + S.saved.filter(function (k) { return D.news.some(function (n) { return (n.url || n.title) === k; }); }).length + ' 条</span>' +
      '<div class="spacer"></div>' +
      '<button class="btn ghost sm" data-act="newsExport">导出素材</button></div>' +
      '<div class="news-tools">' +
        '<input id="newsQ" placeholder="搜索关键词，如：基层、数字、托育" value="' + esc(nz.q) + '">' +
        '<div class="mods">' + cats.map(function (c) {
          return '<button class="mod-chip' + (c === nz.cat ? ' on' : '') + '" data-act="ncat" data-c="' + esc(c) + '">' + esc(c) + '<i>' + (c === '全部' ? D.news.length : D.news.filter(function (x) { return x.cat === c; }).length) + '</i></button>';
        }).join('') + '</div>' +
      '</div>' +
      (list.length ? '<div class="news-grid">' + list.slice(0, nz.limit).map(function (n) {
        var i = D.news.indexOf(n);
        var key = n.url || n.title;
        var on = S.saved.indexOf(key) >= 0;
        return '<div class="nitem">' +
          '<div class="row"><span class="tag">' + esc(n.d) + ' · ' + esc(n.cat) + '</span><div class="spacer"></div>' +
            '<button class="icobtn' + (on ? ' on' : '') + '" data-act="nsave" data-i="' + i + '" data-k="' + esc(key) + '" title="收藏">' +
            '<svg width="13" height="13" viewBox="0 0 20 20" fill="' + (on ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.6"><path d="M5.5 3h9v14l-4.5-3.4L5.5 17z"/></svg></button>' +
          '</div>' +
          '<h4>' + esc(n.title) + '</h4>' +
          '<p>' + esc(n.body) + '</p>' +
          (n.src ? '<div class="nsrc">来源：' + (n.url ? '<a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.src) + '</a>' : esc(n.src)) + '</div>' : '') +
          '<div class="foot"><span class="tag blue">可用角度：' + esc(n.angle) + '</span><div class="spacer"></div>' +
            '<button class="btn ghost sm" data-act="ncopy" data-i="' + i + '">复制论据</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>' + (list.length > nz.limit ? '<div class="nmore-wrap"><button class="btn ghost" data-act="nmore">显示更多（还有 ' + (list.length - nz.limit) + ' 条）</button></div>' : '') : '<div class="card"><div class="empty">没有匹配的素材，换个关键词试试。</div></div>');

    mount(html);
    var inp = document.getElementById('newsQ');
    if (inp) {
      inp.addEventListener('input', function () {
        nz.q = inp.value.trim();
        nz.limit = 36;
        var pos = inp.selectionStart;
        renderShizheng();
        var again = document.getElementById('newsQ');
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} }
      });
    }
  }

  /* ============================================================
     词库
     ============================================================ */
  var GV = window.GV || { norms: [], idioms: [], words: [] };
  var ci = { tab: 'cs', q: '' };

  function renderCiku() {
    var tabs = [['cs', '常识专项'], ['norms', '申论规范词'], ['idioms', '成语'], ['words', '实词辨析']];
    var html = '<div class="tool-line"><h2>词库</h2>' +
      '<span class="sub">常识专项 · 规范词 ' + GV.norms.length + ' 条 · 成语 ' + GV.idioms.length + ' 条 · 实词 ' + GV.words.length + ' 对</span>' +
      '</div>' +
      '<div class="ci-seg">' + tabs.map(function (x) {
        return '<button class="' + (ci.tab === x[0] ? 'on' : '') + '" data-act="ciTab" data-t="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div>';

    if (ci.tab === 'cs') {
      html += ciCatsHTML();
    } else {
      var ph = ci.tab === 'norms' ? '搜规范词，如「放管服」「枫桥经验」'
        : ci.tab === 'idioms' ? '搜成语，如「一蹴而就」「背道而驰」'
        : '搜实词，如「必须」「截止」「置疑」';
      html += '<input class="ci-q" data-act="ciq" placeholder="' + ph + '" value="' + esc(ci.q) + '">' +
        '<div id="ciHolder">' + ciListHTML() + '</div>';
    }
    mount(html);
  }

  function ciCatsHTML() {
    var tags = ['法律', '政治', '经济', '科技', '人文历史', '地理国情'];
    var all = D.questions.filter(function (q) { return q.mod === '常识判断'; }).length;
    var cards = tags.map(function (tg) {
      var n = D.questions.filter(function (q) { return q.mod === '常识判断' && q.tag === tg; }).length;
      return '<div class="ci-cat" data-act="ciGo" data-t="' + tg + '"><b>' + tg + '</b><span>' + n + ' 道 · 点击进入专项刷题</span><span class="go">去练 →</span></div>';
    }).join('');
    return '<div class="ci-count">常识按六个方向分好类（共 ' + all + ' 道），点卡片直接进入对应方向的刷题；也可以点右上角放大镜全局搜题。</div>' +
      '<div class="ci-cats">' + cards + '</div>';
  }

  function ciListHTML() {
    var q = (ci.q || '').trim().toLowerCase();
    var arr = [], html = '';
    if (ci.tab === 'norms') {
      arr = GV.norms.filter(function (x) { return !q || (x[0] + ' ' + x[1]).toLowerCase().indexOf(q) >= 0; });
      html = arr.map(function (x) { return '<div class="ci-card"><b>' + esc(x[0]) + '</b><p>' + esc(x[1]) + '</p></div>'; }).join('');
    } else if (ci.tab === 'idioms') {
      arr = GV.idioms.filter(function (x) { return !q || (x[0] + ' ' + x[1]).toLowerCase().indexOf(q) >= 0; });
      html = arr.map(function (x) { return '<div class="ci-card"><b>' + esc(x[0]) + '</b><p>' + esc(x[1]) + '</p></div>'; }).join('');
    } else {
      arr = GV.words.filter(function (x) { return !q || (x[0] + ' ' + x[1] + ' ' + x[2]).toLowerCase().indexOf(q) >= 0; });
      html = arr.map(function (x) {
        return '<div class="ci-card"><b>' + esc(x[0]) + ' <span class="vs">/</span> ' + esc(x[1]) + '</b><p>' + esc(x[2]) + '</p></div>';
      }).join('');
    }
    return arr.length ? '<div class="ci-list">' + html + '</div>' : '<div class="ci-empty">没有匹配的词条，换个关键词试试。</div>';
  }

  /* ============================================================
     面试
     ============================================================ */
  var iv = { q: null, phase: 'idle', left: 300, t: null, covered: [], score: 0, used: 0, text: '', metrics: null, parts: null, advice: '', audioURL: null, audioBlob: null, mic: false, err: '', stream: null, mr: null, chunks: [], t0: 0 };

/* ============================================================
     面试（录音 → 本地转写 → 评分）
     转写用浏览器里跑的 Whisper（transformers.js），模型首次下载后缓存在本地，
     不依赖任何墙外服务，音频也不上传。
     ============================================================ */

  /* --- 视图 ------------------------------------------------------- */

  function renderMianshi() {
    var html = '<div class="tool-line"><h2>面试陪练</h2>' +
      '<span class="sub">抽题 → 计时作答 → 按要点评分</span>' +
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
            : iv.phase === 'review'
                ? '<button class="btn sm" data-act="ivScore" style="width:100%">按转写评分</button>'
                : '<button class="btn sm" id="ivBtn" data-act="' + (iv.phase === 'run' ? 'ivStop' : 'ivStart') + '" style="width:100%">' +
                  (iv.phase === 'run' ? '结束作答' : '开始录音作答') + '</button>') +
          (iv.phase === 'run' && iv.mic ? '<div class="rec-dot"><i></i>录音中</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="card-h"><h2>练习记录</h2><span class="hint">最近 6 次</span></div>' +
        (S.iv.length ? '<div class="iv-log">' + S.iv.slice(0, 6).map(function (r) {
          var cls = r.score >= 80 ? 'hi' : r.score >= 60 ? 'mid' : 'lo';
          var d = new Date(r.t);
          return '<div class="iv-row"><div class="sc ' + cls + '">' + r.score + '</div>' +
            '<div class="txt"><b style="color:var(--ink)">' + esc(r.type) + '</b> · 用时 ' + r.used + ' 秒' +
            (r.spm ? ' · ' + r.spm + ' 字/分' : '') + ' · ' + (d.getMonth() + 1) + '/' + d.getDate() + '<br>' + esc(r.q) + '</div></div>';
        }).join('') + '</div>' : '<div class="empty">还没有练习记录。抽一道题，开口说三分钟就有记录。</div>') +
      '</div>';

    mount(html);
  }

  function phaseText() {
    if (iv.phase === 'run') return iv.mic ? '正在录音，说完点结束' : '计时中，写完点按要点评分';
    
    if (iv.phase === 'review') return '检查转写，再评分';
    if (iv.phase === 'scored') return '已评分，可抽取下一题';
    return '抽题后可开始计时';
  }
  function fmt(s) {
    var m = Math.floor(s / 60);
    return pad(m) + ':' + pad(s % 60);
  }

  function ivCardHTML() {
    if (!iv.q) {
      return '<div class="empty" style="padding:52px 10px">还没抽题。<br><br>' +
        '<button class="btn" data-act="ivDraw">随机抽一道</button>' +
        '<div class="small muted" style="margin-top:14px;line-height:1.8">抽题后点「开始录音作答」或「直接用文字练」。<br>' +
        '录音只存在本机，不上传任何服务器。</div></div>';
    }
    var q = iv.q;

    var chips = q.points.map(function (p, i) {
      var on = iv.covered.indexOf(i) >= 0;
      return '<span class="' + (on ? 'tag green' : '') + '" data-act="ivPoint" data-i="' + i + '" ' +
        'style="cursor:pointer;' + (on ? '' : 'background:#f1f2f5;color:var(--ink-2)') + '">' + (on ? '✓ ' : '') + esc(p) + '</span>';
    }).join('');

    var head = '<div class="qhead"><span class="tag blue">' + esc(q.type) + '</span>' +
        '<div class="spacer"></div><span class="muted small">' +
        (iv.phase === 'scored' ? '命中 ' + iv.covered.length + ' / ' + q.points.length + ' 个要点' :
         iv.phase === 'run' ? (iv.mic ? '录音中' : '作答中') :
         '已说到 ' + iv.covered.length + ' / ' + q.points.length + ' 个要点') +
        '</span></div>' +
      '<p class="iv-q">' + esc(q.q) + '</p>';

    if (iv.phase === 'idle') {
      return head + '<div class="divider"></div>' +
        '<div class="small muted" style="line-height:1.9">' +
          '· 结构化面试按「怎么看—为什么—怎么办」三段说，2–3 分钟最合适<br>' +
          '· 录音只是留个回放，复盘时把要点补成文字再评分<br>' +
          '· 想练表达就录，想练结构直接打字' +
        '</div>' +
        '<div class="qbar"><button class="btn" data-act="ivStart">开始录音作答</button>' +
        '<button class="btn ghost sm" data-act="ivTextMode">直接用文字练</button></div>';
    }

    if (iv.phase === 'run') {
      if (!iv.mic) {
        return head + '<div class="divider"></div>' +
          '<div class="small muted" style="margin-bottom:8px">边想边写要点，写完点「按要点评分」：</div>' +
          '<textarea class="ta iv-ta" id="ivText" placeholder="第一…第二…最后…">' + esc(iv.text) + '</textarea>' +
          '<div class="qbar"><button class="btn" data-act="ivScore">按要点评分</button>' +
          '<button class="btn ghost sm" data-act="ivDraw">换一题</button></div>' +
          '<div class="iv-points" id="ivPoints" style="display:none">' + chips + '</div>';
      }
      return head +
        '<div class="iv-live" style="display:grid;place-items:center;color:var(--ink-3)">' +
          '<div style="text-align:center">' +
            '<div class="rec-big"><i></i></div>' +
            '<div style="margin-top:12px;font-size:13px">正在录音，说给考官听</div>' +
            '<div style="margin-top:4px;font-size:12px;color:var(--ink-4)">录音只留在本机；说完点「结束作答」，再补记要点</div>' +
          '</div>' +
        '</div>' +
        (iv.err ? '<div class="iv-err" id="ivErr">' + esc(iv.err) + '</div>' : '<div class="iv-err" id="ivErr" style="display:none"></div>') +
        '<div class="qbar"><button class="btn" data-act="ivStop">结束作答</button></div>';
    }

    if (iv.phase === 'review') {
      return head + '<div class="divider"></div>' +
        '<div class="small muted" style="margin-bottom:8px">把刚才说的要点写在这里（简要即可），再评分：</div>' +
        '<textarea class="ta iv-ta" id="ivText">' + esc(iv.text) + '</textarea>' +
        (iv.err ? '<div class="iv-err" id="ivErr">' + esc(iv.err) + '</div>' : '') +
        (iv.audioURL ? '<audio class="iv-audio" controls src="' + iv.audioURL + '"></audio>' : '') +
        '<div class="qbar"><button class="btn" data-act="ivScore">按要点评分</button>' +
        '<button class="btn ghost sm" data-act="ivTogglePoints">手动改要点</button></div>' +
        '<div class="iv-points" id="ivPoints" style="display:none">' + chips + '</div>';
    }

    var m = iv.metrics || {};
    var parts = iv.parts || {};
    return head + '<div class="divider"></div>' +
      '<div class="grade iv-grade">' +
        '<div><div class="score-big">' + iv.score + '<small>/100</small></div>' +
        '<div class="lvl">命中 ' + iv.covered.length + ' / ' + q.points.length + ' 个要点 · 用时 ' + iv.used + ' 秒' + (m.est ? '（按字数估算）' : '') + '</div></div>' +
        '<div class="grade-rows">' +
          '<div class="gr"><span>要点覆盖</span><b>' + (parts.cov || 0) + '</b><i>/55</i></div>' +
          '<div class="gr"><span>结构</span><b>' + (parts.struct || 0) + '</b><i>/15</i></div>' +
          '<div class="gr"><span>表达</span><b>' + (parts.expr || 0) + '</b><i>/20</i></div>' +
          '<div class="gr"><span>时长</span><b>' + (parts.time || 0) + '</b><i>/10</i></div>' +
        '</div>' +
      '</div>' +
      '<div class="iv-stats">' +
        '<span>字数 <b>' + (m.chars || 0) + '</b></span>' +
        '<span>语速 <b>' + (m.spm || 0) + '</b> 字/分</span>' +
        '<span>口头语 <b>' + (m.fill || 0) + '</b> 次</span>' +
      '</div>' +
      '<div class="iv-points">' + chips + '</div>' +
      '<div class="iv-note">' + esc(iv.advice || '') + '</div>' +
      (iv.audioURL ? '<audio class="iv-audio" controls src="' + iv.audioURL + '"></audio>' : '') +
      '<details class="iv-details"><summary>看转写全文</summary><div class="iv-text">' + esc(iv.text || '（没有转写内容）') + '</div></details>' +
      '<div class="qbar"><button class="btn sm" data-act="ivSave">保存本次评分</button>' +
      '<button class="btn ghost sm" data-act="ivDraw">换一题</button></div>';
  }

  function ivStartTimer() {
    clearInterval(iv.t);
    iv.left = 300;
    var el = document.getElementById('ivTimer');
    if (el) { el.textContent = fmt(300); el.classList.remove('warn'); }
    iv.t = setInterval(function () {
      iv.left--;
      var e = document.getElementById('ivTimer');
      if (e) {
        e.textContent = fmt(Math.max(0, iv.left));
        e.classList.toggle('warn', iv.left <= 60);
      }
      if (iv.left <= 0) {
        clearInterval(iv.t); iv.t = null;
        toast('时间到，自动结束');
        ivStop();
      }
    }, 1000);
  }

  function ivStart() {
    if (!iv.q) { toast('先抽一道题'); return; }
    iv.err = ''; iv.text = ''; iv.covered = []; iv.audioURL = null;
    iv.metrics = null; iv.parts = null; iv.audioBlob = null;

    if (!ivCanRec()) {
      iv.mic = false;
      iv.phase = 'run';
      renderMianshi();
      ivErr('这个浏览器不支持录音，请直接用文字模式');
      ivStartTimer();
      return;
    }

    iv.mic = true;
    iv.t0 = Date.now();
    iv.phase = 'run';
    renderMianshi();
    ivStartTimer();

    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      iv.stream = stream;
      try {
        var mr = new MediaRecorder(stream);
        iv.mr = mr;
        iv.chunks = [];
        mr.ondataavailable = function (e) { if (e.data && e.data.size) iv.chunks.push(e.data); };
        mr.onstop = function () {
          var blob = null;
          try {
            blob = new Blob(iv.chunks, { type: (iv.chunks[0] && iv.chunks[0].type) || 'audio/webm' });
            if (iv.audioURL) URL.revokeObjectURL(iv.audioURL);
            iv.audioURL = URL.createObjectURL(blob);
            iv.audioBlob = blob;
          } catch (e) { }
          if (iv.phase === 'transcribing' && blob && blob.size > 1200) ivTranscribe(blob);
          else if (iv.phase === 'transcribing') {
            iv.phase = 'review';
            iv.err = '这段录音太短了，没东西可转，直接写几句吧';
            renderMianshi();
          }
        };
        mr.start();
      } catch (e) {
        iv.mic = false;
        ivErr('录音启动失败，请用文字模式');
      }
    }).catch(function (err) {
      iv.mic = false;
      ivErr((err && err.name === 'NotAllowedError')
        ? '麦克风权限被拒绝（地址栏可重新允许），也可以先用文字模式'
        : '拿不到麦克风，先用文字模式吧');
    });
  }

  function ivStop() {
    clearInterval(iv.t);
    iv.t = null;
    if (iv.stream) { iv.stream.getTracks().forEach(function (t) { t.stop(); }); iv.stream = null; }
    if (iv.phase !== 'run') return;
    iv.used = Math.max(1, Math.round((Date.now() - (iv.t0 || Date.now())) / 1000));
    if (iv.mic && iv.mr && iv.mr.state !== 'inactive') {
      try { iv.mr.stop(); } catch (e) { /* 忽略 */ }
    }
    if (!iv.mic) {
      var ta = document.getElementById('ivText');
      if (ta) iv.text = ta.value;
      if (!String(iv.text || '').trim()) { toast('还没写内容，先敲几句再评分'); return; }
      ivScore();
      return;
    }
    iv.phase = 'review';
    iv.err = '本浏览器不提供自动转写，请把刚才说的要点简要补在这里（也可只勾自评要点）';
    renderMianshi();
  }

  function ivTextMode() {
    iv.mic = false;
    iv.t0 = null;
    iv.err = '';
    iv.phase = 'run';
    iv.left = 300;
    renderMianshi();
    ivStartTimer();
  }

  function ivUsed(text) {
    var chars = (String(text).match(/[\u4e00-\u9fa5]/g) || []).length;
    var u;
    if (iv.mic && iv.t0) u = Math.round((Date.now() - iv.t0) / 1000);
    else u = Math.round(chars / 220 * 60);
    return Math.min(300, Math.max(chars ? 20 : 1, u));
  }

  function ivMetrics(text, used) {
    var chars = (String(text).match(/[\u4e00-\u9fa5]/g) || []).length;
    var spm = used > 0 ? Math.round(chars / used * 60) : 0;
    var fill = (String(text).match(/(嗯+|呃+|那个|然后呢|就是说|这个这个|啊这)/g) || []).length;
    var rate = chars ? fill / chars * 100 : 0;
    return { chars: chars, spm: spm, fill: fill, rate: Math.round(rate * 10) / 10 };
  }

  function ivMatch(text) {
    var plain = String(text).replace(/[^\u4e00-\u9fa5]/g, '');
    var hit = [];
    iv.q.points.forEach(function (p, i) {
      var core = p.replace(/[^\u4e00-\u9fa5]/g, '');
      if (!core) return;
      if (core.length <= 3) {
        if (plain.indexOf(core) >= 0) hit.push(i);
        return;
      }
      var total = 0, got = 0;
      for (var k = 0; k < core.length - 1; k++) {
        total++;
        if (plain.indexOf(core.substr(k, 2)) >= 0) got++;
      }
      if (total && got / total >= 0.5) hit.push(i);
    });
    return hit;
  }

  function ivScore() {
    if (!iv.q) return;
    var ta = document.getElementById('ivText');
    if (ta) iv.text = ta.value;
    iv.text = (iv.text || '').trim();
    if (!iv.text) { toast('还没有内容，先说一段或敲几句'); return; }

    var used = ivUsed(iv.text);
    iv.used = used;
    var m = ivMetrics(iv.text, used);
    m.est = !(iv.mic && iv.t0);
    iv.metrics = m;

    iv.covered = ivMatch(iv.text);

    var total = iv.q.points.length || 1;
    var cov = iv.covered.length / total;
    var sCov = Math.round(55 * cov);
    var order = /首先|其次|再次|最后|第一|第二|第三|一是|二是|其一|其二/.test(iv.text);
    var close = /落实|机制|长效|闭环|跟踪|评估|回访|总结|下一步/.test(iv.text);
    var sStruct = (order ? 8 : 0) + (close ? 7 : 0);
    var sExpr = 20;
    if (m.spm && (m.spm < 110 || m.spm > 340)) sExpr -= 4;
    if (m.rate > 3) sExpr -= 8;
    if (m.rate > 6) sExpr -= 6;
    sExpr = Math.max(0, sExpr);
    var sTime = used >= 180 ? 10 : used >= 120 ? 7 : used >= 60 ? 4 : 1;

    iv.parts = { cov: sCov, struct: sStruct, expr: sExpr, time: sTime };
    iv.score = Math.max(5, Math.min(100, sCov + sStruct + sExpr + sTime));
    iv.phase = 'scored';
    iv.advice = ivAdvice(iv.score, m, cov, order, close);
    renderMianshi();
  }

  function ivAdvice(score, m, cov, order, close) {
    var a = [];
    if (cov < 0.4) a.push('要点覆盖偏低，先把「表态—原因—对策」每层各说一句，别只讲一个角度。');
    else if (cov < 0.7) a.push('主干有了，漏掉的要点补一句就够，不要另起一段。');
    else a.push('要点基本齐了，接下来练表达的干净程度。');
    if (!order) a.push('没有明显的分条信号，加「第一…第二…最后」让考官听得出结构。');
    if (!close) a.push('结尾缺「落实/长效」这一层，收尾时补一句怎么盯到底。');
    if (m.spm && m.spm < 110) a.push('语速偏慢（' + m.spm + ' 字/分），考场上容易超时，练到 200 字/分左右。');
    if (m.spm > 340) a.push('语速偏快（' + m.spm + ' 字/分），显紧张，刻意在分条处停半秒。');
    if (m.rate > 3) a.push('口头语偏多（' + m.fill + ' 次），录音里听到「嗯、那个」就换成停顿。');
    if (m.chars < 150) a.push('内容偏短，只有 ' + m.chars + ' 字；结构化面试一题通常 400 字上下。');
    return a.slice(0, 3).join(' ');
  }

  function ivSave() {
    if (!iv.q) return;
    S.iv.unshift({
      id: iv.q.id, q: iv.q.q, type: iv.q.type, score: iv.score, used: iv.used,
      spm: (iv.metrics && iv.metrics.spm) || 0, chars: (iv.metrics && iv.metrics.chars) || 0,
      text: iv.text, t: Date.now()
    });
    S.iv = S.iv.slice(0, 30);
    addMinutes(18);
    save();
    iv.phase = 'idle';
    iv.covered = [];
    toast('已保存到练习记录');
    renderMianshi();
  }

  function ivTogglePoints() {
    var el = document.getElementById('ivPoints');
    if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
  }

  function renderMock() {
    if (window.MOCK) window.MOCK.kill();
    if (window.MOCK && window.MOCK.phase === 'run') window.MOCK.kill();
    mount(window.MOCK ? window.MOCK.render() : '<div class="card"><div class="empty">模拟考试模块未加载</div></div>');
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
        row('口语改写', (S.ks && S.ks.n ? S.ks.n : 0) + ' 句') +
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
  window.KG = { esc: esc, save: save, S: S, mount: mount, toast: toast, go: go };

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
        xc.picked = -1; xc.graded = false; noteOpen = false;
        renderXingce();
        break;
      case 'xcmod':
        xc.mod = t.getAttribute('data-m');
        xc.tag = null;
        xc.i = 0; xc.picked = -1; xc.graded = false;
        renderXingce();
        break;
      case 'xctag':
        xc.tag = t.getAttribute('data-t') || null;
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
      case 'xckind': {
        xc.kind = t.getAttribute('data-k') || 'all';
        xc.i = 0; xc.picked = -1; xc.graded = false;
        renderXingce();
        break;
      }
      case 'bankOpen':
        bankOpen = true; bankMsg = '';
        renderXingce();
        break;
      case 'bankClose':
        bankOpen = false; bankMsg = '';
        renderXingce();
        break;
      case 'bankParse': {
        var bsrc = (document.getElementById('bankSrc') || {}).value || '';
        var btxt = (document.getElementById('bankText') || {}).value || '';
        var res = parseBank(btxt, bsrc);
        if (!res.items.length) { bankMsg = res.err || '没解析到题目'; renderXingce(); break; }
        var arr = bankItems();
        var seen = {};
        D.questions.forEach(function (q) { seen[q.id] = 1; });
        arr.forEach(function (q) { seen[q.id] = 1; });
        var added = 0, dup = 0;
        res.items.forEach(function (q) {
          if (seen[q.id]) { dup++; return; }
          seen[q.id] = 1; arr.push(q); added++;
        });
        try { localStorage.setItem('kg-bank-v1', JSON.stringify(arr)); } catch (e) {
          bankMsg = '存不下了（本地空间不足），先删掉一些再试'; renderXingce(); break;
        }
        bankMsg = '解析 ' + res.items.length + ' 道，新增 ' + added + ' 道' + (dup ? '，跳过重复 ' + dup + ' 道' : '') + '。正在刷新…';
        renderXingce();
        setTimeout(function () { location.reload(); }, 900);
        break;
      }
      case 'bankReset': {
        if (!confirm('清空所有本地导入的题目？')) break;
        localStorage.removeItem('kg-bank-v1');
        bankMsg = '已清空，正在刷新…';
        renderXingce();
        setTimeout(function () { location.reload(); }, 700);
        break;
      }
      case 'noteToggle':
        noteOpen = !noteOpen;
        renderXingce();
        break;
      case 'noteSave': {
        var qn = xcList()[xc.i];
        if (!qn) break;
        var nv = ((document.getElementById('noteText') || {}).value || '').trim();
        if (nv) S.notes['q:' + qn.id] = nv; else delete S.notes['q:' + qn.id];
        save(); noteOpen = false; renderXingce(); toast('笔记已保存');
        break;
      }
      case 'noteDel': {
        var qd = xcList()[xc.i];
        if (qd) delete S.notes['q:' + qd.id];
        save(); noteOpen = false; renderXingce(); toast('笔记已删除');
        break;
      }
      case 'printWrong':
        printWrongBook();
        break;
      case 'newsExport':
        exportNews();
        break;
      case 'eNoteToggle':
        eNoteOpen = !eNoteOpen;
        renderShenlun();
        break;
      case 'eNoteSave': {
        var ev = ((document.getElementById('eNoteText') || {}).value || '').trim();
        if (ev) S.notes['e:' + es.id] = ev; else delete S.notes['e:' + es.id];
        save(); eNoteOpen = false; renderShenlun(); toast('笔记已保存');
        break;
      }
      case 'eNoteDel':
        delete S.notes['e:' + es.id];
        save(); eNoteOpen = false; renderShenlun(); toast('笔记已删除');
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
        xc.tag = qq.mod === '常识判断' ? qq.tag : null;
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
      case 'essayType': {
        var tt = t.getAttribute('data-t');
        var first = D.essays.filter(function (x) { return x.type === tt; })[0];
        if (first) { es.type = tt; es.id = first.id; es.result = null; es.text = ''; renderShenlun(); }
        break;
      }
      case 'essaySel': {
        es.id = t.getAttribute('data-id');
        var ce = D.essays.filter(function (x) { return x.id === es.id; })[0];
        if (ce) es.type = ce.type;
        es.result = null;
        es.text = '';
        renderShenlun();
        break;
      }
      case 'essayGrade':
        gradeEssay();
        break;
      case 'essaySample': {
        var e = curEssay();
        var box = document.getElementById('essayResult');
        box.innerHTML = sampleBoxHTML(e);
        break;
      }
      case 'essayLevel': {
        es.level = t.getAttribute('data-k');
        var e2 = curEssay();
        var box2 = document.getElementById('essayResult');
        if (box2) box2.innerHTML = sampleBoxHTML(e2);
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

      /* --- 口语规范化 --- */
      case 'ksLevel':
      case 'ksScene': {
        var v = t.getAttribute('data-v');
        if (act === 'ksLevel') ks.level = v; else ks.scene = v;
        renderKoushu();
        break;
      }
      case 'ksExample':
        ks.text = KEXAMPLES[+t.getAttribute('data-i')] || '';
        renderKoushu();
        break;
      case 'ksRun':
        ksRun();
        break;
      case 'ksClear':
        ks.text = ''; ks.out = null;
        renderKoushu();
        break;
      case 'ksCopy': {
        if (!ks.out) { toast('先生成一句'); break; }
        var txt = window.SL.toPlain ? window.SL.toPlain(ks.out.text, ks.out.marks) : ks.out.text;
        if (navigator.clipboard) navigator.clipboard.writeText(txt);
        toast('已复制');
        break;
      }
      case 'ksFav': {
        if (!ks.out) { toast('先生成一句'); break; }
        var ft = window.SL.toPlain ? window.SL.toPlain(ks.out.text, ks.out.marks) : ks.out.text;
        S.ksFav = S.ksFav || [];
        if (S.ksFav.indexOf(ft) >= 0) { toast('已经收藏过这句'); break; }
        S.ksFav.unshift(ft);
        S.ksFav = S.ksFav.slice(0, 50);
        save();
        renderKoushu();
        toast('已收进「我的句子」');
        break;
      }
      case 'ksCat':
        ks.cat = t.getAttribute('data-v');
        renderKoushu();
        break;
      case 'ksPat': {
        var pl = ksPatterns().filter(function (p) { return p.cat === ks.cat; });
        var pat = pl[+t.getAttribute('data-i')];
        if (!pat) break;
        if (navigator.clipboard) navigator.clipboard.writeText(pat.text);
        toast('句式已复制');
        break;
      }
      case 'ksHist': {
        var hh = (S.ksHist || [])[+t.getAttribute('data-i')];
        if (!hh) break;
        ks.text = hh.src;
        ks.level = hh.level || 'standard';
        renderKoushu();
        toast('已放回左边，可改完再转');
        break;
      }
      case 'ksHistClear':
        S.ksHist = [];
        save();
        renderKoushu();
        break;
      case 'ksFavDel': {
        var fi = +t.getAttribute('data-i');
        S.ksFav.splice(fi, 1);
        save();
        renderKoushu();
        break;
      }
      case 'ksFavCopy': {
        var s2 = (S.ksFav || [])[+t.getAttribute('data-i')];
        if (s2 && navigator.clipboard) navigator.clipboard.writeText(s2);
        toast('已复制');
        break;
      }

      /* --- 时政 --- */
      case 'ncat':
        nz.cat = t.getAttribute('data-c');
        nz.limit = 36;
        renderShizheng();
        break;
      case 'nmore':
        nz.limit += 36;
        renderShizheng();
        break;
      case 'nsave': {
        var nidx = +t.getAttribute('data-i');
        var nkey = t.getAttribute('data-k') || (D.news[nidx] && (D.news[nidx].url || D.news[nidx].title));
        var at = S.saved.indexOf(nkey);
        if (at >= 0) { S.saved.splice(at, 1); toast('已取消收藏'); }
        else { S.saved.push(nkey); toast('已收藏'); }
        save();
        renderShizheng();
        break;
      }
      case 'ncopy': {
        var ni = D.news[+t.getAttribute('data-i')];
        var txt = ni.title + '。' + ni.body + '（可用角度：' + ni.angle + '）' + (ni.src ? '（来源：' + ni.src + '）' : '');
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
        iv.text = ''; iv.metrics = null; iv.parts = null; iv.advice = '';
        iv.audioURL = null; iv.audioBlob = null; iv.err = ''; iv.mic = false; iv.score = 0; iv.used = 0;
        renderMianshi();
        break;
      }
      case 'ivStart':
        ivStart();
        break;
      case 'ivStop':
        ivStop();
        break;
      case 'ivTextMode':
        ivTextMode();
        break;
      case 'ivScore':
        ivScore();
        break;
      case 'ivTogglePoints':
        ivTogglePoints();
        break;
      case 'ivPoint': {
        var pi = +t.getAttribute('data-i');
        var at2 = iv.covered.indexOf(pi);
        if (at2 >= 0) iv.covered.splice(at2, 1);
        else iv.covered.push(pi);
        renderMianshi();
        break;
      }
      case 'ivSave':
        ivSave();
        break;

      /* --- 词库 --- */
      case 'ciTab':
        ci.tab = t.getAttribute('data-t');
        ci.q = '';
        renderCiku();
        break;
      case 'ciGo':
        xc.tab = 'practice';
        xc.mod = '常识判断';
        xc.tag = t.getAttribute('data-t');
        xc.i = 0; xc.picked = -1; xc.graded = false;
        gotoView('xingce');
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

  /* 词库搜索输入（就地刷新，不丢焦点） */
  document.getElementById('view').addEventListener('input', function (ev) {
    var t = ev.target.closest('[data-act="ciq"]');
    if (!t) return;
    ci.q = t.value;
    var holder = document.getElementById('ciHolder');
    if (holder) holder.innerHTML = ciListHTML();
  });

  /* ============================================================
     全局搜索
     ============================================================ */
  var gs = { q: '' };

  function gsWords() {
    return (gs.q || '').trim().split(/\s+/).filter(function (w) { return w; });
  }

  function gsMatch() {
    var ws = gsWords();
    return function (hay) {
      return ws.every(function (w) { return hay.indexOf(w) >= 0; });
    };
  }

  function gsHl(s) {
    var ws = gsWords();
    if (!ws.length) return esc(s);
    var re = new RegExp(ws.map(function (w) {
      return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|'), 'gi');
    return esc(s).replace(re, function (m) { return '<em>' + m + '</em>'; });
  }

  function gsRow(ty, id, kind, title, desc) {
    return '<div class="gs-row" data-act="gsGo" data-t="' + ty + '" data-id="' + esc(id) + '">' +
      '<span class="k">' + esc(kind) + '</span>' +
      '<span class="t">' + gsHl(title) + '</span>' +
      '<span class="d">' + esc(desc || '') + '</span></div>';
  }

  function gsGroup(name, rows) {
    return rows.length ? '<div class="gs-group"><div class="gs-gt">' + name + '</div>' + rows.join('') + '</div>' : '';
  }

  function gsRun() {
    var body = document.getElementById('gsBody');
    var inp = document.getElementById('gsInput');
    if (!body || !inp) return;
    gs.q = inp.value;
    if (!gsWords().length) {
      body.innerHTML = '<div class="gs-empty">输入关键词，全局搜：行测题目 · 申论题 · 时政素材 · 申论规范词 · 成语 · 实词。</div>';
      return;
    }
    var m = gsMatch();
    var html = '';

    var qs = D.questions.filter(function (x) {
      return x.opts && x.opts.length >= 2 && m((x.mod || '') + ' ' + (x.tag || '') + ' ' + (x.stem || ''));
    }).slice(0, 8);
    html += gsGroup('行测题目', qs.map(function (x) {
      return gsRow('q', x.id, x.mod + ' · ' + (x.tag || ''), x.stem, '');
    }));

    var els = D.essays.filter(function (x) {
      return m((x.type || '') + ' ' + (x.title || '') + ' ' + (x.q || '') + ' ' + (x.ask || ''));
    }).slice(0, 5);
    html += gsGroup('申论题', els.map(function (x) {
      return gsRow('e', x.id, x.type, x.title || x.q, '');
    }));

    var ns = D.news.filter(function (x) {
      return m((x.cat || '') + ' ' + (x.title || '') + ' ' + (x.body || '') + ' ' + (x.src || ''));
    }).slice(0, 5);
    html += gsGroup('时政素材', ns.map(function (x) {
      return gsRow('n', x.title, x.cat, x.title, x.body.slice(0, 28));
    }));

    var nms = GV.norms.filter(function (x) { return m(x[0] + ' ' + x[1]); }).slice(0, 6);
    html += gsGroup('申论规范词', nms.map(function (x) {
      return gsRow('norm', x[0], '规范词', x[0], x[1]);
    }));

    var ids = GV.idioms.filter(function (x) { return m(x[0] + ' ' + x[1]); }).slice(0, 6);
    html += gsGroup('成语', ids.map(function (x) {
      return gsRow('idiom', x[0], '成语', x[0], x[1]);
    }));

    var wds = GV.words.filter(function (x) { return m(x[0] + ' ' + x[1] + ' ' + x[2]); }).slice(0, 6);
    html += gsGroup('实词辨析', wds.map(function (x) {
      return gsRow('word', x[0] + '|' + x[1], '实词', x[0] + ' / ' + x[1], x[2]);
    }));

    body.innerHTML = html || '<div class="gs-empty">没有找到与「' + esc(gs.q) + '」相关的内容，换个关键词试试。</div>';
  }

  function openSearch() {
    var ov = document.getElementById('gsOverlay');
    if (!ov) return;
    ov.classList.add('on');
    var inp = document.getElementById('gsInput');
    inp.value = '';
    gs.q = '';
    gsRun();
    setTimeout(function () { inp.focus(); }, 30);
  }

  function closeSearch() {
    var ov = document.getElementById('gsOverlay');
    if (ov) ov.classList.remove('on');
  }

  function gotoView(v) {
    if ((location.hash || '#').slice(1) === v) go(v);
    else location.hash = '#' + v;
  }

  function gsGoTo(t) {
    var ty = t.getAttribute('data-t');
    var id = t.getAttribute('data-id');
    closeSearch();
    if (ty === 'q') {
      var qq = D.questions.filter(function (x) { return x.id === id; })[0];
      if (!qq) return;
      xc.tab = 'practice';
      xc.mod = qq.mod;
      xc.tag = qq.mod === '常识判断' ? qq.tag : null;
      xc.i = Math.max(0, xcList().indexOf(qq));
      xc.picked = -1; xc.graded = false;
      gotoView('xingce');
    } else if (ty === 'e') {
      var ee = D.essays.filter(function (x) { return x.id === id; })[0];
      if (!ee) return;
      es.id = ee.id;
      es.type = ee.type;
      es.result = null;
      es.text = '';
      gotoView('shenlun');
    } else if (ty === 'n') {
      nz.q = id; nz.cat = '全部'; nz.limit = 36;
      gotoView('shizheng');
    } else if (ty === 'norm') {
      ci.tab = 'norms'; ci.q = id;
      gotoView('ciku');
    } else if (ty === 'idiom') {
      ci.tab = 'idioms'; ci.q = id;
      gotoView('ciku');
    } else if (ty === 'word') {
      ci.tab = 'words'; ci.q = id.split('|')[0];
      gotoView('ciku');
    }
  }

  (function wireSearch() {
    var sb = document.getElementById('searchBtn');
    var ov = document.getElementById('gsOverlay');
    if (!sb || !ov) return;
    sb.addEventListener('click', openSearch);
    document.getElementById('gsClose').addEventListener('click', closeSearch);
    ov.addEventListener('click', function (ev) { if (ev.target === ov) closeSearch(); });
    document.getElementById('gsInput').addEventListener('input', gsRun);
    document.getElementById('gsBody').addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-act="gsGo"]');
      if (!t) return;
      gsGoTo(t);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeSearch();
    });
  })();

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

  /* 深浅色主题 */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.theme === 'dark' ? 'dark' : 'light');
    var b = document.getElementById('themeBtn');
    if (b) b.title = S.theme === 'dark' ? '切换浅色模式' : '切换深色模式';
  }
  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      S.theme = S.theme === 'dark' ? 'light' : 'dark';
      save();
      applyTheme();
    });
  }
  applyTheme();

  /* 启动 */
  (function boot() {
    var v = (location.hash || '#today').slice(1);
    if (!ROUTES[v]) v = 'today';
    go(v);
  })();

})();
