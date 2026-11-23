/* 考公学习系统 · 申论题组装
 * 把 data-shenlun.js 的 20 个主题，按 5 种题型组装成 100 道题，追加到 APP_DATA.essays
 */
(function (root) {
  'use strict';
  var T = root.GEN_SHENLUN_T || [];
  var D = root.APP_DATA;
  if (!D || !T.length) return;

  function clean(s) { return String(s || '').replace(/[“”"]/g, ''); }

  /* 把一条对策拆成关键词（用于采分点命中判定） */
  function keysOf(s) {
    return clean(s).split(/[，、；]/).map(function (x) {
      return x.replace(/[（）()]/g, '').trim();
    }).filter(function (x) { return x.length >= 2; });
  }

  function ptsFromFix(fix, w) {
    return fix.map(function (f, i) {
      return { k: keysOf(f), w: w || (i < 2 ? 4 : 3), label: f };
    });
  }

  function ptSample(pts, lead) {
    return pts.map(function (p, i) {
      return (['一是', '二是', '三是', '四是', '五是'][i] || (i + 1) + '是') + p.l + '。' + (p.s || '');
    }).join('');
  }

  function build(t, i) {
    var list = [];
    var name = t.n;

    /* 1. 概括归纳 */
    var p1 = t.pts.map(function (p, k) {
      return { k: p.k, w: k < 2 ? 4 : 3, label: p.l };
    });
    list.push({
      id: 'g' + (i * 5 + 1),
      type: '概括归纳',
      title: '概括' + name + '方面存在的主要问题',
      limit: 300,
      material: t.mat,
      ask: '请根据给定材料，概括' + name + '方面存在的主要问题。（不超过 300 字）',
      points: p1,
      sample: ptSample(t.pts.map(function (p) { return { l: p.l, s: p.s }; }))
    });

    /* 2. 提出对策 */
    var p2 = ptsFromFix(t.fix);
    list.push({
      id: 'g' + (i * 5 + 2),
      type: '提出对策',
      title: '就' + name + '工作提出对策建议',
      limit: 350,
      material: t.mat,
      ask: '针对材料反映的问题，就进一步做好' + name + '工作提出对策建议。（不超过 350 字）',
      points: p2,
      sample: '针对上述问题，建议：一是' + t.fix[0] + '。二是' + t.fix[1] + '。三是' + t.fix[2] + '。四是' + t.fix[3] + '。同时要明确责任分工和完成时限，定期调度通报，确保措施落地见效。'
    });

    /* 3. 综合分析 */
    var p3 = [];
    t.pts.slice(0, 2).forEach(function (p, k) {
      p3.push({ k: p.k, w: 4, label: p.l });
    });
    ptsFromFix(t.fix.slice(0, 2)).forEach(function (p) {
      p3.push({ k: p.k, w: 3, label: p.label });
    });
    list.push({
      id: 'g' + (i * 5 + 3),
      type: '综合分析',
      title: '谈谈对“' + t.q + '”的理解',
      limit: 300,
      material: t.mat,
      ask: '材料中提到“' + t.q + '”。请结合给定材料，谈谈你对这句话的理解。（不超过 300 字）',
      points: p3,
      sample: '这句话强调的是：' + clean(t.q) + '。一方面，' + t.pts[0].l + '，' + t.pts[0].s + '另一方面，' + t.pts[1].l + '，' + t.pts[1].s + '因此，' + t.fix[0] + '，' + t.fix[1] + '，让举措真正落到群众身上。'
    });

    /* 4. 贯彻执行 */
    list.push({
      id: 'g' + (i * 5 + 4),
      type: '贯彻执行',
      title: '就推进' + name + '工作写一份工作建议',
      limit: 400,
      material: t.mat,
      ask: '假如你是市' + name + '工作专班成员，请结合材料，就推进' + name + '工作写一份工作建议，供领导参阅。（不超过 400 字）',
      points: ptsFromFix(t.fix),
      sample: '关于推进' + name + '工作的建议\n\n一、总体考虑。针对材料反映的' + t.pts[0].l + '等问题，坚持问题导向，突出重点、分步实施。\n二、主要措施。一是' + t.fix[0] + '。二是' + t.fix[1] + '。三是' + t.fix[2] + '。四是' + t.fix[3] + '。\n三、保障措施。明确责任单位和完成时限，将落实情况纳入年度考核，定期调度通报。'
    });

    /* 5. 文章论述 */
    var p5 = [];
    t.pts.forEach(function (p, k) { p5.push({ k: p.k, w: k < 2 ? 4 : 3, label: p.l }); });
    ptsFromFix(t.fix.slice(0, 2)).forEach(function (p) { p5.push({ k: p.k, w: 2, label: p.label }); });
    list.push({
      id: 'g' + (i * 5 + 5),
      type: '文章论述',
      title: name + '：把功夫下在实处',
      limit: 1000,
      material: t.mat,
      ask: '请结合给定材料，以“' + name + '：把功夫下在实处”为题，自选角度，写一篇文章。（1000 字左右）',
      points: p5,
      sample: name + '，说到底是把事办到群众心坎上。\n\n第一，正视问题。' + t.pts[0].l + '，' + t.pts[0].s + '这些问题不解决，再好的规划也落不了地。\n\n第二，找准抓手。' + t.fix[0] + '；' + t.fix[1] + '。把资源用在关键处，才能以点带面。\n\n第三，建立机制。' + t.pts[1].l + '的根子在机制。要明确责任、强化调度、公开结果，让干得好的有激励、干得差的有压力。\n\n功夫下在实处，成效才能显在明处。'
    });

    return list;
  }

  var out = [];
  T.forEach(function (t, i) { out = out.concat(build(t, i)); });

  D.essays = (D.essays || []).concat(out);
  root.GEN_SHENLUN = { gen: function () { return out; }, themes: T.length };
})(window);
