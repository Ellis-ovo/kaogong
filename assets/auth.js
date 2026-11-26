/* =============================================================
   考公学习系统 · 账号（本地账号，数据按用户隔离）
   - 账号存在 localStorage: kg-users-v1
   - 会话存在 localStorage: kg-session-v1
   - 密码用 PBKDF2-SHA256（12 万次）加盐派生，只存盐和派生值
   - 数据键：kg-app-v1:u:<userId>（游客仍是 kg-app-v1）
   - 必须在 system.js 之前加载：它设置 window.KG_KEY
   ============================================================= */
(function () {
  'use strict';

  var USERS_KEY = 'kg-users-v1';
  var SESSION_KEY = 'kg-session-v1';
  var SKIP_KEY = 'kg-auth-skip';
  var GUEST_DATA = 'kg-app-v1';

  function readJSON(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; }
  }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function users() { var a = readJSON(USERS_KEY, []); return Array.isArray(a) ? a : []; }
  function saveUsers(a) { writeJSON(USERS_KEY, a); }

  function session() {
    var s = readJSON(SESSION_KEY, null);
    if (!s || !s.id) return null;
    var u = users().filter(function (x) { return x.id === s.id; })[0];
    return u || null;
  }

  /* ---------------- 口令哈希 ---------------- */
  function toHex(buf) {
    var b = new Uint8Array(buf), out = '';
    for (var i = 0; i < b.length; i++) out += ('0' + b[i].toString(16)).slice(-2);
    return out;
  }
  function fallbackHash(s) {           // crypto.subtle 不可用时的兜底（弱，仅防明文）
    var h1 = 0x811c9dc5, h2 = 0x1000193;
    for (var r = 0; r < 20000; r++) {
      for (var i = 0; i < s.length; i++) {
        h1 ^= s.charCodeAt(i); h1 = (h1 * 16777619) >>> 0;
        h2 = ((h2 << 5) - h2 + s.charCodeAt(i) + r) >>> 0;
      }
    }
    return 'fb' + h1.toString(16) + h2.toString(16);
  }
  function hash(pw, salt) {
    var sub = window.crypto && window.crypto.subtle;
    if (!sub) return Promise.resolve(fallbackHash(salt + '|' + pw));
    var enc = new TextEncoder();
    return sub.importKey('raw', enc.encode(pw), { name: 'PBKDF2' }, false, ['deriveBits'])
      .then(function (k) {
        return sub.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, k, 256);
      })
      .then(toHex)
      .catch(function () { return fallbackHash(salt + '|' + pw); });
  }
  function salt() {
    var a = new Uint8Array(12);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256);
    return toHex(a);
  }
  function uid() { return 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }

  /* ---------------- 数据键 ---------------- */
  function dataKey(u) { return u ? GUEST_DATA + ':u:' + u.id : GUEST_DATA; }

  var cur = session();
  window.KG_KEY = dataKey(cur);
  window.KG_USER = cur;

  /* ---------------- 注册 / 登录 ---------------- */
  function normEmail(s) { return (s || '').trim().toLowerCase(); }

  function register(d) {
    var name = (d.name || '').trim(), email = normEmail(d.email), pw = d.pw || '';
    if (name.length < 2 || name.length > 12) return Promise.reject('昵称要 2–12 个字');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.reject('邮箱格式不对');
    if (pw.length < 6) return Promise.reject('密码至少 6 位');
    var list = users();
    if (list.some(function (u) { return u.email === email; })) return Promise.reject('这个邮箱已经注册过了');
    if (list.some(function (u) { return u.name === name; })) return Promise.reject('这个昵称已经被占用');
    var s = salt();
    return hash(pw, s).then(function (h) {
      var u = { id: uid(), name: name, email: email, salt: s, hash: h, created: Date.now() };
      list.push(u); saveUsers(list);
      // 游客期间练过的数据搬过来，别丢
      try {
        var g = localStorage.getItem(GUEST_DATA);
        if (g && !localStorage.getItem(dataKey(u))) localStorage.setItem(dataKey(u), g);
      } catch (e) {}
      writeJSON(SESSION_KEY, { id: u.id, at: Date.now() });
      try { localStorage.removeItem(SKIP_KEY); } catch (e) {}
      return u;
    });
  }

  function login(email, pw) {
    email = normEmail(email);
    var u = users().filter(function (x) { return x.email === email; })[0];
    if (!u) return Promise.reject('没有这个邮箱，先注册一个');
    return hash(pw || '', u.salt).then(function (h) {
      if (h !== u.hash) throw '密码不对';
      writeJSON(SESSION_KEY, { id: u.id, at: Date.now() });
      try { localStorage.removeItem(SKIP_KEY); } catch (e) {}
      return u;
    });
  }

  function logout() {
    try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(SKIP_KEY); } catch (e) {}
  }

  /* ---------------- 界面 ---------------- */
  var CSS = [
    '.au-mask{position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;',
    'background:rgba(12,14,18,.42);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .22s}',
    '.au-mask.on{opacity:1;pointer-events:auto}',
    '.au-card{width:min(392px,calc(100vw - 40px));background:#fff;border-radius:18px;padding:26px 26px 20px;',
    'box-shadow:0 30px 70px -28px rgba(0,0,0,.55);transform:translateY(10px) scale(.985);transition:transform .24s}',
    '.au-mask.on .au-card{transform:none}',
    '.au-logo{width:34px;height:34px;border-radius:9px;background:#111114;color:#fff;display:grid;place-items:center;',
    'font-size:13px;font-weight:600;letter-spacing:.02em;margin-bottom:14px}',
    '.au-h{font-size:19px;font-weight:600;letter-spacing:-.01em;margin:0 0 4px}',
    '.au-p{font-size:12.5px;color:#8a8f99;margin:0 0 18px;line-height:1.6}',
    '.au-tabs{display:flex;gap:4px;background:#f1f2f5;border-radius:10px;padding:3px;margin-bottom:18px}',
    '.au-tabs button{flex:1;border:0;background:transparent;border-radius:8px;padding:7px 0;font:inherit;font-size:13px;',
    'color:#6b7079;cursor:pointer;transition:.15s}',
    '.au-tabs button.on{background:#fff;color:#151922;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.1)}',
    '.au-f{margin-bottom:12px}',
    '.au-f label{display:block;font-size:11.5px;color:#8a8f99;margin-bottom:5px;letter-spacing:.02em}',
    '.au-f input{width:100%;box-sizing:border-box;border:1px solid #dfe2e8;border-radius:10px;padding:10px 12px;',
    'font:inherit;font-size:14px;background:#fff;color:#151922;transition:.15s}',
    '.au-f input:focus{outline:0;border-color:#1a73e8;box-shadow:0 0 0 4px rgba(26,115,232,.13)}',
    '.au-err{min-height:18px;font-size:12px;color:#c0392b;margin:2px 0 8px;line-height:1.5}',
    '.au-btn{width:100%;border:0;border-radius:11px;padding:11px 0;font:inherit;font-size:14px;font-weight:600;',
    'background:#111114;color:#fff;cursor:pointer;transition:transform .12s}',
    '.au-btn:active{transform:scale(.985)}',
    '.au-btn[disabled]{opacity:.55;cursor:default}',
    '.au-guest{width:100%;border:0;background:transparent;color:#6b7079;font:inherit;font-size:12.5px;',
    'padding:11px 0 2px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}',
    '.au-tip{font-size:11px;color:#9aa1ab;line-height:1.65;margin:14px 0 0;padding-top:13px;border-top:1px solid #eef0f3}',
    '.ub{position:relative}',
    '.ub-dot{position:absolute;right:-1px;top:-1px;width:7px;height:7px;border-radius:50%;background:#2bb673;',
    'border:2px solid #fff}',
    '.au-menu{position:absolute;right:0;top:calc(100% + 8px);width:206px;background:#fff;border-radius:13px;',
    'padding:6px;box-shadow:0 22px 50px -22px rgba(0,0,0,.45);border:1px solid #eceef2;display:none;z-index:60}',
    '.au-menu.on{display:block}',
    '.au-me{padding:9px 10px 11px;border-bottom:1px solid #f1f2f5;margin-bottom:5px}',
    '.au-me b{display:block;font-size:13.5px;font-weight:600;color:#151922}',
    '.au-me span{display:block;font-size:11px;color:#9aa1ab;margin-top:2px;overflow:hidden;text-overflow:ellipsis}',
    '.au-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;border-radius:8px;',
    'padding:8px 10px;font:inherit;font-size:12.5px;color:#3b3f47;cursor:pointer}',
    '.au-menu button:hover{background:#f5f6f8}',
    'html[data-theme="dark"] .au-card{background:#171a20;box-shadow:0 30px 70px -28px rgba(0,0,0,.8)}',
    'html[data-theme="dark"] .au-h{color:#e7e9ee}',
    'html[data-theme="dark"] .au-tabs{background:#22262e}',
    'html[data-theme="dark"] .au-tabs button.on{background:#2e333c;color:#f0f2f6;box-shadow:none}',
    'html[data-theme="dark"] .au-f input{background:#101216;border-color:#2e333c;color:#e7e9ee}',
    'html[data-theme="dark"] .au-tip{border-top-color:#262b33;color:#7b8290}',
    'html[data-theme="dark"] .au-menu{background:#171a20;border-color:#262b33}',
    'html[data-theme="dark"] .au-me b{color:#e7e9ee}',
    'html[data-theme="dark"] .au-menu button{color:#c9ced8}',
    'html[data-theme="dark"] .au-menu button:hover{background:#22262e}',
    'html[data-theme="dark"] .ub-dot{border-color:#171a20}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('au-css')) return;
    var st = document.createElement('style');
    st.id = 'au-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  var mode = 'login';
  var mask, errEl, btnEl, nameWrap;
  var onDone = null;

  function html() {
    return '<div class="au-mask" id="auMask"><div class="au-card" role="dialog" aria-modal="true">' +
      '<div class="au-logo">考</div>' +
      '<h2 class="au-h" id="auTitle">登录</h2>' +
      '<p class="au-p" id="auSub">进度、错题、笔记都跟账号走，换台电脑登录还在。</p>' +
      '<div class="au-tabs"><button data-m="login" class="on">登录</button><button data-m="reg">注册</button></div>' +
      '<div class="au-f" id="auNameWrap" style="display:none"><label>昵称</label>' +
      '<input id="auName" maxlength="12" placeholder="2–12 个字，会显示在左上角"></div>' +
      '<div class="au-f"><label>邮箱</label><input id="auEmail" type="email" autocomplete="username" placeholder="you@example.com"></div>' +
      '<div class="au-f"><label>密码</label><input id="auPw" type="password" autocomplete="current-password" placeholder="至少 6 位"></div>' +
      '<div class="au-err" id="auErr"></div>' +
      '<button class="au-btn" id="auGo">登录</button>' +
      '<button class="au-guest" id="auGuest">先以游客身份进入</button>' +
      '<p class="au-tip">账号和进度只存在这台电脑的浏览器里（localStorage），不上传服务器。清缓存或用别的设备就看不到，重要笔记记得导出。</p>' +
      '</div></div>';
  }

  function setMode(m) {
    mode = m;
    var tabs = mask.querySelectorAll('.au-tabs button');
    for (var i = 0; i < tabs.length; i++) tabs[i].className = tabs[i].getAttribute('data-m') === m ? 'on' : '';
    document.getElementById('auTitle').textContent = m === 'reg' ? '注册' : '登录';
    document.getElementById('auSub').textContent = m === 'reg'
      ? '注册后进度、错题、笔记都归到这个账号下。'
      : '进度、错题、笔记都跟账号走，换台电脑登录还在。';
    document.getElementById('auGo').textContent = m === 'reg' ? '注册并开始' : '登录';
    nameWrap.style.display = m === 'reg' ? '' : 'none';
    errEl.textContent = '';
  }

  function show(m, cb) {
    injectCSS();
    if (!mask) {
      var box = document.createElement('div');
      box.innerHTML = html();
      mask = box.firstChild;
      document.body.appendChild(mask);
      errEl = document.getElementById('auErr');
      btnEl = document.getElementById('auGo');
      nameWrap = document.getElementById('auNameWrap');

      var tabs = mask.querySelectorAll('.au-tabs button');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function () { setMode(this.getAttribute('data-m')); });
      }
      btnEl.addEventListener('click', submit);
      document.getElementById('auGuest').addEventListener('click', function () {
        try { localStorage.setItem(SKIP_KEY, '1'); } catch (e) {}
        hide();
      });
      mask.addEventListener('click', function (e) { if (e.target === mask && mask.dataset.force !== '1') hide(); });
      var ins = mask.querySelectorAll('input');
      for (var j = 0; j < ins.length; j++) {
        ins[j].addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      }
    }
    onDone = cb || null;
    setMode(m || 'login');
    mask.classList.add('on');
    setTimeout(function () { document.getElementById(mode === 'reg' ? 'auName' : 'auEmail').focus(); }, 260);
  }

  function hide() {
    if (mask) mask.classList.remove('on');
  }

  function submit() {
    errEl.textContent = '';
    btnEl.disabled = true;
    var p = mode === 'reg'
      ? register({ name: document.getElementById('auName').value, email: document.getElementById('auEmail').value, pw: document.getElementById('auPw').value })
      : login(document.getElementById('auEmail').value, document.getElementById('auPw').value);
    p.then(function () {
      btnEl.disabled = false;
      hide();
      if (onDone) onDone();
      else location.reload();
    }).catch(function (msg) {
      btnEl.disabled = false;
      errEl.textContent = typeof msg === 'string' ? msg : '出错了，重试一次';
    });
  }

  /* ---------------- 数据导出 / 导入 ---------------- */
  function toast(msg) {
    if (window.KG && window.KG.toast) return window.KG.toast(msg);
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#151922;color:#fff;' +
      'font-size:13px;padding:9px 16px;border-radius:9px;z-index:9500;opacity:0;transition:opacity .2s';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 260); }, 2200);
  }

  function exportData(u) {
    if (!u) return;
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(dataKey(u)) || 'null'); } catch (e) { raw = null; }
    if (!raw) return toast('还没有数据可导出');
    var pack = {
      app: 'kaogong', version: 1,
      user: { name: u.name, email: u.email },
      exportedAt: new Date().toISOString(),
      state: raw
    };
    var blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    var d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = '考公进度-' + u.name + '-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('已导出，换设备时用「导入数据」恢复');
  }

  function importData() {
    var u = session();
    if (!u) return toast('先登录再导入');
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return inp.remove();
      var fr = new FileReader();
      fr.onload = function () {
        var pack = null;
        try { pack = JSON.parse(String(fr.result)); } catch (e) {}
        var state = pack && pack.state && typeof pack.state === 'object' ? pack.state : null;
        if (!state) { toast('这个文件读不出来，要导出的那个 json'); inp.remove(); return; }
        var from = pack.user && pack.user.name ? '（来自 ' + pack.user.name + '）' : '';
        if (!window.confirm('导入会覆盖当前账号在这台电脑上的全部进度' + from + '，继续？')) { inp.remove(); return; }
        try { localStorage.setItem(dataKey(u), JSON.stringify(state)); } catch (e) { toast('写入失败，可能空间不够'); inp.remove(); return; }
        inp.remove();
        location.reload();
      };
      fr.readAsText(f);
    });
    inp.click();
  }

  /* 顶栏用户按钮 */
  function mountButton() {
    var right = document.querySelector('.topbar .right');
    if (!right || document.getElementById('userBtn')) return;
    var u = session();
    var wrap = document.createElement('div');
    wrap.className = 'ub';
    wrap.innerHTML =
      '<button class="icobtn" id="userBtn" title="' + (u ? '账号：' + u.name : '登录 / 注册') + '" aria-label="账号">' +
      (u ? '<span style="font-size:11.5px;font-weight:600;line-height:1">' + u.name.slice(0, 1) + '</span>'
        : '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6">' +
          '<circle cx="10" cy="7" r="3.1"/><path d="M4 17c0-3.3 2.7-5.2 6-5.2s6 1.9 6 5.2"/></svg>') +
      (u ? '<span class="ub-dot"></span>' : '') +
      '</button>' +
      '<div class="au-menu" id="auMenu">' +
      (u
        ? '<div class="au-me"><b>' + u.name + '</b><span>' + u.email + '</span></div>' +
          '<button id="auExport">导出我的数据</button>' +
          '<button id="auImport">导入数据（换设备用）</button>' +
          '<button id="auLogout">退出登录</button>'
        : '<div class="au-me"><b>还没登录</b><span>进度存在本机，登录后按账号分开</span></div>' +
          '<button id="auLoginBtn">登录 / 注册</button>') +
      '<button id="auSwitch">' + (u ? '换个账号' : '账号说明') + '</button>' +
      '</div>';
    right.insertBefore(wrap, right.firstChild);

    var menu = document.getElementById('auMenu');
    document.getElementById('userBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('on');
    });
    document.addEventListener('click', function () { menu.classList.remove('on'); });
    var lo = document.getElementById('auLogout');
    if (lo) lo.addEventListener('click', function () { logout(); location.reload(); });
    var ex = document.getElementById('auExport');
    if (ex) ex.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.remove('on');
      exportData(u);
    });
    var im = document.getElementById('auImport');
    if (im) im.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.remove('on');
      importData();
    });
    document.getElementById('auLoginBtn') && document.getElementById('auLoginBtn').addEventListener('click', function () {
      menu.classList.remove('on'); show('login');
    });
    document.getElementById('auSwitch').addEventListener('click', function () {
      menu.classList.remove('on');
      if (u) show('login'); else show('reg');
    });
  }

  window.KG_AUTH = {
    users: users, session: session, register: register, login: login, logout: logout,
    show: show, hide: hide, dataKey: dataKey
  };

  function init() {
    injectCSS();
    if (document.querySelector('.topbar .right')) mountButton();
    var u = session();
    if (!u && !localStorage.getItem(SKIP_KEY)) {
      show('login');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
