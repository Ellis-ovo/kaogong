/* 考公学习系统 · 申论题组装
 * 把 data-shenlun.js 的 20 个主题，按 5 种题型组装成 100 道题，追加到 APP_DATA.essays
 * 范文按申论规范排版：标题单独成行、段首空两格、分条用「一是/二是」「一、二、」「第一、第二」、
 * 引号用中文双引号，正文不出现「」。
 * 长度对齐题型要求：概括/分析约 270 字、对策约 330 字、贯彻约 370 字、文章约 1000 字。
 */
(function (root) {
  'use strict';
  var T = root.GEN_SHENLUN_T || [];
  var D = root.APP_DATA;
  if (!D || !T.length) return;

  var IDENT = '\u3000\u3000';   /* 段首两个全角空格 */
  var ORDER1 = ['一是', '二是', '三是', '四是', '五是', '六是'];
  var ORDER2 = ['一、', '二、', '三、', '四、', '五、'];

  function clean(s) { return String(s || '').replace(/[“”"]/g, '').replace(/[「」]/g, ''); }
  function trimP(s) { return String(s || '').replace(/[。；，、,.;\s]+$/, ''); }
  function len(s) { return String(s).replace(/\s/g, '').length; }
  function P(txt) { return IDENT + txt; }

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

  /* 不足目标字数则续写候选句；超出上限则裁剪 */
  /* 补足到目标字数：能整句加就整句加，剩余空间不足时按分句截断补齐 */
  function fit(text, target, cap, pool, sep) {
    var sp = (sep === undefined) ? '' : sep;
    var outs = String(text);
    var i = 0, guard = 0;
    while (pool && i < pool.length && len(outs) < target && guard++ < 60) {
      var cand = String(pool[i]);
      var room = cap - len(outs) - sp.length;
      if (len(cand) <= room) { outs += sp + cand; i++; continue; }
      if (room >= 22) {
        var cut = cand.slice(0, room - 1);
        var at = Math.max(cut.lastIndexOf('，'), cut.lastIndexOf('；'));
        if (at >= 14) out = null, outs += sp + cut.slice(0, at) + '。';
      }
      break;
    }
    return outs;
  }

  /* 按句号硬截到上限内（用于单段题型的兜底） */
  function hardCap(text, cap) {
    if (len(text) <= cap) return text;
    var cut = text.slice(0, cap);
    var at = cut.lastIndexOf('。');
    return at > 0 ? cut.slice(0, at + 1) : cut.replace(/.$/, '') + '。';
  }

  function build(t, k) {
    var list = [];
    var name = t.n;
    var p0 = t.pts[0] || { l: '', s: '' };
    var p1 = t.pts[1] || p0;
    var f0 = trimP(t.fix[0]);
    var f1 = trimP(t.fix[1]);
    var f2 = trimP(t.fix[2]);
    var f3 = trimP(t.fix[3]);

    /* ---------- 1. 概括归纳（300 字） ---------- */
    var g1 = t.pts.map(function (p, n) { return { k: p.k, w: n < 2 ? 4 : 3, label: p.l }; });
    var items = t.pts.map(function (p, n) {
      var extra = trimP(p.s);
      if (extra.length > 26) extra = extra.slice(0, 26).replace(/[，、；]$/, '') + '等';
      return ORDER1[n] + p.l + '，' + extra + '。';
    }).join('');
    var s1 = fit(
      P('当前，' + name + '方面主要存在以下问题：' + items),
      296, 300,
      [
        '上述问题相互交织，既有思想认识不到位的因素，也有责任链条没压实、保障条件跟不上的原因。',
        '从群众感受看，反映集中之处，往往就是政策落实打折扣之处，也是工作作风不实之处。',
        '归结起来，症结在于重部署轻落实、重形式轻实效，群众的实际感受没有被摆到应有的位置。',
        '这些问题如果不能及时解决，既影响政策效果，也损耗基层的干事热情和群众的信任。',
        '破解之道，在于从源头上减事项、从机制上明权责、从保障上补短板。'
      ],
      ''
    );
    s1 = hardCap(s1, 300);
    list.push({
      id: 'g' + (k * 5 + 1),
      type: '概括归纳',
      title: '概括' + name + '方面存在的主要问题',
      limit: 300,
      material: t.mat,
      ask: '请根据给定材料，概括' + name + '方面存在的主要问题。（不超过 300 字）',
      points: g1,
      sample: s1
    });

    /* ---------- 2. 提出对策（350 字） ---------- */
    var g2 = ptsFromFix(t.fix);
    var s2 = fit(
      P('针对上述问题，建议从四个方面着力：一是' + f0 + '，明确牵头单位和完成时限，确保责任到人。二是' + f1 +
      '，同步配套资金、人员和政策支持。三是' + f2 + '，建立台账、挂图作战，一项一项销号。四是' + f3 +
      '，定期评估、动态调整，防止政策空转。同时，要把群众评价作为检验标准，对反映集中的问题挂牌督办、及时回访，防止一改了之、久拖不决。'),
      346, 350,
      [
        '推进中既要防止层层加码、简单一刀切，也要避免只出文件、不问效果，让好政策真正落地见效。',
        '对落实不力的及时提醒纠正，对行之有效的做法及时总结推广，形成可复制的经验。',
        '同时，把基层和群众的评价纳入进来，让减负成效由服务对象说了算，避免自说自话。',
        '对以形式主义应付减负的，发现一起纠正一起，防止问题反弹回潮。'
      ],
      ''
    );
    s2 = hardCap(s2, 350);
    list.push({
      id: 'g' + (k * 5 + 2),
      type: '提出对策',
      title: '就' + name + '工作提出对策建议',
      limit: 350,
      material: t.mat,
      ask: '针对材料反映的问题，就进一步做好' + name + '工作提出对策建议。（不超过 350 字）',
      points: g2,
      sample: s2
    });

    /* ---------- 3. 综合分析（300 字） ---------- */
    var g3 = [];
    t.pts.slice(0, 2).forEach(function (p) { g3.push({ k: p.k, w: 4, label: p.l }); });
    ptsFromFix(t.fix.slice(0, 2)).forEach(function (p) { g3.push({ k: p.k, w: 3, label: p.label }); });
    var s3 = fit(
      P('这句话强调的是：' + clean(t.q) + '。') + '\n\n' +
      P('一方面，' + p0.l + '，' + trimP(p0.s) + '；另一方面，' + p1.l + '，' + trimP(p1.s) +
        '。问题的表象在末端，根子往往在前端。如果只就事论事、头痛医头，就会陷入“按下葫芦浮起瓢”的循环。') + '\n\n' +
      P('因此，' + f0 + '，' + f1 + '，并建立长效机制，让举措真正落到群众身上。'),
      296, 300,
      [
        '说到底，这是工作方法问题：再好的政策，不落到具体的人、具体的事上，就只是一纸空文。',
        '衡量成效的标准不在文件写得多漂亮，而在群众的烦心事有没有减少、获得感有没有增加。',
        '换句话说，要把“群众满不满意”作为检验尺子，倒逼工作方式从“管住”转向“服务好”。'
      ],
      ''
    );
    s3 = hardCap(s3, 300);
    list.push({
      id: 'g' + (k * 5 + 3),
      type: '综合分析',
      title: '谈谈对“' + t.q + '”的理解',
      limit: 300,
      material: t.mat,
      ask: '材料中提到“' + t.q + '”。请结合给定材料，谈谈你对这句话的理解。（不超过 300 字）',
      points: g3,
      sample: s3
    });

    /* ---------- 4. 贯彻执行（400 字） ---------- */
    var gsTail = P('以上建议，请领导审示。');
    var gsBody = fit(
      '关于推进' + name + '工作的建议\n\n' +
      P(ORDER2[0] + '基本情况。从调研和材料反映看，' + trimP(p0.l) + '，' + trimP(p0.s) + '；' + trimP(p1.l) + '，' + trimP(p1.s) +
        '。群众反映集中，基层负担不轻，亟需统筹解决。') + '\n\n' +
      P(ORDER2[1] + '总体考虑。坚持问题导向、目标导向、结果导向，突出重点、分步实施，力争年内见到明显成效。') + '\n\n' +
      P(ORDER2[2] + '主要措施。一是' + f0 + '。二是' + f1 + '。三是' + f2 + '。四是' + f3 + '。') + '\n\n' +
      P(ORDER2[3] + '保障措施。成立工作专班，明确牵头单位和配合单位；建立月调度、季通报机制，将落实情况纳入年度考核；畅通群众评价渠道，对反映集中的问题挂牌督办。') + '\n\n' +
      P(ORDER2[4] + '风险提示。推进中要把握好节奏和力度，充分听取基层和群众意见，防止简单化、一刀切。'),
      396 - len(gsTail) - 2, 400 - len(gsTail) - 2,
      [
        P('六、工作要求。各部门要对照任务分工细化举措，明确时间表、路线图；专班办公室加强统筹调度，及时协调解决推进中的困难问题。'),
        P('各县区要结合本地实际细化实施方案，不搞上下一般粗，确保措施可落地、可检验。'),
        P('要把这项工作与年度重点任务统筹起来，一并部署、一并考核，避免另起炉灶、重复布置。')
      ],
      '\n\n'
    );
    var s4 = hardCap(gsBody + '\n\n' + gsTail, 400);

    list.push({
      id: 'g' + (k * 5 + 4),
      type: '贯彻执行',
      title: '就推进' + name + '工作写一份工作建议',
      limit: 400,
      material: t.mat,
      ask: '假如你是市' + name + '工作专班成员，请结合材料，就推进' + name + '工作写一份工作建议，供领导参阅。（不超过 400 字）',
      points: ptsFromFix(t.fix),
      sample: s4
    });

    /* ---------- 5. 文章论述（1000 字） ---------- */
    var g5 = [];
    t.pts.forEach(function (p, n) { g5.push({ k: p.k, w: n < 2 ? 4 : 3, label: p.l }); });
    ptsFromFix(t.fix.slice(0, 2)).forEach(function (p) { g5.push({ k: p.k, w: 2, label: p.label }); });

    var title = name + '：把功夫下在实处';
    var paras = [
      P('“' + name + '”不是抽象的概念，而是群众日常可感的切身利益。材料显示的几组情况颇具代表性：' +
        t.pts.map(function (p) { return trimP(p.l) + '，' + trimP(p.s); }).join('；') +
        '。这些问题看似零散，实则指向同一个症结：功夫还没有真正下到实处。把' + name +
        '做实，既要有直面问题的勇气，也要有解决问题的办法，更要有久久为功的韧劲。'),

      P('第一，把功夫下在实处，首先要正视问题、摸清底数。问题不会因为回避而消失，只会因为拖延而积累。现实中，一些地方习惯于报喜不报忧，把矛盾捂着盖着，结果小事拖大、大事拖炸；也有一些地方虽然发现了问题，却停留在开会部署、层层转发，群众的急难愁盼依旧悬在空中。反观那些把' + name +
        '做得扎实的地方，无不是从一条一条梳理问题开始的：沉到一线听意见，把诉求一条条列出来，分清轻重缓急，明确责任主体，让每个问题都有人管、有时限、有回音。底数清了，方向才不会偏；问题找准了，措施才不会空。'),

      P('第二，把功夫下在实处，关键在于找准抓手、精准施策。抓手不在多，而在准。' + f0 + '；' + f1 +
        '。这两条一头连着资源投向，一头连着群众感受，抓住了就能以点带面。实践中要防止两种倾向：一种是贪大求全，摊子铺得很大，最后哪一头都没做实；另一种是简单粗暴，搞一刀切、层层加码，让好政策走了样。精准，意味着因地制宜、分类施策，也意味着把有限资源用在最紧要处，先解决群众反映最强烈的问题，再逐步向深层次推进。'),

      P('第三，把功夫下在实处，根本上要靠机制保障、久久为功。' + p1.l + '的背后，往往是责任不清、调度不力、评价不实。机制不立，一时之功难以持久；机制一立，常态长效才有依托。要健全责任体系，明确谁牵头、谁配合、谁落实；要完善调度机制，定期盘点进度、及时解决问题；要强化结果运用，让干得好的有激励、干得差的有压力。同时，把群众满意度作为检验标准，公开晾晒、接受监督，避免自说自话、自我评价。'),

      P('还要看到，' + name +
        '涉及多个部门、多个环节，单靠一家单打独斗难以奏效。要打通部门壁垒，变“各管一段”为“协同作战”，让信息多跑路、群众少跑腿；要发挥群众主体作用，把“政府干、群众看”变成“大家一起干”，在议事协商中凝聚共识、在共同参与中增进认同。力量汇聚起来，难题才啃得下来。'),

      P('民生无小事，枝叶总关情。' + name +
        '的成效，最终要由群众的获得感来检验。少一些花拳绣腿，多一些真抓实干；少一些层层加码，多一些精准务实。把功夫下在实处，把小事办到群众心坎上，' + name +
        '才能真正成为看得见、摸得着、感受得到的实惠。')
    ];
    list.push({
      id: 'g' + (k * 5 + 5),
      type: '文章论述',
      title: title,
      limit: 1000,
      material: t.mat,
      ask: '请结合给定材料，以“' + title + '”为题，自选角度，写一篇文章。（1000 字左右）',
      points: g5,
      sample: hardCap(fit(title + '\n\n' + paras.join('\n\n'), 1030, 1100, [
        P('需要强调的是，抓落实不能靠一阵风式的运动，而要靠日复一日的坚持。把标准立起来、把节奏稳下来，成效自然会显现。')
      ], '\n\n'), 1100)
    });

    return list;
  }

  var out = [];
  T.forEach(function (t, i) { out = out.concat(build(t, i)); });

  D.essays = (D.essays || []).concat(out);
  root.GEN_SHENLUN = { gen: function () { return out; }, themes: T.length };
})(window);
