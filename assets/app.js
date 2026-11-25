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
