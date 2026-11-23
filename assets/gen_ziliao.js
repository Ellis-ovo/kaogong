(function (root) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var rnd = Math.random;
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function shuffle(a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 180 个虚构城市名，避免与真实数据混淆 */
  var PRE = ['青', '临', '望', '嘉', '宁', '安', '永', '兴', '广', '德', '金', '玉', '新', '长', '清'];
  var SUF = ['阳', '江', '州', '城', '川', '山', '河', '海', '原', '平', '丰', '泉'];
  function cityName(i) {
    return PRE[Math.floor((i % 180) / 12)] + SUF[i % 12];
  }

  function perturb(s, k) {
    var pct = s.charAt(s.length - 1) === '%';
    var v = parseFloat(s);
    var nv;
    if (pct) {
      nv = v + k * 0.4;
      return f1(nv) + '%';
    }
    if (Math.abs(v) >= 100) {
      nv = v + k * 3;
      return String(Math.round(nv));
    }
    nv = v + k * 0.7;
    return f2(nv);
  }

  function mk(tag, level, mat, stem, correct, bad, exp) {
    var opts = [correct], i, c, guard = 0;
    for (i = 0; i < bad.length && opts.length < 4; i++) {
      if (opts.indexOf(bad[i]) < 0) opts.push(bad[i]);
    }
    while (opts.length < 4 && guard < 60) {
      c = perturb(correct, guard + 1);
      if (opts.indexOf(c) < 0) opts.push(c);
      guard++;
    }
    opts = shuffle(opts);
    return {
      id: '', mod: '资料分析', tag: tag, level: level, mat: mat,
      stem: stem, opts: opts, ans: opts.indexOf(correct), exp: exp
    };
  }

  var TAGS = ['增长率', '增长量', '比重计算', '平均数', '倍数与比较'];

  function makeMaterial(city, curr, prev, er, san, pop, income) {
    return '2023年，' + city + '市实现地区生产总值' + curr + '亿元，上年为' + prev +
      '亿元。其中，第二产业增加值' + er + '亿元，第三产业增加值' + san +
      '亿元。年末常住人口' + pop + '万人，全年居民人均可支配收入' + income + '元。';
  }

  function makeGroup(city, g, idx) {
    var prev = ri(250, 850) * 10;
    var growth = ri(40, 90) / 10;
    var curr = Math.round(prev * (100 + growth) / 100);
    var diff = curr - prev;
    var gr = diff / prev * 100;
    var er = Math.round(curr * ri(40, 52) / 100);
    var san = Math.round(curr * ri(28, 38) / 100);
    if (er + san > curr * 0.96) san = Math.max(100, curr - er - 80);
    var pop = Math.max(120, Math.round(curr / (ri(80, 180) / 10)));
    var income = ri(240, 600) * 100;
    var mat = makeMaterial(city, curr, prev, er, san, pop, income);
    var qs = [];

    var c1 = f1(gr) + '%';
    var b1 = [f1(diff / curr * 100) + '%', f1(curr / prev * 100) + '%', f1(gr + 0.7) + '%'];
    var e1 = '根据材料，2023年地区生产总值为' + curr + '亿元，上年为' + prev +
      '亿元，增长量=' + curr + '-' + prev + '=' + diff + '亿元。增长率=增长量÷基期值×100%=' +
      diff + '÷' + prev + '×100%≈' + c1 + '。选' + b1[0] +
      '是用当年GDP作分母，把基期和现期弄反了；选' + b1[1] +
      '是忘记减去1，把现期是基期的百分之几当成了增长率；选' + b1[2] +
      '是在正确结果上多加了0.7个百分点。';
    qs.push(mk('增长率', 2, mat, '根据材料，2023年' + city + '市地区生产总值同比增长约多少？', c1, b1, e1));

    var c2 = String(diff);
    var b2 = [String(Math.round(curr * gr / 100)), String(diff + ri(8, 60)), String(Math.max(1, diff - ri(8, 60)))];
    var e2 = '增长量=现期值-基期值=' + curr + '-' + prev + '=' + diff + '亿元，所以正确结果是' +
      c2 + '亿元。选' + b2[0] + '是用现期值乘增长率，但增长率是按基期值计算的，这样算会偏大；选' +
      b2[1] + '是在正确增长量上又多加了若干亿元；选' + b2[2] +
      '是在正确增长量上少减了若干亿元。';
    qs.push(mk('增长量', 2, mat, '根据材料，2023年' + city + '市地区生产总值比上年增加多少亿元？', c2, b2, e2));

    var c3 = f1(san / curr * 100) + '%';
    var b3 = [f1(er / curr * 100) + '%', f1(san / (er + san) * 100) + '%', f1(san / prev * 100) + '%'];
    var e3 = '第三产业增加值占GDP的比重=第三产业增加值÷地区生产总值×100%=' + san + '÷' + curr +
      '×100%≈' + c3 + '。选' + b3[0] + '是误用了第二产业增加值作分子；选' + b3[1] +
      '是把分母写成了第二、三产业之和，漏掉了第一产业；选' + b3[2] +
      '是用上年GDP作分母，基期与现期没有对应。';
    qs.push(mk('比重计算', 2, mat, '根据材料，2023年' + city + '市第三产业增加值占地区生产总值的比重约为多少？', c3, b3, e3));

    var c4 = f2(curr / pop);
    var b4 = [f2(prev / pop), f2(curr / pop * 10), f2(curr / pop / 10)];
    var e4 = '人均地区生产总值=地区生产总值÷常住人口=' + curr + '亿元÷' + pop + '万人=' +
      f2(curr / pop) + '万元/人。这里亿元除以万人，结果单位正好是万元/人。选' + b4[0] +
      '是用上年GDP计算，基期数据用错了；选' + b4[1] + '是把单位换算方向弄反，放大了10倍；选' + b4[2] +
      '是缩小了10倍。';
    qs.push(mk('平均数', 2, mat, '根据材料，2023年' + city + '市人均地区生产总值约为多少万元？', c4, b4, e4));

    var kind = idx % 3;
    var stem5, c5, b5, e5;
    if (kind === 0) {
      c5 = f2(er / san);
      b5 = [f2(san / er), f2(er / (curr - san)), f2(er / san + 0.25)];
      stem5 = '第二产业增加值是第三产业的多少倍？';
      e5 = '倍数=第二产业增加值÷第三产业增加值=' + er + '÷' + san + '≈' + c5 +
        '倍。选' + b5[0] + '是把被除数和除数颠倒了；选' + b5[1] +
        '是误用“GDP减去第三产业”作除数，把第一产业也算进去了；选' + b5[2] +
        '是在正确倍数上多加了0.25倍。';
    } else if (kind === 1) {
      c5 = String(er - san);
      b5 = [String(er + san), String(curr - er - san), String(er - san + ri(20, 80))];
      stem5 = '第二产业增加值比第三产业多多少亿元？';
      e5 = '第二产业比第三产业多：' + er + '-' + san + '=' + c5 + '亿元。选' + b5[0] +
        '是把两个产业相加，求成了合计；选' + b5[1] + '是算成了第一产业增加值；选' + b5[2] +
        '是在正确差值上又多加了若干亿元。';
    } else {
      c5 = f1((er - san) / curr * 100) + '%';
      b5 = [f1((er - san) / (er + san) * 100) + '%', f1(er / curr * 100) + '%', f1((er - san) / prev * 100) + '%'];
      stem5 = '第二产业增加值占GDP的比重比第三产业高多少个百分点？';
      e5 = '第二产业比重=' + er + '÷' + curr + '×100%≈' + f1(er / curr * 100) +
        '%，第三产业比重=' + san + '÷' + curr + '×100%≈' + f1(san / curr * 100) +
        '%，两者之差≈' + c5 + '。选' + b5[0] + '是错误地把分母换成了第二、三产业之和；选' + b5[1] +
        '只算了第二产业的比重，没有减去第三产业；选' + b5[2] + '是用上年GDP作分母，基期用错。';
    }
    qs.push(mk('倍数与比较', 2, mat, '根据材料，2023年' + city + '市' + stem5, c5, b5, e5));
    return qs;
  }

  var api = {
    gen: function (n, seed) {
      rnd = mulberry32((seed || 20270101) >>> 0);
      var all = [], g = 0, qs, i;
      while (all.length < n) {
        qs = makeGroup(cityName(g), g, g);
        for (i = 0; i < qs.length && all.length < n; i++) all.push(qs[i]);
        g++;
      }
      for (i = 0; i < all.length; i++) all[i].id = 'zl' + (2001 + i);
      return all;
    }
  };

  root.GEN_ZILIAO = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
