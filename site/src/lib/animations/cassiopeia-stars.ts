/**
 * cassiopeia-stars.ts — 仙后座五颗主星（王良一、王良四、策、阁道三、阁道二）的天体物理数据与空间几何参数。
 *
 * 数据来源：Hipparcos 新归算星表（van Leeuwen 2007）、Gaia DR3、IAU 恒星名称工作组（WGSN）核准星名、
 * CHARA 光学干涉阵列实测论文，以及伊世同《中西对照恒星图表》。
 */

export interface CassiopeiaStar {
  /** 拜耳字母键名 */
  id: 'beta' | 'alpha' | 'gamma' | 'delta' | 'epsilon';
  /** 拜耳名称 */
  bayer: string;
  /** 希腊字母简写 */
  greek: string;
  /** 中国传统星官星名 */
  zhName: string;
  /** 所属中国星官与星宿 */
  zhAsterism: string;
  /** IAU / 西方专名 */
  enName: string;
  /** 阿拉伯/西方词源本义 */
  enMeaning: string;
  /** 赤经（J2000 文本） */
  raText: string;
  /** 赤纬（J2000 文本） */
  decText: string;
  /** 赤经（度，用于天球与三维坐标换算） */
  raDeg: number;
  /** 赤纬（度，用于天球与三维坐标换算） */
  decDeg: number;
  /** 视星等 V */
  apparentMag: number;
  /** 视星等补充说明（变星范围） */
  magNote: string;
  /** 绝对星等 MV */
  absoluteMag: number;
  /** 距离地球（光年） */
  distanceLy: number;
  /** 距离误差（光年） */
  distanceErr: number;
  /** 秒差距（pc） */
  distancePc: number;
  /** 光谱分类 */
  spectralType: string;
  /** 演化阶段简述 */
  evolutionStage: string;
  /** 表面有效温度（K） */
  temperatureK: number;
  /** 温度补充说明（如极区/赤道差异） */
  tempNote: string;
  /** 恒星赤道或平均半径（太阳半径 R☉） */
  radiusSolar: number;
  /** 恒星极半径（太阳半径 R☉，扁球体恒星专用） */
  polarRadiusSolar: number;
  /** 恒星质量（太阳质量 M☉） */
  massSolar: number;
  /** 恒星光度（太阳光度 L☉） */
  luminositySolar: number;
  /** 投影自转线速度 v sin i（km/s） */
  rotationKmS: number;
  /** 恒星年龄估计 */
  ageText: string;
  /** 恒星视觉色温主色（HEX） */
  color: string;
  /** 恒星光晕色 */
  glowColor: string;
  /** 天球平面投影基准坐标（0..1000 归一化画布，视角 0° 时构成的经典 W 折线） */
  skyX: number;
  skyY: number;
  /** 一句话核心看点 */
  headline: string;
  /** 深度天体物理与空间解说 */
  summary: string;
  /** 中国星官典故与西方神话对照 */
  lore: string;
}

/**
 * 按天球赤经从西向东（β 王良一 -> α 王良四 -> γ 策 -> δ 阁道三 -> ε 阁道二）顺序排列。
 */
export const CASSIOPEIA_STARS: readonly CassiopeiaStar[] = [
  {
    id: 'beta',
    bayer: 'β Cas',
    greek: 'β',
    zhName: '王良一',
    zhAsterism: '奎宿 · 王良星官',
    enName: 'Caph',
    enMeaning: '染过指甲花的手掌（al-Kaff al-Khadib）',
    raText: '00h 09m 10.7s',
    decText: '+59° 08′ 59″',
    raDeg: 2.2945,
    decDeg: 59.1498,
    apparentMag: 2.28,
    magNote: '2.25 ~ 2.31 等（盾牌座 δ 型脉动变星）',
    absoluteMag: 1.3,
    distanceLy: 54.7,
    distanceErr: 0.3,
    distancePc: 16.8,
    spectralType: 'F2 III',
    evolutionStage: '黄白色次巨星 / 巨星过渡态',
    temperatureK: 6700,
    tempNote: '极区约 7,208 K，赤道约 6,167 K（引力昏暗效应）',
    radiusSolar: 3.79,
    polarRadiusSolar: 3.06,
    massSolar: 1.91,
    luminositySolar: 21.3,
    rotationKmS: 72.4,
    ageText: '约 11.8 亿年',
    color: '#fff3d6',
    glowColor: '#fde2a8',
    skyX: 148,
    skyY: 132,
    headline: '五曜之中离地球最近的“邻家向导”，自转呈扁球形的脉动变星',
    summary:
      '王良一距离地球仅 54.7 光年，是五颗主星里最近的邻居。正因距离近，它只需 21.3 倍太阳光度就能在夜空达到 2.28 等。它每 21.4 小时自转一周，离心力将赤道半径拉长到比极半径宽 24%，并带有周期约 2.5 小时的微弱脉动。',
    lore:
      '在古阿拉伯星图里，它是“染红的手掌（Caph）”的指尖，同时恰好处在赤经 0h 附近的二分圈上，被西方航海家奉为丈量春分点的“三大向导星”之首。在中国古星官中，它代表春秋时期晋国善御名家王良本人，正握缰立于四马天驷之侧。',
  },
  {
    id: 'alpha',
    bayer: 'α Cas',
    greek: 'α',
    zhName: '王良四',
    zhAsterism: '奎宿 · 王良星官',
    enName: 'Schedar',
    enMeaning: '王后的胸膛（阿拉伯语 ṣadr）',
    raText: '00h 40m 30.4s',
    decText: '+56° 32′ 14″',
    raDeg: 10.1268,
    decDeg: 56.5373,
    apparentMag: 2.24,
    magNote: '常年稳定在 2.24 等，平时为五曜最亮',
    absoluteMag: -2.01,
    distanceLy: 228,
    distanceErr: 2,
    distancePc: 70.0,
    spectralType: 'K0 IIIa',
    evolutionStage: '水平分支橙色红巨星（核心氦聚变）',
    temperatureK: 4625,
    tempNote: '4,625 ± 42 K（五颗主星中表面温度最低）',
    radiusSolar: 43.14,
    polarRadiusSolar: 43.0,
    massSolar: 4.98,
    luminositySolar: 734,
    rotationKmS: 6.71,
    ageText: '约 2.2 亿年',
    color: '#ffb464',
    glowColor: '#ff9636',
    skyX: 294,
    skyY: 254,
    headline: '体积最庞大的琥珀色氦聚变巨星，直径相当于太阳的 43 倍',
    summary:
      '如果你在清朗的秋夜仔细分辨五颗星的色泽，唯独王良四泛着温润的橙金色。它已经耗尽核心的氢，迈入以氦聚变为主的水平分支红巨星阶段，表面温度降至 4,625 K，却把躯体膨胀到了太阳半径的 43 倍，释放出 734 倍于太阳的光度。',
    lore:
      '拜耳将它定为 α 星，它的阿拉伯语专名 Schedar 意为“胸膛”，精准落在托勒密星图中卡西欧佩亚王后的心口位置。而在中国奎宿里，王良四是造父之徒王良所驾驭的“天驷”四匹骏马中最矫健的一匹。',
  },
  {
    id: 'gamma',
    bayer: 'γ Cas',
    greek: 'γ',
    zhName: '策',
    zhAsterism: '奎宿 · 策星官（独星）',
    enName: 'Tsih / Navi',
    enMeaning: '王良手中的马鞭（策）/ 阿波罗宇航员导航星',
    raText: '00h 56m 42.5s',
    decText: '+60° 43′ 00″',
    raDeg: 14.1771,
    decDeg: 60.7167,
    apparentMag: 2.39,
    magNote: '爆发型壳层变星（历史波动 1.6 ~ 3.0 等）',
    absoluteMag: -3.98,
    distanceLy: 550,
    distanceErr: 10,
    distancePc: 168.0,
    spectralType: 'B0.5 IVe',
    evolutionStage: '蓝白色发射线壳层星（Be 星原型）',
    temperatureK: 25000,
    tempNote: '极区高达 26,500 K，赤道甩出灼热等离子气体盘',
    radiusSolar: 10.9,
    polarRadiusSolar: 7.9,
    massSolar: 15.0,
    luminositySolar: 34000,
    rotationKmS: 432.0,
    ageText: '仅约 800 万年',
    color: '#8ec5ff',
    glowColor: '#52a3ff',
    skyX: 468,
    skyY: 158,
    headline: '距离最远却最狂暴的宇宙灯塔，每秒 432 公里甩出赤道气体环',
    summary:
      '居于 W 正中央的“策”其实身处 550 光年外的深空，是五颗星里最遥远的一颗。它之所以没显得暗淡，是因为它是一颗质量达太阳 15 倍，光度逾太阳 34,000 倍的蓝白色巨兽。它以接近解体极限的速度疯狂自转，赤道甩出的电离气体盘让它在 1866 年成为人类史上第一颗被发现带有光谱发射线的 Be 星。',
    lore:
      '“策”在汉语里意为马鞭，《史记·天官书》载其位于王良车驾旁，专司策马扬鞭，西方天文界也直接借用汉语韦氏拼音将其称为 Tsih。1960 年代阿波罗计划期间，宇航员古斯·格里森将自己中间名 Ivan 倒拼为 Navi 作为这颗中枢导航星的昵称。',
  },
  {
    id: 'delta',
    bayer: 'δ Cas',
    greek: 'δ',
    zhName: '阁道三',
    zhAsterism: '奎宿 · 阁道星官',
    enName: 'Ruchbah',
    enMeaning: '王后弯曲的膝盖（阿拉伯语 rukbah）',
    raText: '01h 25m 49.0s',
    decText: '+60° 14′ 07″',
    raDeg: 21.454,
    decDeg: 60.2353,
    apparentMag: 2.68,
    magNote: '2.68 ~ 2.74 等（大陵五型食双星系统，周期 759 天）',
    absoluteMag: 0.28,
    distanceLy: 99.4,
    distanceErr: 0.4,
    distancePc: 30.5,
    spectralType: 'A5 IV',
    evolutionStage: '蓝白色次巨星（食双星主星）',
    temperatureK: 7980,
    tempNote: '约 7,980 K，伴星每两年零一个月交食一次',
    radiusSolar: 3.9,
    polarRadiusSolar: 3.7,
    massSolar: 2.49,
    luminositySolar: 72.9,
    rotationKmS: 123.0,
    ageText: '约 6 亿年',
    color: '#dceaff',
    glowColor: '#b5d3ff',
    skyX: 644,
    skyY: 260,
    headline: '距离地球整整 100 光年的空间标尺，与伴星相伴的大陵五型食双星',
    summary:
      '阁道三与地球相距 99.4 光年，几乎是一把天然的“百光年刻度尺”：今晚落入你视网膜的清冷白光，大约是在二十世纪二十年代中期从它表面出发的。它是一颗处于氢核耗尽边缘的 A5 型次巨星，并有一颗较暗的伴星以 759 天为周期绕其公转并产生轻微掩食。',
    lore:
      '在西方星象里，Ruchbah 是王后坐在宝座上微屈的膝盖。而在中国汉代星官体系中，从这里往东北延伸的六颗星构成了“阁道”，即连接帝王紫微宫与外部天苑的凌空高架栈道。',
  },
  {
    id: 'epsilon',
    bayer: 'ε Cas',
    greek: 'ε',
    zhName: '阁道二',
    zhAsterism: '奎宿 · 阁道星官',
    enName: 'Segin',
    enMeaning: '源自牧夫座 γ（Seginus）的手抄星表讹传专名',
    raText: '01h 54m 23.7s',
    decText: '+63° 40′ 12″',
    raDeg: 28.5989,
    decDeg: 63.6701,
    apparentMag: 3.37,
    magNote: '3.37 等（五颗主星中视亮度最柔和的一颗）',
    absoluteMag: -2.19,
    distanceLy: 470,
    distanceErr: 10,
    distancePc: 143.0,
    spectralType: 'B3 V',
    evolutionStage: '年轻的蓝白色大质量主序星',
    temperatureK: 15174,
    tempNote: '约 15,174 K，正以每秒 8.1 公里的径向速度向太阳系靠近',
    radiusSolar: 6.1,
    polarRadiusSolar: 6.0,
    massSolar: 9.2,
    luminositySolar: 3059,
    rotationKmS: 30.0,
    ageText: '约 1,540 万年',
    color: '#a3c9ff',
    glowColor: '#72adff',
    skyX: 836,
    skyY: 146,
    headline: '肉眼看似最暗，实则光度超太阳三千倍的年轻蓝白主序星',
    summary:
      '作为 W 折线最东端的收尾，阁道二的视星等只有 3.37 等，在城市光污染下最容易隐没。但这份“暗淡”完全是 470 光年的遥远距离造成的假象：它其实是一颗仅诞生 1,540 万年，质量逾太阳 9 倍的 B3 型主序星，真实发光能力超过太阳三千倍，比王良一亮出一百四十余倍。',
    lore:
      '西方星图里它是卡西欧佩亚王后的小腿与足尖，其专名 Segin 是一桩有趣的文献学公案，系中世纪星表抄写员从牧夫座 γ（Seginus）误植而来，最终在 2017 年被国际天文学联合会按历史惯例转正。在中国古天文中，它是紫微宫外飞阁栈道（阁道）北段的第二座桥墩。',
  },
] as const;

/**
 * 阁道星官与王良星官的辅星（在中西星官叠加展示时画出完整的“王良五星”车驾与“阁道六星”飞栈）
 */
export const EXTRA_ASTERISM_STARS = {
  wangliang: [
    { name: '王良二 (κ)', x: 242, y: 82 },
    { name: '王良三 (η)', x: 266, y: 192 },
    { name: '王良五 (λ)', x: 214, y: 238 },
  ],
  gedao: [
    { name: '阁道一 (ι)', x: 928, y: 112 },
    { name: '阁道四 (θ)', x: 582, y: 318 },
    { name: '阁道五 (ν)', x: 504, y: 342 },
    { name: '阁道六 (ο)', x: 438, y: 364 },
  ],
} as const;
