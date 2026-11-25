/* 考公学习系统 — 页面交互 */
(function () {
  'use strict';

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 导航：滚动变实 / 下拉 / 移动端菜单 ---------- */
  var nav = document.getElementById('nav');
  var onScrollNav = function () {
    nav.classList.toggle('is-stuck', window.scrollY > 8);
  };
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  document.querySelectorAll('.nav-item[data-menu]').forEach(function (item) {
    var btn = item.querySelector('button');
    var closeTimer;

    function open() {
      clearTimeout(closeTimer);
      document.querySelectorAll('.nav-item.is-open').forEach(function (o) {
        if (o !== item) o.classList.remove('is-open');
      });
      item.classList.add('is-open');
    }
    function close(delay) {
      closeTimer = setTimeout(function () { item.classList.remove('is-open'); }, delay || 0);
    }

    item.addEventListener('mouseenter', open);
    item.addEventListener('mouseleave', function () { close(140); });
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      item.classList.contains('is-open') ? item.classList.remove('is-open') : open();
    });
    item.querySelectorAll('.menu a').forEach(function (a) {
      a.addEventListener('click', function () { item.classList.remove('is-open'); });
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-item')) {
      document.querySelectorAll('.nav-item.is-open').forEach(function (o) { o.classList.remove('is-open'); });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.nav-item.is-open').forEach(function (o) { o.classList.remove('is-open'); });
      closeMenu();
    }
  });

  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');
  function closeMenu() {
    nav.classList.remove('is-open');
    mobileMenu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    mobileMenu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });

  /* ---------- 2. 滚动进入动画 ---------- */
  var revealEls = [].slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });

    // 兜底：首屏内已经可见的元素立即显示，避免滚动前出现空白
    requestAnimationFrame(function () {
      revealEls.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.95) el.classList.add('in');
      });
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 3. 视差 ---------- */
  var pxEls = [].slice.call(document.querySelectorAll('[data-parallax]'));
  if (pxEls.length && !reduceMotion) {
    var ticking = false;
    function frame() {
      var vh = window.innerHeight;
      pxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.dataset.parallax) || 0;
        var offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)' +
          (el.classList.contains('win') ? ' rotateX(3deg)' : '');
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  }

  /* ---------- 4. 时政跑马灯：复制一份实现无缝 ---------- */
  var track = document.getElementById('marqueeTrack');
  if (track) {
    track.innerHTML += track.innerHTML;
  }

  /* ---------- 5. 申论口语规范化（复用 engine.js） ---------- */
  var ta = document.getElementById('slIn');
  var out = document.getElementById('slOut');
  var marksBox = document.getElementById('slMarks');
  var goBtn = document.getElementById('slGo');
  var levelSeg = document.getElementById('slLevel');
  var level = 'standard';

  function render() {
    if (typeof window.SL === 'undefined') return;
    var src = (ta.value || '').trim();
    if (!src) {
      out.innerHTML = '<span class="placeholder">先写一句大白话，再点转换。</span>';
      marksBox.innerHTML = '';
      return;
    }
    var r = window.SL.convert(src, { level: level });
    out.innerHTML = window.SL.toHTML(r.text, r.marks);

    var seen = {};
    var chips = [];
    (r.marks || []).forEach(function (m) {
      if (!m.from || !m.to || m.from === m.to) return;
      var key = m.from + '>' + m.to;
      if (seen[key]) return;
      seen[key] = 1;
      chips.push('<em><b>' + m.from + '</b> → ' + m.to + '</em>');
    });
    marksBox.innerHTML = chips.slice(0, 8).join('');
  }

  if (ta && window.SL) {
    levelSeg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      level = b.dataset.l;
      [].forEach.call(levelSeg.children, function (x) { x.classList.toggle('on', x === b); });
      render();
    });
    goBtn.addEventListener('click', render);
    var liveTimer;
    ta.addEventListener('input', function () {
      clearTimeout(liveTimer);
      liveTimer = setTimeout(render, 260);
    });
    ta.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); render(); }
    });
    document.querySelectorAll('.chip-sm').forEach(function (c) {
      c.addEventListener('click', function () {
        ta.value = c.dataset.s;
        render();
      });
    });
    render();
  }
})();


/* ---------- 首屏「今日」窗口：真实日期 + 今日高亮 + 点任务联动完成度 ---------- */
(function () {
  var win = document.querySelector('.win');
  if (!win) return;

  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  var d = new Date();
  var hd = win.querySelector('#winDate');
  if (hd) hd.textContent = (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + WD[d.getDay()];

  var chart = win.querySelector('#heroChart');
  if (chart) {
    var today = d.getDay() || 7;
    [].forEach.call(chart.children, function (c, i) { c.classList.toggle('hot', i + 1 === today); });
  }

  var ring = win.querySelector('.ring');
  var ringB = ring && ring.querySelector('b');
  var tasks = [].slice.call(win.querySelectorAll('.task'));
  var orig = tasks.map(function (t) { return t.querySelector('.n').textContent.trim(); });

  function frac(txt) {
    var m = /^(\d+)\s*\/\s*(\d+)$/.exec(txt);
    return m ? [Number(m[1]), Number(m[2])] : null;
  }

  function draw() {
    var sum = 0;
    tasks.forEach(function (t, i) {
      var f = frac(orig[i]);
      var p = t.classList.contains('done') ? 100 : (f && f[1] ? Math.round(f[0] / f[1] * 100) : 100);
      var bar = t.querySelector('.bar i');
      if (bar) bar.style.width = p + '%';
      var nEl = t.querySelector('.n');
      if (nEl) nEl.textContent = p === 100 && f ? f[1] + '/' + f[1] : orig[i];
      sum += p;
    });
    var pct = tasks.length ? Math.round(sum / tasks.length) : 0;
    if (ring) ring.style.setProperty('--p', pct);
    if (ringB) ringB.innerHTML = pct + '<span>%</span>';
  }

  tasks.forEach(function (t) {
    t.addEventListener('click', function () {
      t.classList.toggle('done');
      draw();
    });
  });
  draw();
})();


/* ---------- 滚动进度 / 章节导航 / 回到顶部 ---------- */
(function () {
  function init() {
  var sp = document.querySelector('#sp i');
  var rail = document.getElementById('dotnav');
  var top = document.getElementById('toTop');
  var links = rail ? [].slice.call(rail.querySelectorAll('a')) : [];
  var secs = links.map(function (a) { return document.getElementById(a.dataset.sec); });

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (sp) sp.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
    if (top) top.classList.toggle('on', y > 520);

    var line = y + window.innerHeight * 0.34;
    var active = -1;
    secs.forEach(function (s, i) {
      if (s && s.offsetTop <= line) active = i;
    });
    links.forEach(function (a, i) { a.classList.toggle('on', i === active); });
  }

  var tick = false;
  window.addEventListener('scroll', function () {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { tick = false; onScroll(); });
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (top) {
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* ---------- 30 秒小测评 ---------- */
(function () {
  var box = document.querySelector('#quiz');
  if (!box) return;
  var cards = [].slice.call(box.querySelectorAll('.quiz-card'));
  var out = box.querySelector('#quizOut');
  var ans = {};

  function render() {
    var pri = {
      xc: ['行测', '先补判断推理和资料分析：这两块提分最快，也最容易被「做得慢」拖住总分。'],
      sl: ['申论', '先补申论：你缺的不是观点，是「把话写成规范表述」这一步，先用口语规范化工具改 20 句找手感。'],
      ms: ['面试', '先补面试：开口比背模板重要，每天 2 题计时作答，说完自己回听一遍。'],
      jh: ['计划', '先补计划：你多半是「按理想的一天排」，改成每天 90 分钟硬指标，没完成自动顺延。']
    }[ans[1]] || ['行测', ''];

    var score = {
      low: '基础还没打牢：每天 40 题，先言语和判断，错题当天归因，一周只练两个模块。',
      mid: '到了瓶颈期：每天 50–60 题，错题当天归因，每周一次 40 题限时，专练资料分析。',
      high: '分数够了，缺速度：主打限时套练，资料分析一题不超过 90 秒，数量关系挑会做的做。',
      none: '先摸底：去做一次 20 题小测，系统按结果给你排，比拍脑袋定计划准。'
    }[ans[2]] || '';

    var time = {
      near: '3 个月内：两周一次整套限时，其余时间全给短板，别再平均用力。',
      half: '3–6 个月：前两个月补短板，第三个月开始整套限时，一周一套。',
      far: '6 个月以上：先把五模块过一遍，再谈提速，别急着刷套卷。',
      undecided: '还没定岗：先按国考地市级练（最通用），定岗后只换真题卷不换练法。'
    }[ans[3]] || '';

    out.hidden = false;
    out.innerHTML =
      '<h5>你的起手配比</h5>' +
      '<p class="qr-line"><b>先补：</b><em>' + pri[0] + '</em>　' + pri[1] + '</p>' +
      '<p class="qr-line"><b>行测节奏：</b>' + score + '</p>' +
      '<p class="qr-line"><b>时间安排：</b>' + time + '</p>' +
      '<div class="pill-row">' +
        '<a class="pill pill--blue" href="app.html#today">按这个配比开始</a>' +
        '<button class="qr-again" type="button">重新测</button>' +
      '</div>';
    out.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var again = out.querySelector('.qr-again');
    if (again) again.addEventListener('click', reset);
  }

  function reset() {
    ans = {};
    [].forEach.call(box.querySelectorAll('.quiz-opts button'), function (b) { b.classList.remove('on'); });
    out.hidden = true;
    out.innerHTML = '';
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  cards.forEach(function (card, i) {
    card.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !card.contains(b)) return;
      [].forEach.call(card.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
      ans[i + 1] = b.dataset.v;
      if (ans[1] && ans[2] && ans[3]) render();
    });
  });
})();
