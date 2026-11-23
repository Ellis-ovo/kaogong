/* 申论口语规范化 · 本地规则引擎
 * 纯离线：词库替换 + 口语壳剥离 + 程度升级 + 结构框架
 * 暴露 global.SL
 */
(function (global) {
  'use strict';

  var SENT = '\u0001', SEND = '\u0002';

  /* ---------- 一、基础词库（口语 → 规范表述） ---------- */
  var DICT = [
    // 干部作风 / 基层治理
    ['上面千条线，下面一根针', '基层事务繁杂、权责不对等'],
    ['门好进脸好看事难办', '“门好进、脸好看、事难办”'],
    ['做表面文章', '重形式轻实效'],
    ['拍脑袋决策', '主观臆断、盲目决策'],
    ['不下基层', '脱离基层实际'],
    ['推诿扯皮', '相互推诿'],
    ['层层加码', '层层加码'],
    ['吃拿卡要', '吃拿卡要'],
    ['检查太多', '督查检查考核过多过频'],
        ['躺平', '消极懈怠'],
    ['摆烂', '敷衍应付'],
    ['懒政', '慵懒散拖'],
    ['混日子', '安于现状、不思进取'],
    ['老油条', '作风散漫'],
    ['一刀切', '简单化“一刀切”'],
    ['走过场', '流于形式'],
    ['面子工程', '形象工程'],
    ['文山会海', '文山会海'],
    ['拍脑袋', '主观臆断'],
    ['甩锅', '转嫁责任'],
    ['踢皮球', '推诿塞责'],
    ['爱答不理', '服务态度冷漠'],
    ['说了不算', '承诺不兑现'],
    ['当官的', '领导干部'],
    ['当官', '从政'],
    ['领导们', '领导干部'],
    ['留痕', '过度留痕'],
    ['提拔', '选拔任用'],
    ['拍板', '决策'],
    ['发文件', '发文部署'],
    ['开会', '召开会议'],

    // 民生保障
    ['看病难', '就医难'],
    ['看病贵', '就医负担重'],
    ['上学难', '入学难'],
    ['找工作难', '就业压力较大'],
    ['跑好几趟', '多头跑、反复跑'],
    ['踢来踢去', '相互推诿'],
    ['办事慢', '办事效率低下'],
    ['管不过来', '监管力量不足'],
    ['不知道找谁', '诉求表达渠道不畅'],
    ['没法办', '难以办理'],
    ['跑断腿', '疲于奔波'],
    ['来回跑', '往返奔波'],
    ['房价高', '住房价格偏高'],
    ['工资低', '收入水平偏低'],
    ['作业多', '课业负担过重'],
    ['压力大', '负担较重'],
    ['心理问题', '心理健康问题'],
    ['留守儿童', '留守儿童'],
    ['低保', '最低生活保障'],
    ['社保', '社会保障'],
    ['补课', '课外培训'],
    ['养老', '养老服务'],
    ['老人', '老年群体'],
    ['孩子', '子女'],
    ['小孩', '未成年人'],
    ['穷人', '低收入群体'],
    ['抑郁', '心理困扰'],

    // 生态环境
    ['空气差', '空气质量不佳'],
    ['雾霾', '雾霾天气'],
    ['偷排', '偷排偷放'],
    ['排污', '污染物排放'],
    ['环保', '生态环境保护'],
    ['浪费', '资源浪费'],
    ['节约', '节约集约'],
    ['绿化', '绿化美化'],

    // 经济发展
    ['融资难', '融资难融资贵'],
    ['成本高', '经营成本偏高'],
    ['小老板', '小微企业经营者'],
    ['做生意', '经营'],
    ['赚钱', '增收'],
    ['挣钱', '增收'],
    ['没钱', '资金短缺'],
    ['缺钱', '经费不足'],
    ['创业', '创新创业'],
    ['招商', '招商引资'],
    ['审批', '行政审批'],
    ['办证', '证照办理'],
    ['生意', '经营'],
    ['买卖', '交易'],

    // 网络与数据
    ['刷手机', '沉迷手机'],
    ['玩游戏', '沉迷网络游戏'],
    ['键盘侠', '网络暴力'],
    ['信息泄露', '个人信息泄露'],
    ['假货', '假冒伪劣商品'],
    ['骗人', '欺诈'],
    ['被骗', '遭受诈骗'],
    ['谣言', '网络谣言'],
    ['水军', '网络水军'],
    ['网红', '网络主播'],
    ['带货', '直播带货'],
    ['网上', '网络空间'],
    ['隐私', '个人隐私'],

    // 通用：主体与数量
    ['这事儿', '这一问题'],
    ['事儿', '问题'],
    ['太多了', '数量过多'],
    ['太多', '过多'],
    ['也没人管', '却无人监管'],
    ['都刷傻了', '且难以自拔'],
    ['刷傻了', '沉迷其中'],
    ['坐在办公室里', '习惯于“办公室决策”，'],
    ['老百姓', '群众'],
    ['好多人', '相当一部分群众'],
    ['大家', '各方'],
    ['咱们', '我们'],
    ['一大堆', '大量'],
    ['乱七八糟', '秩序混乱'],
    ['没办法解决', '难以有效破解'],
    ['解决不了', '难以有效破解'],
    ['好多', '诸多'],
    ['很多', '较多'],
    ['不少', '相当一部分'],
    ['一堆', '大量'],

    // 通用：评价与程度
    ['特别严重', '形势严峻'],
    ['挺好的', '成效显著'],
    ['好多了', '明显改善'],
    ['很严重', '问题突出'],
    ['没办法', '缺乏有效手段'],
    ['搞不定', '难以推进'],
    ['说不清', '界定模糊'],
    ['瞎搞', '盲目推进'],
    ['硬来', '强制推行'],
    ['乱', '无序'],
    ['乱七八糟的东西', '各类乱象'],
    ['太难了', '难度较大'],
    ['办不成', '难以办结'],
    ['得赶紧', '亟需'],
    ['赶紧', '尽快'],
    ['管管', '加强管理'],
    ['这个方案', '该方案'],
    ['这个事', '这一问题'],
    ['这个', '该'],
    ['花钱太多', '支出过高'],
    ['挺好', '较为可行'],
    ['太贵', '价格偏高'],
    ['东西', '事物'],
    ['乱来', '失范'],
    ['太差', '有待提升'],
    ['很差', '存在明显短板'],
    ['随便', '随意'],
    ['各管各的', '各自为政'],
    ['不配合', '协同不畅'],
    ['必须得', '亟需'],
    ['越来越多', '日益增多'],
    ['越来越少', '不断减少'],

    // 通用：时间与连接
    ['现在', '当前'],
    ['如今', '当前'],
    ['以前', '以往'],
    ['以后', '今后'],
    ['老是', '屡屡'],
    ['总是', '往往'],
    ['动不动', '动辄'],
    ['一直', '长期'],
    ['越来越', '日益'],
    ['这件事', '这一问题'],
    ['这事', '这一问题'],
    ['这种情况', '这一现象'],
    ['这种', '此类'],
    ['咋办', '如何破解'],
    ['咋弄', '如何推进'],
    ['啥都', '各方面'],
    ['啥问题', '各类问题'],
    ['啥', '什么'],
    ['咋样', '如何'],
    ['咋', '如何'],
    ['特别', '尤为'],
    ['超级', '极为'],
    ['有点', '略显'],
    ['稍微', '略微'],
    ['差不多', '大体'],
    ['好像', '似乎'],
    ['大概', '大约'],
    ['基本', '大体'],
    ['肯定', '必然'],
    ['估计', '预计'],
    ['配合', '协同'],
    ['时候', '时期']
  ];

  /* ---------- 二、口语壳（直接剥离） ---------- */
  var SHELL = [
    '换句话说', '说白了', '说实话', '老实说', '说实在的',
    '我觉得', '我认为', '我感觉', '我寻思', '我看啊', '我看', '我觉着', '要我说',
    '怎么说呢', '你知道吧', '你知道吗', '讲真的', '讲真', '反正',
    '总的来说', '基本上', '也就是说', '就是说', '其实', '感觉',
    '真的是', '确实是', '的话', '哎', '唉', '嗯', '呃'
  ];

  /* ---------- 三、主题识别 ---------- */
  var TOPICS = [
    {
      key: '基层治理与干部作风',
      re: /基层|社区|网格|乡镇|村干部|干部|作风|形式主义|考核|检查|落实|担当/,
      terms: ['重心下移', '减负赋能', '权责对等', '枫桥经验', '网格化管理']
    },
    {
      key: '民生保障',
      re: /看病|医疗|医保|养老|住房|房价|就业|社保|低保|上学|教育|学校|补课|作业|托育/,
      terms: ['急难愁盼', '兜底保障', '公共服务均等化', '精准施策']
    },
    {
      key: '生态文明建设',
      re: /污染|环保|垃圾|排放|生态|空气|雾霾|碳|绿化|河道|水质/,
      terms: ['绿水青山就是金山银山', '双碳目标', '源头防控', '系统治理']
    },
    {
      key: '经济运行与营商环境',
      re: /经济|企业|营商|创业|生意|市场|消费|产业链|招商|融资|审批|成本/,
      terms: ['优化营商环境', '放管服改革', '新质生产力', '有效市场与有为政府']
    },
    {
      key: '网络空间治理',
      re: /网络|网上|手机|直播|短视频|算法|数据|隐私|谣言|平台|流量|网暴/,
      terms: ['依法治网', '平台主体责任', '数字素养', '技术向善']
    },
    {
      key: '文化建设',
      re: /文化|传统|非遗|文物|阅读|文艺|旅游|景区|历史/,
      terms: ['文化自信', '创造性转化、创新性发展', '以文化人', '文旅融合']
    },
    {
      key: '法治政府建设',
      re: /执法|法律|法院|判决|投诉|举报|信访|监管|处罚|权责|法治/,
      terms: ['依法行政', '权责法定', '刚性约束', '放管结合']
    }
  ];

  /* ---------- 四、结构框架 ---------- */
  var FRAME = {
    problem: {
      lead: '当前，{t}领域仍存在短板，突出表现为：',
      tail: '上述问题若不及时破解，势必影响群众获得感与政府公信力。'
    },
    cause: {
      lead: '审视{t}领域的种种现象，其成因主要有三：',
      tail: '唯有找准病灶、对症下药，方能从根本上扭转局面。'
    },
    measure: {
      lead: '破解{t}难题，应在以下几个方面持续用力：',
      tail: '唯有如此，方能让政策红利真正惠及群众。'
    },
    meaning: {
      lead: '{t}事关群众切身利益，其意义不止于一时一事：',
      tail: '这既是回应现实关切之举，也是推进治理现代化的应有之义。'
    },
    mixed: {
      lead: '围绕{t}，需坚持问题导向与目标导向相统一：',
      tail: '对此，既要正视问题，更要拿出实招硬招。'
    }
  };

  /* ---------- 构建索引 ---------- */
  function uniqSort(list) {
    var seen = {}, out = [];
    list.forEach(function (p) {
      if (!seen[p[0]]) { seen[p[0]] = 1; out.push(p); }
    });
    out.sort(function (a, b) { return b[0].length - a[0].length; });
    return out;
  }
  var D1 = uniqSort(DICT);
  var D2 = uniqSort(SHELL.map(function (w) { return [w, '']; }));

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function normalize(s) {
    return String(s)
      .replace(/\r\n/g, '\n')
      .replace(/[ \t\u3000]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /* 前置正则：处理无法用词表覆盖的口语句式 */
  var PRE_FIRST = [
    [/^就是/g, ''],
    [/就是(?!不|没|难|干|搞|拖)/g, '在于']
  ];

  var PRE = [
    [/挺([^，。！？、\s]{1,6})的/g, '较为$1'],
    [/太([^，。！？、\s]{1,4})了/g, '过于$1'],
    [/这社会/g, '社会']
  ];

  /* 单句改写：先替换（打标记），再剥离口语壳，再清理语气词 */
  function rewriteSentence(s, marks, pairs) {
    var out = s;
    PRE_FIRST.forEach(function (r) { out = out.replace(r[0], r[1]); });
    pairs.forEach(function (p) {
      var a = p[0], b = p[1];
      if (a.length < 2 && '咋啥'.indexOf(a) === -1) return;
      if (out.indexOf(a) === -1) return;
      var idx = marks.length;
      marks.push({ from: a, to: b, del: b === '' });
      out = out.split(a).join(SENT + idx + SEND);
    });
    PRE.forEach(function (r) { out = out.replace(r[0], r[1]); });
    return out;
  }

  function pickTopic(text) {
    for (var i = 0; i < TOPICS.length; i++) {
      if (TOPICS[i].re.test(text)) return TOPICS[i];
    }
    return { key: '群众关切', terms: ['标本兼治', '精准施策', '常态长效'] };
  }

  // 句首已删除的壳词后面常残留一个逗号；只有确认前面没有任何可见内容时才吞掉它
  function stripLeadingPunct(body, marks) {
    var re = /^\u0001(\d+)\u0002/;
    var m, guard = 0;
    while ((m = re.exec(body)) && guard++ < 200) {
      var mk = marks[+m[1]];
      if (!mk || !mk.del) break;
      body = body.slice(m[0].length);
    }
    return body.replace(/^[，、；]+/, '');
  }

  function splitSentences(t) {
    if (!t) return [];
    return t.replace(/([。！？!?；;])/g, '$1\u0003').split('\u0003').filter(function (x) {
      return x.trim().length > 0;
    });
  }

  /* ---------- 主转换 ---------- */
  function convert(input, opts) {
    opts = opts || {};
    var level = opts.level || 'standard';   // light | standard | high
    var scene = opts.scene || 'auto';       // auto | problem | cause | measure | meaning | mixed

    var src = normalize(input);
    if (!src) return null;

    var marks = [];
    var pairs = level === 'light' ? D1 : D1.concat(D2);

    var sents = splitSentences(src);
    var body = sents.map(function (s) {
      var t = rewriteSentence(s, marks, pairs);
      // 语气词收口删除
      t = t.replace(/([啊呀吧呢嘛呗哦啦咯哇诶欸哈])(?=[，。！？；、\s]|$)/g, '');
      t = t.replace(new RegExp('^([\\u0001\\u0002\\d]*)在于'), '$1');
      t = t.replace(/就是/g, '');
      // 设问句转陈述句：「为什么网上乱象这么多？」→「探究网络空间乱象多这一现象的成因」
      t = t.replace(/^(为什么|为啥)([^？?]{4,})[？?]$/, function (all, q, rest) {
        rest = rest.replace(/这么|那么|如此|这样/g, '');
        return '探究' + rest + '这一现象的成因';
      });
      t = t.replace(/\s+([，。！？；、])/g, '$1');
      t = t.replace(/，{2,}/g, '，').replace(/。{2,}/g, '。');
      return t.trim();
    }).filter(Boolean).join('');

    body = stripLeadingPunct(body, marks).trim();
    if (body && !/[。！？；]$/.test(body)) body += '。';
    body = body.replace(/，。/g, '。').replace(/；。/g, '。');

    var topic = pickTopic(src);
    var sc = scene === 'auto' ? guessScene(src) : scene;
    var f = FRAME[sc] || FRAME.mixed;

    var lead = '', tail = '';
    if (level === 'high') {
      lead = f.lead.replace('{t}', topic.key);
      tail = f.tail;
    }

    var text = (lead + body + (tail ? tail : '')).replace(/。{2,}/g, '。');

    return {
      text: text,
      body: body,
      lead: lead,
      tail: tail,
      marks: marks,
      topic: topic.key,
      terms: topic.terms,
      scene: sc,
      chars: text.replace(/\s/g, '').length,
      srcChars: src.replace(/\s/g, '').length
    };
  }

  function guessScene(src) {
    if (/怎么办|咋办|如何|应该|对策|措施|建议/.test(src)) return 'measure';
    if (/为什么|原因|为啥|导致|根源/.test(src)) return 'cause';
    if (/意义|重要|作用|有利于|影响/.test(src)) return 'meaning';
    if (/问题|严重|不足|缺乏|难/.test(src)) return 'problem';
    return 'mixed';
  }

  /* 把带哨兵的文本渲染成带 <mark> 的 HTML */
  function toHTML(text, marks) {
    var safe = esc(text);
    return safe.replace(new RegExp(SENT + '(\\d+)' + SEND, 'g'), function (m, i) {
      var rec = marks[+i];
      if (!rec) return '';
      if (rec.del) return '';
      return '<mark title="原文：' + esc(rec.from) + '">' + esc(rec.to) + '</mark>';
    });
  }

  function toPlain(text, marks) {
    return String(text).replace(new RegExp(SENT + '(\\d+)' + SEND, 'g'), function (m, i) {
      var rec = marks[+i];
      return rec && !rec.del ? rec.to : '';
    });
  }

  global.SL = {
    convert: convert,
    toHTML: toHTML,
    toPlain: toPlain,
    topics: TOPICS,
    dictSize: D1.length
  };
})(typeof window !== 'undefined' ? window : globalThis);
