/* 申论范文三档对照：每道题给出低分 / 中等 / 高分三个版本的范文与批语。
 * 依赖 APP_DATA.essays（data.js + data-extra.js + data-shenlun.js + gen_shenlun.js + fix-essays.js 之后加载）
 * 思路：高分版沿用已生成/已手写的满分配置；中低分版按「少覆盖采分点 + 结构松散 + 语言口语化」
 * 的典型失分方式反向构造，便于对照差距，而不是随便截断文本。
 */
(function () {
  'use strict';
  var D = window.APP_DATA || {};
  var IDENT = '\u3000\u3000';

  function clean(s) {
    return String(s == null ? '' : s).replace(/[「」]/g, '“”').replace(/\s+/g, ' ').trim();
  }
  function nz(s) { return String(s || '').replace(/\s/g, '').length; }

  /* 每个题型的分条词与收尾方式 */
  function styleOf(type) {
    if (type === '提出对策') {
      return {
        marks: ['一是', '二是', '三是', '四是', '五是', '六是'],
        tail: '以上措施要落到具体环节，明确时限和责任人，防止层层空转。'
      };
    }
    if (type === '贯彻执行') {
      return {
        marks: ['一、', '二、', '三、', '四、', '五、', '六、'],
        title: '关于做好相关工作的建议',
        tail: IDENT + '以上建议，请领导审示。'
      };
    }
    if (type === '综合分析') {
      return { marks: ['其一', '其二', '其三', '其四'], tail: '因此，既要看到问题，也要找到可行路径，把认识落到行动上。' };
    }
    if (type === '文章论述') {
      return {
        marks: ['第一，', '第二，', '第三，', '第四，', '第五，', '第六，'],
        tail: '把功夫下在实处，成效才能显在明处。'
      };
    }
    return { marks: ['一是', '二是', '三是', '四是', '五是', '六是'], tail: '这些问题相互交织，需要系统施策、久久为功。' };
  }

  /* 把一个采分点标签写成分句，按位置换说法，避免通篇一个句式 */
  function pointSentence(label, type, i) {
    var l = clean(label).replace(/[。；，、]+$/, '');
    if (!l) return '';
    if (type === '提出对策') {
      var tails = ['，明确牵头单位和完成时限', '，配套资金与人员保障', '，建立台账按月调度', '，把落实情况纳入考核'];
      return l + tails[i % tails.length];
    }
    if (type === '贯彻执行') {
      var t2 = ['，细化任务清单', '，明确责任分工', '，强化督促检查', '，及时总结评估'];
      return l + t2[i % t2.length];
    }
    if (type === '综合分析') {
      var t3 = ['，直接关系到群众获得感', '，也影响政策落地效果', '，需要放在更长周期里看'];
      return l + t3[i % t3.length];
    }
    if (type === '文章论述') {
      var t4 = ['，这是必须答好的必答题', '，也是群众最直接的感受', '，检验的是治理的精细度', '，考验的是久久为功的定力'];
      return l + t4[i % t4.length];
    }
    var t5 = ['问题比较突出', '长期没有得到解决', '群众反映集中', '制约了工作推进'];
    return l + t5[i % t5.length];
  }

  function essayTitle(e) {
    var t = clean(e.title || '');
    if (!t) return '关于做好相关工作的建议';
    /* 「基层减负：把功夫下在实处」这类标题直接用；纯主题名则补成文章标题 */
    if (t.indexOf('：') >= 0 || t.indexOf(':') >= 0) return t;
    return t + '：把功夫下在实处';
  }

  function buildLow(e) {
    var pts = (e.points || []).map(function (p) { return p.label; }).filter(Boolean);
    var one = pts.length ? pointSentence(pts[0], e.type, 0) : '工作推进还不够扎实';
    var body;
    if (e.type === '文章论述' || e.type === '综合分析') {
      body = IDENT + '现在有些地方做事比较粗放，' + one +
        '。我觉得主要还是认识不到位，再加上人手和经费都紧张，一时也顾不上。' +
        '以后还是要多听意见、多想点办法，把该办的事办起来。';
    } else if (e.type === '贯彻执行') {
      body = IDENT + '当前工作取得了一些成绩，但也存在不少问题，主要是' + one +
        '。下一步打算加把劲，把这项工作抓紧抓好，争取早点见到效果。';
    } else {
      body = IDENT + '当前工作中存在的问题主要有：' + one +
        '。这个问题一直没有得到很好解决，影响了大家的积极性。';
    }
    return body.trim();
  }

  function buildMid(e) {
    var st = styleOf(e.type);
    var pts = (e.points || []).map(function (p) { return p.label; }).filter(Boolean);
    var cover = e.type === '文章论述' || e.type === '贯彻执行' ? 0.8 : 0.6;
    var take = pts.slice(0, Math.max(2, Math.ceil(pts.length * cover)));

    /* 文章论述要给足篇幅，否则不像一篇中档文章 */
    if (e.type === '文章论述') {
      var pre = essayTitle(e) + '\n\n';
      var ps = take.map(function (l, i) {
        var a = clean(l).replace(/[。；，、]+$/, '');
        var feel = ['群众感受最直接', '基层负担最重', '群众意见最集中', '落实中最容易走样'][i % 4];
        var how = ['要从源头压减', '要靠制度厘清', '要用技术赋能', '要把评价交给群众'][i % 4];
        return IDENT + st.marks[i % st.marks.length] + a + '。' + '这是' + feel + '的一环，' +
          '表面看是工作方法问题，根子上还是政绩观和责任链条的问题。' +
          '解决它，' + how + '，把要求细化到岗到人，让基层干部知道该干什么、不该干什么。' +
          '同时要把考核的口径统一起来，避免一项工作多头布置、反复检查，让减负真正减到实处。';
      }).join('\n\n');
      var head = IDENT + '做好这项工作，既是发展需要，也是群众期待。必须抓住关键、下足功夫，' +
        '把各项要求落到具体环节。\n\n';
      var end2 = IDENT + '说到底，减负不是减责任，而是把干部的精力从无谓的事务中解放出来，' +
        '用到解决实际问题上去。\n\n' + IDENT + st.tail;
      return (pre + head + ps + '\n\n' + end2).trim();
    }

    var lines = take.map(function (l, i) {
      var extra = e.type === '贯彻执行'
        ? '由牵头单位细化任务清单，明确责任人和完成时限，按月调度、按季评估。'
        : (e.type === '提出对策'
          ? '要把措施落到具体环节，明确谁来做、什么时候做完、做到什么程度。'
          : (e.type === '综合分析'
            ? '从材料看，这一现象既有认识层面的原因，也有机制层面的制约，需要放在基层治理的大背景下来看。'
            : '这一点在材料中有具体表现，既影响工作效率，也影响群众对基层工作的评价。'));
      return IDENT + st.marks[i % st.marks.length] + pointSentence(l, e.type, i) + '。' + extra;
    }).join('\n\n');

    var head2 = '';
    if (e.type === '贯彻执行') {
      head2 = (st.title || '关于做好相关工作的建议') + '\n\n' + IDENT + '结合材料情况，提出如下建议。\n\n';
    } else if (e.type === '综合分析') {
      head2 = IDENT + '对这类现象，需要辩证看待，既要看到成效，也要正视不足。\n\n';
    } else {
      head2 = IDENT + '从给定材料看，' +
        (e.type === '提出对策' ? '需要着力解决的重点问题集中在以下几个方面。' : '当前主要存在以下问题。') + '\n\n';
    }
    return (head2 + lines + '\n\n' + (st.tail ? IDENT + st.tail : '')).trim();
  }

  function noteOf(level, covered, total) {
    if (level === 'low') {
      return '只写了 ' + covered + '/' + total + ' 个采分点，不分条、有口语化表述，且没有落到对策和结果——这是最典型的三类丢分。';
    }
    if (level === 'mid') {
      return '覆盖 ' + covered + '/' + total + ' 个采分点，分条基本成型，但要点写不全、部分只表态度不给办法，属于“会写但写不满”的中档卷。';
    }
    return '覆盖 ' + total + '/' + total + ' 个采分点，分条清晰、每条有落点，字数接近上限——对照前两档看差在哪几条。';
  }

  (D.essays || []).forEach(function (e) {
    if (!e || !e.sample) return;
    var pts = (e.points || []).filter(function (p) { return p && p.label; });
    var total = pts.length || 1;
    var lowText = buildLow(e);
    var midText = buildMid(e);
    var lowCovered = pts.length ? 1 : 0;
    var midCovered = Math.max(2, Math.ceil(total * 0.6));

    e.levels = {
      low: { key: 'low', name: '低分卷', score: 38, text: lowText, covered: lowCovered, total: total, note: noteOf('low', lowCovered, total) },
      mid: { key: 'mid', name: '中等卷', score: 66, text: midText, covered: midCovered, total: total, note: noteOf('mid', midCovered, total) },
      high: { key: 'high', name: '高分卷', score: 90, text: e.sample, covered: total, total: total, note: noteOf('high', total, total) }
    };
  });

  window.ESS_LEVELS_READY = true;
})();
