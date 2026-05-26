/**
 * 2026年世界杯 - 静态基础数据
 * 赛程和赔率数据全部来自 The Odds API，不在此处编造任何赛程。
 */

// 48支参赛球队基础信息（用于映射 The Odds API 返回的英文球队名）
const TEAMS = [
  // A 组
  { id: 'MEX', name: '墨西哥',       flag: '🇲🇽', group: 'A', rank: 15,  continent: '北美洲' },
  { id: 'RSA', name: '南非',         flag: '🇿🇦', group: 'A', rank: 57,  continent: '非洲'   },
  { id: 'KOR', name: '韩国',         flag: '🇰🇷', group: 'A', rank: 22,  continent: '亚洲'   },
  { id: 'CZE', name: '捷克',         flag: '🇨🇿', group: 'A', rank: 37,  continent: '欧洲'   },

  // B 组
  { id: 'CAN', name: '加拿大',       flag: '🇨🇦', group: 'B', rank: 49,  continent: '北美洲' },
  { id: 'BIH', name: '波黑',         flag: '🇧🇦', group: 'B', rank: 63,  continent: '欧洲'   },
  { id: 'QAT', name: '卡塔尔',       flag: '🇶🇦', group: 'B', rank: 47,  continent: '亚洲'   },
  { id: 'SUI', name: '瑞士',         flag: '🇨🇭', group: 'B', rank: 18,  continent: '欧洲'   },

  // C 组
  { id: 'BRA', name: '巴西',         flag: '🇧🇷', group: 'C', rank: 5,   continent: '南美洲' },
  { id: 'MAR', name: '摩洛哥',       flag: '🇲🇦', group: 'C', rank: 12,  continent: '非洲'   },
  { id: 'HAI', name: '海地',         flag: '🇭🇹', group: 'C', rank: 76,  continent: '北美洲' },
  { id: 'SCO', name: '苏格兰',       flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', rank: 20,  continent: '欧洲'   },

  // D 组
  { id: 'USA', name: '美国',         flag: '🇺🇸', group: 'D', rank: 11,  continent: '北美洲' },
  { id: 'PAR', name: '巴拉圭',       flag: '🇵🇾', group: 'D', rank: 58,  continent: '南美洲' },
  { id: 'AUS', name: '澳大利亚',     flag: '🇦🇺', group: 'D', rank: 25,  continent: '大洋洲' },
  { id: 'TUR', name: '土耳其',       flag: '🇹🇷', group: 'D', rank: 35,  continent: '欧洲'   },

  // E 组
  { id: 'GER', name: '德国',         flag: '🇩🇪', group: 'E', rank: 16,  continent: '欧洲'   },
  { id: 'CUR', name: '库拉索',       flag: '🇨🇼', group: 'E', rank: 110, continent: '北美洲' },
  { id: 'CIV', name: '科特迪瓦',     flag: '🇨🇮', group: 'E', rank: 46,  continent: '非洲'   },
  { id: 'ECU', name: '厄瓜多尔',     flag: '🇪🇨', group: 'E', rank: 31,  continent: '南美洲' },

  // F 组
  { id: 'NED', name: '荷兰',         flag: '🇳🇱', group: 'F', rank: 7,   continent: '欧洲'   },
  { id: 'JPN', name: '日本',         flag: '🇯🇵', group: 'F', rank: 17,  continent: '亚洲'   },
  { id: 'SWE', name: '瑞典',         flag: '🇸🇪', group: 'F', rank: 28,  continent: '欧洲'   },
  { id: 'TUN', name: '突尼斯',       flag: '🇹🇳', group: 'F', rank: 41,  continent: '非洲'   },

  // G 组
  { id: 'BEL', name: '比利时',       flag: '🇧🇪', group: 'G', rank: 3,   continent: '欧洲'   },
  { id: 'EGY', name: '埃及',         flag: '🇪🇬', group: 'G', rank: 36,  continent: '非洲'   },
  { id: 'IRN', name: '伊朗',         flag: '🇮🇷', group: 'G', rank: 20,  continent: '亚洲'   },
  { id: 'NZL', name: '新西兰',       flag: '🇳🇿', group: 'G', rank: 104, continent: '大洋洲' },

  // H 组
  { id: 'ESP', name: '西班牙',       flag: '🇪🇸', group: 'H', rank: 8,   continent: '欧洲'   },
  { id: 'CPV', name: '佛得角',       flag: '🇨🇻', group: 'H', rank: 84,  continent: '非洲'   },
  { id: 'KSA', name: '沙特阿拉伯',   flag: '🇸🇦', group: 'H', rank: 53,  continent: '亚洲'   },
  { id: 'URU', name: '乌拉圭',       flag: '🇺🇾', group: 'H', rank: 15,  continent: '南美洲' },

  // I 组
  { id: 'FRA', name: '法国',         flag: '🇫🇷', group: 'I', rank: 2,   continent: '欧洲'   },
  { id: 'SEN', name: '塞内加尔',     flag: '🇸🇳', group: 'I', rank: 17,  continent: '非洲'   },
  { id: 'IRQ', name: '伊拉克',       flag: '🇮🇶', group: 'I', rank: 58,  continent: '亚洲'   },
  { id: 'NOR', name: '挪威',         flag: '🇳🇴', group: 'I', rank: 23,  continent: '欧洲'   },

  // J 组
  { id: 'ARG', name: '阿根廷',       flag: '🇦🇷', group: 'J', rank: 1,   continent: '南美洲' },
  { id: 'ALG', name: '阿尔及利亚',   flag: '🇩🇿', group: 'J', rank: 43,  continent: '非洲'   },
  { id: 'AUT', name: '奥地利',       flag: '🇦🇹', group: 'J', rank: 25,  continent: '欧洲'   },
  { id: 'JOR', name: '约旦',         flag: '🇯🇴', group: 'J', rank: 54,  continent: '亚洲'   },

  // K 组
  { id: 'POR', name: '葡萄牙',       flag: '🇵🇹', group: 'K', rank: 6,   continent: '欧洲'   },
  { id: 'COD', name: '刚果（金）',   flag: '🇨🇩', group: 'K', rank: 71,  continent: '非洲'   },
  { id: 'UZB', name: '乌兹别克斯坦', flag: '🇺🇿', group: 'K', rank: 64,  continent: '亚洲'   },
  { id: 'COL', name: '哥伦比亚',     flag: '🇨🇴', group: 'K', rank: 9,   continent: '南美洲' },

  // L 组
  { id: 'ENG', name: '英格兰',       flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', rank: 4,   continent: '欧洲'   },
  { id: 'CRO', name: '克罗地亚',     flag: '🇭🇷', group: 'L', rank: 10,  continent: '欧洲'   },
  { id: 'GHA', name: '加纳',         flag: '🇬🇭', group: 'L', rank: 60,  continent: '非洲'   },
  { id: 'PAN', name: '巴拿马',       flag: '🇵🇦', group: 'L', rank: 45,  continent: '北美洲' },
];

// 16个世界杯举办体育场（容量数据来源：FIFA 官方公布）
const STADIUMS = [
  { name: 'BC Place',                city: '温哥华',      country: '加拿大', capacity: '48,821' },
  { name: 'BMO Field',               city: '多伦多',      country: '加拿大', capacity: '45,000' },
  { name: 'MetLife Stadium',         city: '纽约/新泽西', country: '美国',   capacity: '87,157' },
  { name: 'AT&T Stadium',            city: '达拉斯',      country: '美国',   capacity: '70,122' },
  { name: 'Arrowhead Stadium',       city: '堪萨斯城',    country: '美国',   capacity: '76,000' },
  { name: 'NRG Stadium',             city: '休斯敦',      country: '美国',   capacity: '72,000' },
  { name: 'Mercedes-Benz Stadium',   city: '亚特兰大',    country: '美国',   capacity: '67,382' },
  { name: 'SoFi Stadium',            city: '洛杉矶',      country: '美国',   capacity: '70,000' },
  { name: 'Lincoln Financial Field', city: '费城',        country: '美国',   capacity: '67,000' },
  { name: 'Lumen Field',             city: '西雅图',      country: '美国',   capacity: '69,000' },
  { name: "Levi's Stadium",          city: '旧金山湾区',  country: '美国',   capacity: '68,500' },
  { name: 'Gillette Stadium',        city: '波士顿',      country: '美国',   capacity: '63,815' },
  { name: 'Hard Rock Stadium',       city: '迈阿密',      country: '美国',   capacity: '65,000' },
  { name: 'Estadio Azteca',          city: '墨西哥城',    country: '墨西哥', capacity: '83,000' },
  { name: 'Estadio BBVA',            city: '蒙特雷',      country: '墨西哥', capacity: '50,113' },
  { name: 'Estadio Akron',           city: '瓜达拉哈拉',  country: '墨西哥', capacity: '49,800' },
];
