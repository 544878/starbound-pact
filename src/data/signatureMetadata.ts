export interface SignatureMetadataItem {
  name: string;
  weapon: string;
  trueForm: string;
  vessel: string;
  origin: string;
  quote: string;
}

export const SIGNATURE_METADATA: Record<string, SignatureMetadataItem> = {
  "lumi": {
    "name": "露弥",
    "weapon": "回风的诗章",
    "trueForm": "逐风灵羽",
    "vessel": "风之诗匣",
    "origin": "纯风星核",
    "quote": "风神不渡的苦难，由她来飞渡。"
  },
  "alden": {
    "name": "艾尔登",
    "weapon": "晨星誓约",
    "trueForm": "晨辉誓盾",
    "vessel": "誓约战匣",
    "origin": "黎明之核",
    "quote": "我的盾，只为每一个没有神明庇佑的凡人而举。"
  },
  "selene": {
    "name": "瑟琳",
    "weapon": "静海之杖",
    "trueForm": "溯忆海灵",
    "vessel": "留声之匣",
    "origin": "忆海之核",
    "quote": "书本上的凡人文明虽已沉寂，但它们的光芒仍在深水中呼吸。"
  },
  "mira": {
    "name": "米菈",
    "weapon": "万生药典",
    "trueForm": "芳华之灵",
    "vessel": "济世药匣",
    "origin": "春华之核",
    "quote": "温柔藏在严苛的药理嘱咐之下，誓死守护每位伤者。"
  },
  "noctis": {
    "name": "诺克缇娅",
    "weapon": "终夜裁衡",
    "trueForm": "无冕终夜",
    "vessel": "裁夜之衡",
    "origin": "终夜星核",
    "quote": "当秩序沉入永夜，我自黑暗中加冕。"
  },
  "kael": {
    "name": "凯尔",
    "weapon": "余烬猎弓",
    "trueForm": "逆焰不熄",
    "vessel": "余烬猎筒",
    "origin": "逆焰烈心",
    "quote": "就算只剩一丝余烬，我也要烧穿这片黑夜。"
  },
  "astra": {
    "name": "星璃",
    "weapon": "问天·白星",
    "trueForm": "自由白星",
    "vessel": "承载自由之器",
    "origin": "自由纯粹之核",
    "quote": "星光不再为他人而陨落，而是为我而升起。"
  },
  "xuanzhao": {
    "name": "玄照",
    "weapon": "照世长戈",
    "trueForm": "太初日轮",
    "vessel": "守护人间之曜器",
    "origin": "永不熄灭之太初核",
    "quote": "无论黑夜多么漫长，我都会再次升起。"
  },
  "canglan": {
    "name": "沧澜",
    "weapon": "万潮神戟",
    "trueForm": "归墟万象",
    "vessel": "潮海遗匣",
    "origin": "归墟之核",
    "quote": "潮汐不属于神殿，而属于每一个在海边生活的人。"
  },
  "yanhuang": {
    "name": "炎煌",
    "weapon": "赤霄断岳",
    "trueForm": "焚天帝心",
    "vessel": "帝印熔炉",
    "origin": "赤阳之核",
    "quote": "我宁可斩断帝印，也不愿让无辜的百姓成为火海之下的尘埃。"
  },
  "jingxuan": {
    "name": "镜玄",
    "weapon": "不妄月镜",
    "trueForm": "照我真心",
    "vessel": "镜界仪台",
    "origin": "照心星核",
    "quote": "镜照万相，我见真心。"
  },
  "siming": {
    "name": "司命",
    "weapon": "改命天书",
    "trueForm": "命外一笔",
    "vessel": "书天仪台",
    "origin": "司命星核",
    "quote": "命由天定，亦由人书。"
  },
  "yueheng": {
    "name": "岳衡",
    "weapon": "山河不动",
    "trueForm": "山河同担",
    "vessel": "山河印",
    "origin": "山岳之心",
    "quote": "山河为担，此身即界。"
  },
  "R4-009": {
    "name": "霜砚",
    "weapon": "砚雪断锋",
    "trueForm": "寒魄折墨",
    "vessel": "霜砚匣",
    "origin": "墨雪之心",
    "quote": "以霜为墨，书尽残章。"
  },
  "R4-010": {
    "name": "南絮",
    "weapon": "辞乡玉竹琴",
    "trueForm": "烟柳清音",
    "vessel": "柳声引",
    "origin": "烟柳之心",
    "quote": "一曲随风入人间，烟火千村皆可停。"
  },
  "R4-011": {
    "name": "绯棠",
    "weapon": "惊梦描金扇",
    "trueForm": "醉色海棠",
    "vessel": "海棠熏匣",
    "origin": "春醉之心",
    "quote": "醉眼看尽人间色，一扇风月换千筹。"
  },
  "R4-012": {
    "name": "烬羽",
    "weapon": "燎原逆火翎",
    "trueForm": "孤鹜之焰",
    "vessel": "余烬箭匣",
    "origin": "残羽烈星",
    "quote": "纵使羽折，火亦不熄。"
  },
  "R4-013": {
    "name": "眠鸢",
    "weapon": "梦隐无常刃",
    "trueForm": "幽蝶之茧",
    "vessel": "蝶眠梦灯",
    "origin": "幽蝶织茧",
    "quote": "当梦境沉入黑夜，我将在蝶影之间，藏起所有真实与虚妄。"
  },
  "R4-014": {
    "name": "汐辞",
    "weapon": "听潮幽海螺",
    "trueForm": "沧海遗音",
    "vessel": "沧海遗匣",
    "origin": "潮汐遗珠",
    "quote": "潮会记得，所有被淹没的光。"
  },
  "R4-015": {
    "name": "暮刃",
    "weapon": "绝命双短刃",
    "trueForm": "潜夜断颈",
    "vessel": "影缚面匣",
    "origin": "永夜裂光",
    "quote": "黑夜从不宽恕，但我可以选择光。"
  },
  "R4-016": {
    "name": "晷宁",
    "weapon": "逆刻铜晷盘",
    "trueForm": "偷天寸阴",
    "vessel": "寸阴仪匣",
    "origin": "逆影之核",
    "quote": "即使时光不肯回头，我也要从它的影子中偷来一寸。"
  },
  "R4-017": {
    "name": "砺川",
    "weapon": "崩天重凿",
    "trueForm": "磐岩立骨",
    "vessel": "铭山印匣",
    "origin": "山心之核",
    "quote": "山会崩，地会裂，但人刻下的意志，会比一切更久。"
  },
  "R4-018": {
    "name": "灯禾",
    "weapon": "破晓引路灯",
    "trueForm": "长夜微明",
    "vessel": "寒更守灯",
    "origin": "长夜微明·本源",
    "quote": "纵使长夜吞没星河，我亦愿提一盏灯，为后来之人留一线天光。"
  },
  "R4-019": {
    "name": "绛音",
    "weapon": "破阵泣血阮",
    "trueForm": "朱弦绝唱",
    "vessel": "弦歌封匣",
    "origin": "朱弦绝唱·本源",
    "quote": "以我之弦，碎天之律；弦动九霄，血歌不绝。"
  },
  "R4-020": {
    "name": "焰笙",
    "weapon": "熔律笙",
    "trueForm": "炉心匠魂",
    "vessel": "千锻炉",
    "origin": "炽核之心",
    "quote": "以火为曲，以器成诗；火鸣作律，百器皆醒。"
  },
  "R4-021": {
    "name": "镜弦",
    "weapon": "映月弦镜",
    "trueForm": "月归无相",
    "vessel": "逆月镜台",
    "origin": "望月之心",
    "quote": "镜照无声，弦引月来；弦动影生，照见未至。"
  },
  "R4-022": {
    "name": "忆澜",
    "weapon": "潮汐之弦",
    "trueForm": "潮汐忆灵",
    "vessel": "沉歌之匣",
    "origin": "海忆之核",
    "quote": "潮声不息，万物皆有回响。"
  },
  "R4-025": {
    "name": "磐舟",
    "weapon": "山河锚",
    "trueForm": "岩岳巨舟",
    "vessel": "镇岳舱",
    "origin": "大地之核",
    "quote": "山河为锚，载众生行远；我即不动的山，亦是前行的舟。"
  },
  "R4-026": {
    "name": "赤垒",
    "weapon": "垒心重盾",
    "trueForm": "赤城之躯",
    "vessel": "烽垒要塞",
    "origin": "赤垒之核",
    "quote": "以血铸垒，守万界不倾；我即城堡，亦为众生之盾。"
  },
  "R4-027": {
    "name": "梦珀",
    "weapon": "琥梦浮灯",
    "trueForm": "梦迹之灵",
    "vessel": "沉梦匣",
    "origin": "梦珀之心",
    "quote": "以梦为珀，封存世间温柔；一灯藏梦，照见遗忘之处。"
  },
  "R4-028": {
    "name": "春蘅",
    "weapon": "百草问生",
    "trueForm": "芳华济世",
    "vessel": "青囊引息",
    "origin": "春生之核",
    "quote": "扶生万物，以草木之心；一杖濡春，百草皆应。"
  },
  "R4-029": {
    "name": "雨织",
    "weapon": "沧丝织雨",
    "trueForm": "云织灵鸢",
    "vessel": "天机雨络",
    "origin": "雨归之心",
    "quote": "以雨为线，织就天光；一伞收云，万缕成雨。"
  },
  "R4-030": {
    "name": "岁安",
    "weapon": "四时同春",
    "trueForm": "岁序之灵",
    "vessel": "岁宁钟",
    "origin": "寰岁天轮",
    "quote": "岁序常新，山河长安；一枝转四时，春风护人间。"
  },
  "R5-001": {
    "name": "朔衡",
    "weapon": "夜衡裁月",
    "trueForm": "朔月天判",
    "vessel": "无垠天秤",
    "origin": "月渊之心",
    "quote": "以月为衡，昭示乾坤；斩妄立衡，照见本真。"
  },
  "R5-002": {
    "name": "尘歌",
    "weapon": "风尘弦",
    "trueForm": "流尘行歌",
    "vessel": "旅痕罗盘",
    "origin": "尘寰星核",
    "quote": "风起处，尘亦能作歌；万物成生，而歌不灭。"
  },
  "R5-003": {
    "name": "绯月",
    "weapon": "血月之刃",
    "trueForm": "绯月降临",
    "vessel": "血蔷祭坛",
    "origin": "绯月之核",
    "quote": "以血为诗，于月下盛放；我即月，亦是渴望。"
  },
  "R5-004": {
    "name": "曜烬",
    "weapon": "煌陨之枪",
    "trueForm": "曜阳帝相",
    "vessel": "烬天神座",
    "origin": "太阳真核",
    "quote": "以燃尽之光，重铸万界之明；长枪指天，焚尽虚妄。"
  },
  "R5-005": {
    "name": "梦璃",
    "weapon": "镜花之弦",
    "trueForm": "梦镜之灵",
    "vessel": "千镜浮界",
    "origin": "梦璃之心",
    "quote": "以碎梦为镜，映见真实之心；碎梦为种，生出真实。"
  },
  "R5-006": {
    "name": "溯白",
    "weapon": "溯光之澜",
    "trueForm": "潮汐回响",
    "vessel": "汐心圣匣",
    "origin": "源海之心",
    "quote": "溯流而上，以光洗回遗忘；凝潮为刃，斩断遗忘。"
  },
  "R5-007": {
    "name": "终祈",
    "weapon": "终焰鞘裁",
    "trueForm": "终焉圣像",
    "vessel": "寂礼圣台",
    "origin": "陨世核心",
    "quote": "当万物终结，祈愿仍将燃烧；以终为裁，亦为众生留一线光。"
  },
  "R5-008": {
    "name": "时珩",
    "weapon": "时渊裁律",
    "trueForm": "时之天枢",
    "vessel": "千界仪盘",
    "origin": "恒时之茧",
    "quote": "循时之道，以恒定万象；以时间为刃，裁定无序。"
  },
  "saber": {
    "name": "阿尔托莉雅",
    "weapon": "誓约圣剑",
    "trueForm": "圣冠之魂",
    "vessel": "祈愿王座",
    "origin": "圣痕之核",
    "quote": "以圣剑之光，守护仍存的美好；王之魂，永不独行。"
  },
  "sakura": {
    "name": "间桐樱",
    "weapon": "影樱之觞",
    "trueForm": "终焉之樱",
    "vessel": "圣杯之樱",
    "origin": "腐樱之核",
    "quote": "即使化为黑暗，亦想守护——那份温柔。"
  },
  "rin": {
    "name": "远坂凛",
    "weapon": "宝石魔术剑",
    "trueForm": "绯红天球",
    "vessel": "宝石典藏",
    "origin": "瞳之星核",
    "quote": "魔术是选择，而我从不退让；秩序即美，群星亦在我的计算之中。"
  },
  "archer": {
    "name": "卫宫",
    "weapon": "无限双剑",
    "trueForm": "千锻之影",
    "vessel": "投影工坊",
    "origin": "无限剑域",
    "quote": "我不过是一个追逐理想的普通人；此身为剑，亦为他人而挥。"
  },
  "gilgamesh": {
    "name": "吉尔伽美什",
    "weapon": "王之钥",
    "trueForm": "天地之王",
    "vessel": "王财宝库",
    "origin": "巴比伦之核",
    "quote": "凡世所有之美，皆在我手中；王，即是世界的尺度。"
  },
  "yuno": {
    "name": "优诺",
    "weapon": "风语典籍",
    "trueForm": "风之王子",
    "vessel": "青风圣坛",
    "origin": "风星之心",
    "quote": "风将远方的答案带到我手中；我即流动的风，亦是群星的归途。"
  },
  "shorekeeper": {
    "name": "守岸人",
    "weapon": "潮汐之钥",
    "trueForm": "潮汐守灵",
    "vessel": "潮汐灯塔",
    "origin": "潮海之核",
    "quote": "我站在潮汐与时间之间，守住所有归来的路。"
  },
  "phrolova": {
    "name": "弗洛洛",
    "weapon": "暮色独白",
    "trueForm": "蔷影幻舞",
    "vessel": "剧梦灵枢",
    "origin": "猩红花心",
    "quote": "玫瑰从不凋零，它只在更深的黑夜里再次盛放。"
  },
  "cantarella": {
    "name": "坎特雷拉",
    "weapon": "溺光毒杯",
    "trueForm": "深潮歌姬",
    "vessel": "潮汐圣杯",
    "origin": "溟海之心",
    "quote": "在无声的深海里，我的歌仍会使万物为之沉醉。"
  },
  "xinyuehu": {
    "name": "心月狐",
    "weapon": "月影狐扇",
    "trueForm": "九尾月神",
    "vessel": "月祀灵宸",
    "origin": "心月灵核",
    "quote": "心映月华，狐火不灭；愿以千世温柔，守你心中微光。"
  },
  "robin_lovesong": {
    "name": "知更鸟情歌",
    "weapon": "夜曲·星辰鸣响",
    "trueForm": "千音同响",
    "vessel": "银河天籁",
    "origin": "谐乐星核",
    "quote": "愿我的歌声，跨越光年与炽热的夏天，成为照亮你身旁的微风。"
  },
  "aventurine_waves": {
    "name": "砂金戏浪",
    "weapon": "命途晴空·海滨筹码",
    "trueForm": "豪赌盛夏",
    "vessel": "晴空轮盘",
    "origin": "存护星核",
    "quote": "所有的筹码都已入池，朋友，在这炎热的夏日里，和我一起尽情狂欢吧。"
  }
};

export function getSignatureMetadata(id: string): SignatureMetadataItem {
  return SIGNATURE_METADATA[id] ?? {
    name: id,
    weapon: '本命专武',
    trueForm: '第7魂 · 真身',
    vessel: '第8魂 · 化器',
    origin: '第9魂 · 本源',
    quote: '与星契合，宿命回响。'
  };
}
