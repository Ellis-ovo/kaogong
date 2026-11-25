/* 本地真题导入：把拷来的真题塞进题库，不动其它数据 */
(function () {
  'use strict';
  var KEY = 'kg-bank-v1';

  function read() {
    var arr = null;
    try { arr = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { arr = []; }
    return Array.isArray(arr) ? arr : [];
  }

  function load() {
    var D = window.APP_DATA;
    if (!D || !Array.isArray(D.questions)) return 0;
    var have = {};
    D.questions.forEach(function (q) { if (q && q.id) have[q.id] = 1; });
    var n = 0;
    read().forEach(function (q) {
      if (!q || !q.stem || !Array.isArray(q.opts) || q.opts.length !== 4) return;
      if (typeof q.ans !== 'number' || q.ans < 0 || q.ans > 3) return;
      if (!q.id || have[q.id]) return;
      q.imp = 1;
      q.gen = 0;
      D.questions.push(q);
      have[q.id] = 1;
      n++;
    });
    return n;
  }

  window.KG_BANK = { KEY: KEY, read: read, load: load };
  load();
})();
