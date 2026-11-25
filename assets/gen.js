/* 考公学习系统 · 题库扩充装载器
 * 把生成器产出的题目并入 APP_DATA.questions。
 * 生成器是可选的：缺哪个就跳过哪个，不影响原有题库。
 */
(function () {
  'use strict';
  var D = window.APP_DATA;
  if (!D || !D.questions) return;
  if (D.__genDone) return;
  D.__genDone = true;

  var JOBS = [
    { g: window.GEN_SHULIANG, n: 3000, seed: 20270101 },
    { g: window.GEN_ZILIAO, n: 900, seed: 20270102 },
    { g: window.GEN_PANDUAN, n: 1200, seed: 20270103 },
    { g: window.GEN_YANYU, n: 900, seed: 20270104 },
    { g: window.GEN_CHANGSHI, n: 900, seed: 20270105 }
  ];

  var seen = {};
  D.questions.forEach(function (q) { if (q && q.id) seen[q.id] = 1; });

  JOBS.forEach(function (job) {
    if (!job.g || typeof job.g.gen !== 'function') return;
    var list;
    try {
      list = job.g.gen(job.n, job.seed) || [];
    } catch (e) {
      if (window.console && console.warn) console.warn('题库生成失败:', e);
      return;
    }
    list.forEach(function (q) {
      if (!q || !q.id || seen[q.id]) return;
      if (!q.opts || q.opts.length !== 4) return;
      if (typeof q.ans !== 'number' || q.ans < 0 || q.ans > 3) return;
      if (!q.stem || !q.exp) return;
      seen[q.id] = 1;
      q.gen = 1;
      D.questions.push(q);
    });
  });

  // 排序不影响抽题，但让「按模块」列表更整齐：保持原题库在前，生成题在后
})();
