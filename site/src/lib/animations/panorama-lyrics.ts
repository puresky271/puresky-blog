/**
 * panorama-lyrics.ts — 《端程山》（パノラマ）全曲 45 行歌词、时间轴、双版本译文、MV 画面帧与精读批注。
 *
 * B站版翻译来自 MyGO!!!!! 官方 B 站 MV 中文字幕（BV1Cw4m1k7nW）；
 * 网易云版翻译来自网易云音乐《端程山》（ID: 2599540758）翻译歌词。
 * 时间戳与 site/public/media/songs/lrc/端程山.ja.lrc 严格对齐，MV 截图均取自该行唱段内带对应日文硬字幕的画面帧。
 */

export type IssueDimension = 'grammar' | 'imagery' | 'both';

export interface LyricNote {
  dimension: IssueDimension;
  badge: string;
  title: string;
  /** 日语词汇/语法层面的拆解 */
  grammar?: string;
  /** 意境、画面与 MyGO!!!!! 叙事层面的拆解 */
  imagery?: string;
}

export interface PanoramaStanza {
  id: string;
  title: string;
  subtitle: string;
  startIndex: number;
  endIndex: number;
}

export interface PanoramaLine {
  index: number;
  stanzaId: string;
  /** 秒，和 LRC 完全一致 */
  time: number;
  /** 带振假名标注的原文，如 `歩（ある）` */
  jaRuby: string;
  /** 纯净日文原文 */
  ja: string;
  /** 罗马音 */
  romaji: string;
  /** B站官方 MV 字幕翻译 */
  bili: string;
  /** 网易云音乐版翻译 */
  netease: string;
  /** 对应 MV 画面截图文件名（位于 /media/panorama/ 下），严格匹配该行硬字幕 */
  mvFrame?: {
    src: string;
    timeLabel: string;
    caption: string;
  };
  /** 关键句批注 */
  note?: LyricNote;
}

export const PANORAMA_STANZAS: readonly PanoramaStanza[] = [
  {
    id: 'verse-1',
    title: '第一段 · 主歌 A',
    subtitle: '迷途的泥泞与两个人的车辙',
    startIndex: 0,
    endIndex: 6,
  },
  {
    id: 'chorus-1',
    title: '第二段 · 副歌 A',
    subtitle: '夕空下的步幅与阳炎融解的忧郁',
    startIndex: 7,
    endIndex: 14,
  },
  {
    id: 'verse-2',
    title: '第三段 · 主歌 B',
    subtitle: '磨平的鞋底与名为“端程山”的全景',
    startIndex: 15,
    endIndex: 21,
  },
  {
    id: 'chorus-2',
    title: '第四段 · 副歌 B',
    subtitle: '逆流的时间与竭尽全力的攀登',
    startIndex: 22,
    endIndex: 29,
  },
  {
    id: 'bridge',
    title: '第五段 · 间奏与桥段',
    subtitle: '高耸山峦的剪影与篝火映出的真心',
    startIndex: 30,
    endIndex: 39,
  },
  {
    id: 'outro',
    title: '第六段 · 尾奏副歌',
    subtitle: '走过的远路，都是值得褒奖的今天',
    startIndex: 40,
    endIndex: 44,
  },
];

export const PANORAMA_LINES: readonly PanoramaLine[] = [
  // ── Stanza 1: Verse 1 (0..6) ──
  {
    index: 0,
    stanzaId: 'verse-1',
    time: 10.72,
    jaRuby: 'どこまで歩（ある）けば　いいのかなんて',
    ja: 'どこまで歩けば　いいのかなんて',
    romaji: 'do ko ma de a ru ke ba  i i no ka na n te',
    bili: '不知道还要走多远',
    netease: '要行至何处 才算足够呢',
    mvFrame: {
      src: 'mv-012s-dokomade.jpg',
      timeLabel: '00:12',
      caption: 'MV 00:12：五人走进幽暗的林间山道，画面底部浮现第一句唱词「どこまで歩けば いいのかなんて」。',
    },
    note: {
      dimension: 'grammar',
      badge: '条件句漏译',
      title: '“歩けばいいのか”（走到哪里才算好呢）被砍成了半句',
      grammar:
        '原句是「どこまで歩けばいいのか」（假定条件「～ば」＋「いいのか」，意为“要走到什么地步才算好/才算足够呢”）加上副助词「なんて」（“……之类的事”），直接作下一句「知らないまま」的宾语。B站版把前半句直接合并成“不知道还要走多远”，既吞掉了「いいのか」里对“终点标准”的迷茫发问，又提前透支了下一句的谓语「知らない」。',
      imagery:
        '网易云版“要行至何处 才算足够呢”保留了灯在日记本里自问的语气。MyGO!!!!! 的迷茫从来不是计算“还剩几公里路程”，而是根本不知道“怎样才算走出了迷途”。',
    },
  },
  {
    index: 1,
    stanzaId: 'verse-1',
    time: 16.257,
    jaRuby: '知（し）らないまま　踏（ふ）み締（し）めてた',
    ja: '知らないまま　踏みしめてた',
    romaji: 'shi ra na i ma ma  fu mi shi me te ta',
    bili: '只是一步步地前进',
    netease: '我一无所知地迈出着脚步',
    note: {
      dimension: 'both',
      badge: '动词扁平化',
      title: '「踏み締めてた」是“用力踩实地面”，绝非轻飘飘的“前进”',
      grammar:
        '因为上一句已经把「知らない」提前翻掉了，B站版到了第二句只能硬凑一个“只是”。更可惜的是复合动词「踏み締める」（ふみしめる）：由「踏む」（踩）＋「締める」（勒紧、压实）构成，持续体「～てた」表示一直在一步一步用力踩实脚下的土地。',
      imagery:
        '紧接着下一句就是“沉重的双脚陷进泥土里”。正因为脚下泥泞下陷，才需要用力把每一步踩实（踏み締める）。B站版翻成套话“一步步地前进”，把双脚与泥土搏斗的重量感抽干了。',
    },
  },
  {
    index: 2,
    stanzaId: 'verse-1',
    time: 21.688,
    jaRuby: '重（おも）い足（あし）で　沈（しず）みながら',
    ja: '重い足で　沈みながら',
    romaji: 'o mo i a shi de  shi zu mi na ga ra',
    bili: '踏着沉重的脚步',
    netease: '沉重的脚 一次又一次地踩下',
    mvFrame: {
      src: 'mv-023s-omoiashi.jpg',
      timeLabel: '00:23',
      caption: 'MV 00:23：沉重的脚步踩在林间坡道上（「重い足で 沈みながら」），双脚陷进泥土才在身后压出车辙。',
    },
    note: {
      dimension: 'grammar',
      badge: '整词漏译',
      title: '「沈みながら」（一边下陷着）在 B站版里凭空消失了',
      grammar:
        '原文由「重い足で」（用沉重的双脚）和「沈みながら」（一边往下陷）两部分组成。B站版只写了“踏着沉重的脚步”，把后半句的「沈みながら」彻底漏译。',
      imagery:
        '为什么下一句会出现“车辙（轍）”？因为双脚沉重地陷进泥土（沈みながら），才会在身后压出深深的凹痕。漏掉“下陷”，下一句的“辙”就失去了物理上的因果支撑。',
    },
  },
  {
    index: 3,
    stanzaId: 'verse-1',
    time: 27.013,
    jaRuby: '僕（ぼく）らだけの轍（わだち）　作（つく）って',
    ja: '僕らだけの轍　作って',
    romaji: 'bo ku ra da ke no wa da chi  tsu ku tte',
    bili: '留下独属于我们的轨迹',
    netease: '留下仅属于我们的痕迹',
  },
  {
    index: 4,
    stanzaId: 'verse-1',
    time: 32.394,
    jaRuby: 'ねえ僕（ぼく）が見（み）せたいと思（おも）った景色（けしき）',
    ja: 'ねえ僕が見せたいと思った景色',
    romaji: 'ne e bo ku ga mi se ta i to o mo tta ke shi ki',
    bili: '呐我想展示给你的风景',
    netease: '我想让你望见的景色',
    mvFrame: {
      src: 'mv-035s-misetai.jpg',
      timeLabel: '00:35',
      caption: 'MV 00:35：高松灯在林间停步回望（「ねえ僕が見せたいと思った景色」），那是悄悄想带同伴去看的风景。',
    },
    note: {
      dimension: 'imagery',
      badge: '翻译腔症结',
      title: '“呐”与“展示给你”：把私密的心意翻成了商品展销会',
      grammar:
        '日语感叹词「ねえ」在中文歌词里生译成“呐”，是最典型的早年字幕组翻译腔；同时「見せたい」（見せる的愿望助动词形式）意为“想让你看见”，过去式「思った」带有一点羞怯的回想（“我曾想着要让你看见的风景”）。',
      imagery:
        '“展示给你”是导游或推销员的词，“让你望见”才是少年少女并肩爬山时的心意。网易云版果断省去生硬的“呐”，译作“我想让你望见的景色”，干净而克制。',
    },
  },
  {
    index: 5,
    stanzaId: 'verse-1',
    time: 37.864,
    jaRuby: '君（きみ）が欲（ほ）しい物（もの）とは少（すこ）し',
    ja: '君が欲しいものとは少し',
    romaji: 'ki mi ga ho shi i mo no to wa su ko shi',
    bili: '即使和你想要的',
    netease: '也许会与你所期望的',
  },
  {
    index: 6,
    stanzaId: 'verse-1',
    time: 43.15,
    jaRuby: '違（ちが）ってしまっても',
    ja: '違ってしまっても',
    romaji: 'chi ga tte shi ma tte mo',
    bili: '有些许不同',
    netease: '有些许不同',
  },

  // ── Stanza 2: Chorus 1 (7..14) ──
  {
    index: 7,
    stanzaId: 'chorus-1',
    time: 46.173,
    jaRuby: '夕空（ゆうぞら）に抱（いだ）かれる',
    ja: '夕空に抱かれる',
    romaji: 'yu u zo ra ni i da ka re ru',
    bili: '在夕阳的拥抱下',
    netease: '但你和我',
    note: {
      dimension: 'grammar',
      badge: '连体修饰重组',
      title: '跨行连体修饰：被暮色天空环抱的“你和我”',
      grammar:
        '日语中「夕空に抱かれる」是连体修饰语，直接修饰下一行的「君と僕」。由于主歌末尾是「違ってしまっても」（即便有些许不同），副歌第一句在逻辑上承担了转折。网易云版为了中文语序自然，在 07 行先补出转折主语“但你和我”，把「夕空に抱かれる」落到 08 行“在傍晚天空的怀抱里”；而且「夕空」是“傍晚的天空/暮空”，B站版直接缩成了“夕阳”。',
    },
  },
  {
    index: 8,
    stanzaId: 'chorus-1',
    time: 49.852,
    jaRuby: '君（きみ）と僕（ぼく）の　疎（まば）らな歩幅（ほはば）で',
    ja: '君と僕の　まばらな歩幅で',
    romaji: 'ki mi to bo ku no  ma ba ra na ho ha ba de',
    bili: '你和我 以零散的步伐',
    netease: '在傍晚天空的怀抱里 迈着零星的步伐',
  },
  {
    index: 9,
    stanzaId: 'chorus-1',
    time: 55.257,
    jaRuby: '同（おな）じ色（いろ）に染（そ）まる頬（ほお）を',
    ja: '同じ色に染まる頬を',
    romaji: 'o na ji i ro ni so ma ru ho o o',
    bili: '看着脸颊',
    netease: '撞见彼此被染成同样颜色的脸颊',
    mvFrame: {
      src: 'mv-057s-cheeks.jpg',
      timeLabel: '00:57',
      caption: 'MV 00:57：走出树荫迎面撞上漫天晚霞，爱音与同伴的脸颊被染成同一抹暖橙色（「同じ色に染まる頬を」）。',
    },
    note: {
      dimension: 'both',
      badge: '断句与动词失真',
      title: '“看着脸颊 / 染上相同的色彩”：把一瞬间的惊鸿瞥见翻成了呆板的凝视',
      grammar:
        '原文「同じ色に染まる頬を／見つけて」是典型的跨行宾动结构：「同じ色に染まる」（被染上相同颜色的）修饰名词「頬」（脸颊），宾格助词「を」引出下一行的及物动词「見つけて」（偶然发现、瞥见）。B站版为了凑行，硬把第 09 行拆成“看着脸颊”，第 10 行写成“染上相同的色彩”，不仅篡改了修饰关系（仿佛眼睁睁看着脸颊慢慢变色），还把「見つける」（发觉、撞见）降格成了平庸的“看着”。',
      imagery:
        '两个步幅不一致（まばらな歩幅）、心里各有笨拙心事的人，在夕阳下转过头，突然撞见（見つけて）对方的脸颊原来也被晚霞染成了和自己一模一样的颜色。正是这“不期而遇的同色”，才让她们在无需言语的瞬间感到心被轻轻抚平。网易云版“撞见彼此被染成同样颜色的脸颊 / 那一瞬 会将心久久抚慰”把这一拍的惊喜与余韵抓得极准。',
    },
  },
  {
    index: 10,
    stanzaId: 'chorus-1',
    time: 60.475,
    jaRuby: '見（み）つけて　心（こころ）が撫（な）でられてくよ',
    ja: '見つけて　こころが撫でられてくよ',
    romaji: 'mi tsu ke te  ko ko ro ga na de ra re te ku yo',
    bili: '染上相同的色彩 心灵被抚慰',
    netease: '那一瞬 会将心久久抚慰',
  },
  {
    index: 11,
    stanzaId: 'chorus-1',
    time: 67.372,
    jaRuby: '憂鬱（ゆううつ）が解（と）けてく　陽炎（かげろう）の空（そら）',
    ja: '憂鬱が解けてく　陽炎の空',
    romaji: 'yu u u tsu ga to ke te ku  ka ge ro u no so ra',
    bili: '忧郁在阳炎的天空中消散',
    netease: '艳阳的天空 将忧愁消融',
    mvFrame: {
      src: 'mv-070s-kagerou.jpg',
      timeLabel: '01:10',
      caption: 'MV 01:10：微热摇曳的霞光天空下，一路积攒的阴翳像冰块一样渐渐消融（「憂鬱が解けてく 陽炎の空」）。',
    },
    note: {
      dimension: 'both',
      badge: '意象与温度',
      title: '「解けてく」是冰块般的“消融”，「陽炎」在中文里的两难',
      grammar:
        '「解ける／溶ける」（とける）加补助动词「ていく」（てく），核心意象是“原本凝固、纠结成一团的忧郁，像冰块在温热气流中渐渐融化开去”。B站版译作“消散”，丢掉了与「陽炎」（受热上升摇曳的气流/热浪）之间的温度呼应；同时直接照搬日文汉字“阳炎的天空”，对不熟悉日语词源的中文读者来说近乎黑话。网易云版用“消融”精准还原了「解けてく」，汉语句式的文学质感远胜“在阳炎的天空中消散”。',
    },
  },
  {
    index: 12,
    stanzaId: 'chorus-1',
    time: 72.706,
    jaRuby: '優（やさ）しさに満（み）ちる',
    ja: 'やさしさに満ちる',
    romaji: 'ya sa shi sa ni mi chi ru',
    bili: '充满了温柔',
    netease: '取而代之的是满怀的温柔',
  },
  {
    index: 13,
    stanzaId: 'chorus-1',
    time: 76.288,
    jaRuby: '一休（ひとやす）みしよう　荷物（にもつ）をおろして',
    ja: 'ひとやすみしよう　荷物をおろして',
    romaji: 'hi to ya su mi shi yo u  ni mo tsu o o ro shi te',
    bili: '放下行李 休息片刻吧',
    netease: '稍微休息一会吧 把行囊放下',
    note: {
      dimension: 'imagery',
      badge: '词藻气味',
      title: '“行李”与“行囊”：出差旅客还是登山旅人？',
      imagery:
        '日语「荷物」（にもつ）涵盖范围很广，但在徒步登高、围炉夜话的语境里，翻成“行李”立刻让人联想到高铁站和机场转盘；网易云版译作“行囊”，并保留了原句倒装的呼吸顺序（先提议“稍微休息一会吧”，再补一句“把行囊放下”），松弛感顿显。',
    },
  },
  {
    index: 14,
    stanzaId: 'chorus-1',
    time: 82.934,
    jaRuby: '今日（きょう）までの僕（ぼく）らに　想（おも）いを寄（よ）せて',
    ja: '今日までの僕らに　想いを寄せて',
    romaji: 'kyo u ma de no bo ku ra ni  o mo i o yo se te',
    bili: '回忆起 到今天为止的我们',
    netease: '将念想 寄托给行至如今的我们',
    mvFrame: {
      src: 'mv-086s-omoiwo.jpg',
      timeLabel: '01:26',
      caption: 'MV 01:26：五人在半山腰卸下行囊席地而坐，把心意投向一路走来的彼此（「今日までの僕らに 想いを寄せて」）。',
    },
    note: {
      dimension: 'both',
      badge: '惯用语降维',
      title: '「想いを寄せる」不是简单的“回忆起”，而是“把心意与牵挂投向……”',
      grammar:
        '日语惯用搭配「～に想いを寄せる」意为“对……抱有思念、倾注心意、遥寄情思”。如果是单纯的回想，日语会用「思い出す」或「振り返る」。',
      imagery:
        '站在半山腰望向来路时，现在的我们与“直到今天为止一路跌跌撞撞走来的我们”拉开了温柔的距离，像看着一群努力笨拙的朋友一样，把心意与疼惜投向过去的自己。B站版用“回忆起”三个字草草打发，既丢了「寄せる」的方向感，又把“今日までの僕ら”翻成生硬的公文体“到今天为止的我们”（对比网易云版“行至如今的我们”）。',
    },
  },

  // ── Stanza 3: Verse 2 (15..21) ──
  {
    index: 15,
    stanzaId: 'verse-2',
    time: 93.461,
    jaRuby: '知（し）らない間（あいだ）に　磨（す）り減（へ）っていた',
    ja: '知らない間に　すり減っていた',
    romaji: 'shi ra na i a i da ni  su ri he tte i ta',
    bili: '不知不觉中 磨损的鞋底',
    netease: '不知不觉中 鞋底渐渐消磨',
  },
  {
    index: 16,
    stanzaId: 'verse-2',
    time: 98.957,
    jaRuby: '靴底（くつぞこ）にも気付（きづ）かないくらい',
    ja: '靴底にも気づかないくらい',
    romaji: 'ku tsu zo ko ni mo ki zu ka na i ku ra i',
    bili: '我没有察觉到的原因',
    netease: '我却丝毫没有注意到',
    mvFrame: {
      src: 'mv-101s-shoes.jpg',
      timeLabel: '01:41',
      caption: 'MV 01:41：画面给到五个人踏在草坡上的鞋履特写（「靴底にも気づかないくらい」），鞋底在不知不觉间已被长路磨薄。',
    },
    note: {
      dimension: 'grammar',
      badge: '严重语法错译',
      title: '把程度副助词「くらい」硬生生错译成“……的原因”',
      grammar:
        '这是全曲 B站版最刺眼的语法事故。原文四行是一个一气呵成的单句：「（不知不觉磨薄了的）靴底にも気づかないくらい、僕は少し上を向いて歩くことができてたのかな」。这里的「～くらい」（程度助词）表示“甚至到了连鞋底磨薄都没注意到的地步，我是不是已经能稍微抬起头走路了呢？”。B站版竟然把「気づかないくらい」翻成了“我没有察觉到的原因 / 是不是我变得能够……”，无中生有造出一个“原因”，把原本轻盈自省的程度状语拆成了笨拙的因果说教。',
      imagery:
        '以前因为害怕和迷茫，走路时总是死死盯着地面和脚尖；如今终于不再只盯着鞋底，所以连鞋底磨薄了都没发觉。这种“后知后觉的成长”本该是一抹淡淡的惊喜，一加“……的原因”，诗意荡然无存。',
    },
  },
  {
    index: 17,
    stanzaId: 'verse-2',
    time: 104.363,
    jaRuby: '僕（ぼく）は少（すこ）し上（うえ）を向（む）いて',
    ja: '僕は少し上を向いて',
    romaji: 'bo ku wa su ko shi u e o mu i te',
    bili: '是不是我变得能够',
    netease: '或许我',
  },
  {
    index: 18,
    stanzaId: 'verse-2',
    time: 109.768,
    jaRuby: '歩（ある）くことができてたのかな',
    ja: '歩くことができてたのかな',
    romaji: 'a ru ku ko to ga de ki te ta no ka na',
    bili: '稍微抬头前行了呢',
    netease: '也能稍稍做到向上攀登了吗',
  },
  {
    index: 19,
    stanzaId: 'verse-2',
    time: 115.108,
    jaRuby: 'この目（め）に映（うつ）してる　パノラマ全部（ぜんぶ）',
    ja: 'この目に映してる　パノラマぜんぶ',
    romaji: 'ko no me ni u tsu shi te ru  pa no ra ma ze n bu',
    bili: '将引入眼帘中的全景',
    netease: '将眼前映出的全景',
    mvFrame: {
      src: 'mv-117s-panorama.jpg',
      timeLabel: '01:57',
      caption: 'MV 01:57：高松灯的眼眸里映出整片天空与远山的パノラマ（「この目に映してる パノラマぜんぶ」）。',
    },
    note: {
      dimension: 'both',
      badge: '错字与点题失守',
      title: '“引入眼帘”的语病，以及对歌名《端程山》的完全失察',
      grammar:
        '首先，汉语里只有“映入眼帘”或“引……入胜”，根本没有“将引入眼帘中的全景”这种搭配，属于明显的同音错别字（映→引）兼杂糅语病。其次，第 19-20 行是全曲最核心的歌名回收句：「パノラマぜんぶ／端（はし）から端（はし）まで切り取って」。歌名《端程山》写作汉字「端程山」，官方注音就是「パノラマ（Panorama）」。为什么用“端程山”三个汉字训读 Panorama？因为山峦的全景是从这一端（端，はし）延展到那一端（端，はし）的漫长山程（程山）。',
      imagery:
        '知道了“端程山”的字源，再看第 20 行「端から端まで切り取って」：它必须保留“端”字，才能让听众恍然大悟歌名里的「端」从何而来。网易云版译为“从此端到彼端剪切出来”，精准保住了“端—端”的字面呼应；B站版却漫不经心地译成“从头到尾剪辑下来”，不仅把静态空间上的山景画幅（端から端）错当成时间线上的视频剪辑（从头到尾），还亲手抹掉了作词家藤原优树埋下的歌名彩蛋。',
    },
  },
  {
    index: 20,
    stanzaId: 'verse-2',
    time: 120.48,
    jaRuby: '端（はし）から端（はし）まで切（き）り取（と）って',
    ja: '端から端まで切り取って',
    romaji: 'ha shi ka ra ha shi ma de ki ri to tte',
    bili: '从头到尾剪辑下来',
    netease: '从此端到彼端剪切出来',
  },
  {
    index: 21,
    stanzaId: 'verse-2',
    time: 125.908,
    jaRuby: '何度（なんど）も　鮮（あざ）やかに触（ふ）れたいよ',
    ja: '何度も　鮮やかに触れたいよ',
    romaji: 'na n do mo  a za ya ka ni fu re ta i yo',
    bili: '想要无数次 鲜明地触碰啊',
    netease: '这份鲜艳 真想无数次地去感受',
  },

  // ── Stanza 4: Chorus 2 (22..29) ──
  {
    index: 22,
    stanzaId: 'chorus-2',
    time: 131.54,
    jaRuby: '滔々（とうとう）と流（なが）れる時間（とき）に少（すこ）し',
    ja: 'とうとうと流れる時間（とき）に少し',
    romaji: 'to u to u to na ga re ru to ki ni su ko shi',
    bili: '在滔滔流淌的时间中',
    netease: '这缓缓流逝的时间',
    note: {
      dimension: 'grammar',
      badge: '程度副词漏译',
      title: '「少し逆らうみたいに」：只是“稍微”逆着时间，不是宏大的“逆流而上”',
      grammar:
        '原文第 22 行末尾的「少し」（稍微、些许）跨行修饰第 23 行的「逆らうみたいに」（像是跟……小小地作对/逆着它一样）。B站版直接把「少し」漏得一干二净，大笔一挥写成成语“仿佛逆流而上”。',
      imagery:
        '高松灯的词作世界里从没有征服时间、逆天改命的狂妄。面对滚滚流逝的光阴，把眼前的风景裁下来珍藏、一步一步往山上爬，只是少年人“像要把流逝的时间稍稍挽留/逆转些许一般”的温柔抵抗。漏掉一个「少し」，人物性格就从高松灯变成了热血少年漫主角。',
    },
  },
  {
    index: 23,
    stanzaId: 'chorus-2',
    time: 136.804,
    jaRuby: '逆（さか）らうみたいに',
    ja: '逆らうみたいに',
    romaji: 'sa ka ra u mi ta i ni',
    bili: '仿佛逆流而上',
    netease: '似要将其逆转些许般',
  },
  {
    index: 24,
    stanzaId: 'chorus-2',
    time: 140.489,
    jaRuby: '振（ふ）り絞（しぼ）ってる　ありったけの　一歩（いっぽ）をつないで',
    ja: '振り絞ってる　ありったけの　一歩をつないで',
    romaji: 'fu ri shi bo tte ru  a ri tta ke no  i ppo o tsu na i de',
    bili: '用尽全力 连接每一步',
    netease: '拼尽全力 迈出每一跬步',
    mvFrame: {
      src: 'mv-144s-climb.jpg',
      timeLabel: '02:24',
      caption: 'MV 02:24：五人排成一列向陡峭的山坡上方攀登（「振り絞ってる ありったけの 一歩をつないで」）。',
    },
  },
  {
    index: 25,
    stanzaId: 'chorus-2',
    time: 149.705,
    jaRuby: '登（のぼ）ってみるよ',
    ja: '登ってみるよ',
    romaji: 'no bo tte mi ru yo',
    bili: '试着往上攀登吧',
    netease: '我会努力去攀登',
  },
  {
    index: 26,
    stanzaId: 'chorus-2',
    time: 152.649,
    jaRuby: '堂々（どうどう）巡（めぐ）りでも　辛辛（からがら）でも',
    ja: '堂々巡りでも　からがらでも',
    romaji: 'do u do u me gu ri de mo  ka ra ga ra de mo',
    bili: '即使是兜兜转转 身心俱疲',
    netease: '即便彷徨无措 或是力有不逮',
    note: {
      dimension: 'both',
      badge: '因果与叠词',
      title: '「堂々巡り」「からがら」「しゃにむに」：MyGO!!!!! 式的狼狈与莽撞',
      grammar:
        '这两行连用了三个极具质感的状态词：「堂々巡り」（原地打转、兜圈子）、「からがら」（常见于「命からがら」，意为好不容易、勉勉强强、狼狈地死里逃生）、「遮二無二（しゃにむに）」（不管不顾、横冲直撞、拼了命地）。此外注意「しゃにむにきたから」末尾的接续助词「から」（因为……），它解释的是为什么下一句连疲惫的双脚都能觉得骄傲：“正因为我们是这样不管不顾拼命走过来的，所以连疲惫的脚下都值得自豪”。',
      imagery:
        'B站版把「から」的因果关系当成了转折（“即使是兜兜转转 身心俱疲 / 我们还是竭尽全力”），断开了 27 行与 28-29 行的逻辑链条；网易云版“即便彷徨无措 或是力有不逮 / 因为是拼命地走到了今天 / 即使是这稍显疲态的双脚……也一定能引以为傲”则完整保留了「でも……から……さえ……誇らしく思える」的四层递进。',
    },
  },
  {
    index: 27,
    stanzaId: 'chorus-2',
    time: 157.994,
    jaRuby: '遮二無二（しゃにむに）きたから',
    ja: 'しゃにむにきたから',
    romaji: 'sha ni mu ni ki ta ka ra',
    bili: '我们还是竭尽全力',
    netease: '因为是拼命地走到了今天',
  },
  {
    index: 28,
    stanzaId: 'chorus-2',
    time: 161.662,
    jaRuby: 'ちょっと疲（つか）れた　足元（あしもと）さえ　ああ',
    ja: 'ちょっと疲れた　足元さえ　ああ',
    romaji: 'cho tto tsu ka re ta  a shi mo to sa e  a a',
    bili: '虽然有些疲惫 但脚步 啊啊',
    netease: '即使是这稍显疲态的双脚 啊啊',
    note: {
      dimension: 'grammar',
      badge: '副助词误译',
      title: '「足元さえ」是“就连这疲惫的双脚也……”，不是“虽然疲惫但脚步……”',
      grammar:
        '副助词「さえ」表示极端举例（“甚至连……都”），「ちょっと疲れた」是修饰「足元」的定语（“稍微有些疲惫的双脚/脚下”）。B站版把它拆成让步转折句“虽然有些疲惫 但脚步 啊啊”，紧接着下一句“在黄昏中 显得如此自豪”，不仅语法完全跑偏，中文读起来也支离破碎。',
    },
  },
  {
    index: 29,
    stanzaId: 'chorus-2',
    time: 168.276,
    jaRuby: '誇（ほこ）らしく思（おも）える　黄昏（たそがれ）の中（なか）',
    ja: '誇らしく思える　黄昏のなか',
    romaji: 'ho ko ra shi ku o mo e ru  ta so ga re no na ka',
    bili: '在黄昏中 显得如此自豪',
    netease: '也一定能引以为傲',
    mvFrame: {
      src: 'mv-171s-dusk.jpg',
      timeLabel: '02:51',
      caption: 'MV 02:51：金红色的黄昏笼罩山坡，疲惫却笃定的背影（「誇らしく思える 黄昏のなか」）。',
    },
  },

  // ── Stanza 5: Bridge (30..39) ──
  {
    index: 30,
    stanzaId: 'bridge',
    time: 174.973,
    jaRuby: '朧（おぼろ）げに浮（う）かんだ',
    ja: 'おぼろげに浮かんだ',
    romaji: 'o bo ro ge ni u ka n da',
    bili: '朦胧中浮现的',
    netease: '高耸山峦 于黄昏之中浮现',
  },
  {
    index: 31,
    stanzaId: 'bridge',
    time: 178.349,
    jaRuby: '堆（うずたか）い山並（やまな）みに怖（お）じけても',
    ja: 'うずたかい山並みにおじけても',
    romaji: 'u zu ta ka i ya ma na mi ni o ji ke te mo',
    bili: '高耸的山脉让人有些畏惧',
    netease: '就算令人生畏',
    mvFrame: {
      src: 'mv-181s-ridge.jpg',
      timeLabel: '03:01',
      caption: 'MV 03:01：暮色渐沉，远处层峦叠嶂的群山在靛蓝夜空中浮现出巨大剪影（「うずたかい山並みにおじけても」）。',
    },
  },
  {
    index: 32,
    stanzaId: 'bridge',
    time: 185.566,
    jaRuby: '思（おも）いがけない物（もの）',
    ja: '思いがけないもの',
    romaji: 'o mo i ga ke na i mo no',
    bili: '但也有可能遇见',
    netease: '但追寻着似要邂逅的奇遇',
    note: {
      dimension: 'imagery',
      badge: '说明书词藻',
      title: '“遇见意外之物”像是RPG游戏开宝箱，毫无文学温度',
      grammar:
        '「思いがけないもの（に）出会えそうで」直译是“仿佛能邂逅意想不到的事物”。B站版生硬地切分成“但也有可能遇见 / 意外之物 所以迈出步伐吧”，其中“意外之物”四个字散发着浓烈的说明书与劣质机翻味。',
      imagery:
        '对比网易云版：“但追寻着似要邂逅的奇遇 / 会迈出脚步的”。同样是传达「思いがけないものに出会えそう」，用“似要邂逅的奇遇”替代干巴巴的“意外之物”，瞬间契合了夜色山林里既敬畏又憧憬的心境。',
    },
  },
  {
    index: 33,
    stanzaId: 'bridge',
    time: 188.929,
    jaRuby: '出会（であえ）えそうで　踏（ふ）み出（だ）すよ',
    ja: '出会えそうで　踏みだすよ',
    romaji: 'de a e so u de  fu mi da su yo',
    bili: '意外之物 所以迈出步伐吧',
    netease: '会迈出脚步的',
  },
  {
    index: 34,
    stanzaId: 'bridge',
    time: 194.938,
    jaRuby: '僕（ぼく）ら連（つら）なって',
    ja: '僕ら連なって',
    romaji: 'bo ku ra tsu ra na tte',
    bili: '我们连在一起',
    netease: '我们一起',
    note: {
      dimension: 'both',
      badge: '望文生义',
      title: '「連なって」是“结伴成行、排成一列走”，不是肉体“连在一起”',
      grammar:
        '自动词「連なる」（つらなる）意为“成群结队、排成一列同行”（如山脉连绵、旅人结伴相随），直接呼应前一句「踏みだすよ」（迈出脚步吧，我们结伴同行）。B站版看见汉字“連”就脱口而出“我们连在一起”，在中文里显得诡异又滑稽。',
    },
  },
  {
    index: 35,
    stanzaId: 'bridge',
    time: 200.447,
    jaRuby: 'とろとろ焚（た）いてる',
    ja: 'とろとろ焚いてる',
    romaji: 'to ro to ro ta i te ru',
    bili: '在微微燃烧的',
    netease: '篝火缓缓燃烧着',
    mvFrame: {
      src: 'mv-202s-bonfire.jpg',
      timeLabel: '03:22',
      caption: 'MV 03:22：夜幕降临，山野间的篝火静静跳跃（「とろとろ焚いてる」），暖黄火光驱散了寒意。',
    },
  },
  {
    index: 36,
    stanzaId: 'bridge',
    time: 204.166,
    jaRuby: '囲（かこ）み火（ひ）から',
    ja: '囲み火から',
    romaji: 'ka ko mi hi ka ra',
    bili: '篝火旁边',
    netease: '从那之中',
    note: {
      dimension: 'both',
      badge: '光影动线',
      title: '「囲み火から照らし出されてく」：从篝火中映照而出的真心',
      grammar:
        '注意格助词「から」（从……之中）与复合动词「照らし出されてく」（被映照出来、一点点显露出来）。原文并不是静态的“在篝火旁边，被照亮的是真挚的情感”（那样日语会用「囲み火のそばで」），而是火光从缓缓燃烧的篝火里散发出来（囲み火から），把平日藏在暗处的心事一点点从阴影里照亮、显影出来（照らし出されてく）。',
      imagery:
        'MyGO!!!!! 的五个人平时都是别扭、嘴硬、不擅长坦率表达的孩子。只有在夜深人静围坐篝火时，跳动的火苗像显影液一样，把她们平时说不出口的「素直な気持ち」（坦率的心意 / 藏在心中的想法）照亮。紧接着下一句高松灯轻轻唱出：“ああ今なら 話せそうなんだ 聞いてくれるかい”（现在的话，感觉能说出口了，你愿意听我说吗）。这是全曲最催泪的桥段。',
    },
  },
  {
    index: 37,
    stanzaId: 'bridge',
    time: 205.833,
    jaRuby: '照（て）らし出（だ）されてく',
    ja: '照らし出されてく',
    romaji: 'te ra shi da sa re te ku',
    bili: '被照亮的',
    netease: '照来了光亮',
  },
  {
    index: 38,
    stanzaId: 'bridge',
    time: 209.528,
    jaRuby: '素直（すなお）な気持（きも）ち',
    ja: '素直な気持ち',
    romaji: 'su na o na ki mo chi',
    bili: '是真挚的情感',
    netease: '藏在心中的想法',
  },
  {
    index: 39,
    stanzaId: 'bridge',
    time: 212.384,
    jaRuby: 'ああ今（いま）なら　話（はな）せそうなんだ　聞（き）いてくれるかい',
    ja: 'ああ今なら　話せそうなんだ　聞いてくれるかい',
    romaji: 'a a i ma na ra  ha na se so u na n da  ki i te ku re ru ka i',
    bili: '啊啊现在的话 可以讲出来了呢 你愿意听吗',
    netease: '现在的话 感觉可以说出口 能请你听听吗',
    mvFrame: {
      src: 'mv-216s-confess.jpg',
      timeLabel: '03:36',
      caption: 'MV 03:36：篝火映红脸庞，彼此对视倾听（「ああ今なら 話せそうなんだ 聞いてくれるかい」）。',
    },
  },

  // ── Stanza 6: Outro Chorus (40..44) ──
  {
    index: 40,
    stanzaId: 'outro',
    time: 222.165,
    jaRuby: '遠回（とおまわ）りしてきた　その分（ぶん）だけ',
    ja: '遠まわりしてきた　そのぶんだけ',
    romaji: 'to o ma wa ri shi te ki ta  so no bu n da ke',
    bili: '绕了这么远的路 就与那一份',
    netease: '已行至远路 也正因如此',
    note: {
      dimension: 'both',
      badge: '点睛句崩塌',
      title: '“就与那一份 / 寻觅到的风景 / 携手同行”：把点题句翻成了病句',
      grammar:
        '这是全曲最后的高潮，也是 MyGO!!!!! 6th LIVE 演唱会标题的出处。原文结构非常清晰：「遠まわりしてきた そのぶんだけ（正因为绕了那么多远路，恰如所绕远路的份量一样）見つけた景色を（把正因绕路才得以发现的风景）たずさえながら（怀揣在身旁/随身携带着）ふりかえりながら（一边频频回首）」。\n\nB站版犯了两个致命错误：\n1. 把表示程度与因果对等的「そのぶんだけ」硬生生拆成了介词短语“就与那一份……”，然后跟后文的「携えながら」拼凑成“就与那一份寻觅到的风景携手同行”。\n2. 他动词「携える」（たずさえる）接宾语「景色を」时，意思是“随身带着、怀揣着（这片风景记忆继续前行）”。只有「手を携える」才译作“携手”。把「景色を携える」翻成“与风景携手同行”，既在日语语法上张冠李戴，又在中文里造出了“人和风景手拉手走路”的荒诞拟人。',
      imagery:
        'MyGO!!!!! 的精神内核是“迷子でもいい、迷子でも進め”（迷路也没关系，迷路着也要前进）。为什么迷路也没关系？第 40-42 行给出了最温柔的回答：因为绕了远路（遠まわりしてきた），才看见了直奔终点的人永远看不见的风景（そのぶんだけ見つけた景色）。把这份唯有绕路才能拾得的风景怀揣在行囊里，一边带往更远方，一边回头望。B站版那句“就与那一份寻觅到的风景携手同行”，不仅语法不通，更把“绕远路才收获风景”的救赎逻辑彻底搅浑了。',
    },
  },
  {
    index: 41,
    stanzaId: 'outro',
    time: 227.519,
    jaRuby: '見（み）つけた景色（けしき）を',
    ja: '見つけた景色を',
    romaji: 'mi tsu ke ta ke shi ki o',
    bili: '寻觅到的风景',
    netease: '将曾饱览的景色一边带往更远方',
  },
  {
    index: 42,
    stanzaId: 'outro',
    time: 231.127,
    jaRuby: '携（たずさ）えながら　振（ふ）り返（かえ）りながら',
    ja: 'たずさえながら　ふりかえりながら',
    romaji: 'ta zu sa e na ga ra  fu ri ka e ri na ga ra',
    bili: '携手同行 并一边回望',
    netease: '又一边无数次回头望',
    mvFrame: {
      src: 'mv-234s-tazusae.jpg',
      timeLabel: '03:54',
      caption: 'MV 03:54：五人怀揣着一路寻获的风景向山顶冲刺，一边频频回望来路（「携えながら 振り返りながら」）。',
    },
  },
  {
    index: 43,
    stanzaId: 'outro',
    time: 237.779,
    jaRuby: '今日（きょう）までの僕（ぼく）らを見（み）つめていよう',
    ja: '今日までの僕らを見つめていよう',
    romaji: 'kyo u ma de no bo ku ra o mi tsu me te i yo u',
    bili: '凝视着到今天为止的我们吧',
    netease: '像这样 为行至今日的我们注以目光吧',
  },
  {
    index: 44,
    stanzaId: 'outro',
    time: 245.749,
    jaRuby: '今日（きょう）までの僕（ぼく）らを褒（ほ）めてあげよう',
    ja: '今日までの僕らを褒めてあげよう',
    romaji: 'kyo u ma de no bo ku ra o ho me te a ge yo u',
    bili: '称赞下到今天为止的我们吧',
    netease: '像这样 为行至今日的我们致以褒扬吧',
    mvFrame: {
      src: 'mv-248s-praise.jpg',
      timeLabel: '04:08',
      caption: 'MV 04:08：全曲最后一句（「今日までの僕らを褒めてあげよう」），五人登顶俯瞰破晓时分的端程山全景。',
    },
    note: {
      dimension: 'both',
      badge: '收束韵律失守',
      title: '“称赞下到今天为止的我们吧” vs “为行至今日的我们致以褒扬吧”',
      grammar:
        '最后两行是严格的排比对句：「今日までの僕らを見つめていよう／今日までの僕らを褒めてあげよう」。其中「褒めてあげよう」用了授受补助动词「～てあげる」的劝诱形，带有一种把满身伤痕、走过漫长弯路的自己当成心疼的对象，温柔地拍拍肩膀给予肯定的慈悲感。',
      imagery:
        '在整首歌情绪推至巅峰的收尾处，B站版居然写出了一句口水话“称赞下到今天为止的我们吧”。那个轻佻的“下”字和死板的“到今天为止”，就像在交响乐最后一个长音上突然踩了一脚塑料水瓶。反观网易云版用“像这样 为行至今日的我们注以目光吧 / 像这样 为行至今日的我们致以褒扬吧”完成工整的复沓收束，庄重、温柔而余音绕梁。',
    },
  },
];
