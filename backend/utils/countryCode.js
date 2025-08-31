// 国家/地区三位代码映射（ISO 3166-1 alpha-3）
const countryCodeMap = {
  // 中文名称映射
  '中国': 'CHN',
  '中华人民共和国': 'CHN',
  '新西兰': 'NZL',
  '澳大利亚': 'AUS',
  '美国': 'USA',
  '英国': 'GBR',
  '加拿大': 'CAN',
  '日本': 'JPN',
  '韩国': 'KOR',
  '新加坡': 'SGP',
  '德国': 'DEU',
  '法国': 'FRA',
  '意大利': 'ITA',
  '西班牙': 'ESP',
  '荷兰': 'NLD',
  '瑞士': 'CHE',
  '瑞典': 'SWE',
  '挪威': 'NOR',
  '丹麦': 'DNK',
  '芬兰': 'FIN',
  '俄罗斯': 'RUS',
  '印度': 'IND',
  '巴西': 'BRA',
  '墨西哥': 'MEX',
  '阿根廷': 'ARG',
  '南非': 'ZAF',
  '埃及': 'EGY',
  '泰国': 'THA',
  '马来西亚': 'MYS',
  '印度尼西亚': 'IDN',
  '菲律宾': 'PHL',
  '越南': 'VNM',
  '阿联酋': 'ARE',
  '沙特阿拉伯': 'SAU',
  '土耳其': 'TUR',
  '以色列': 'ISR',
  '希腊': 'GRC',
  '葡萄牙': 'PRT',
  '波兰': 'POL',
  '爱尔兰': 'IRL',
  '奥地利': 'AUT',
  '比利时': 'BEL',
  '捷克': 'CZE',
  '匈牙利': 'HUN',
  '罗马尼亚': 'ROU',
  '乌克兰': 'UKR',
  '智利': 'CHL',
  '秘鲁': 'PER',
  '哥伦比亚': 'COL',
  
  // 英文名称映射
  'CHINA': 'CHN',
  'P.R.CHINA': 'CHN',
  'PRC': 'CHN',
  'NEW ZEALAND': 'NZL',
  'AUSTRALIA': 'AUS',
  'UNITED STATES': 'USA',
  'USA': 'USA',
  'UNITED STATES OF AMERICA': 'USA',
  'UNITED KINGDOM': 'GBR',
  'UK': 'GBR',
  'GREAT BRITAIN': 'GBR',
  'CANADA': 'CAN',
  'JAPAN': 'JPN',
  'KOREA': 'KOR',
  'SOUTH KOREA': 'KOR',
  'REPUBLIC OF KOREA': 'KOR',
  'SINGAPORE': 'SGP',
  'GERMANY': 'DEU',
  'FRANCE': 'FRA',
  'ITALY': 'ITA',
  'SPAIN': 'ESP',
  'NETHERLANDS': 'NLD',
  'SWITZERLAND': 'CHE',
  'SWEDEN': 'SWE',
  'NORWAY': 'NOR',
  'DENMARK': 'DNK',
  'FINLAND': 'FIN',
  'RUSSIA': 'RUS',
  'RUSSIAN FEDERATION': 'RUS',
  'INDIA': 'IND',
  'BRAZIL': 'BRA',
  'MEXICO': 'MEX',
  'ARGENTINA': 'ARG',
  'SOUTH AFRICA': 'ZAF',
  'EGYPT': 'EGY',
  'THAILAND': 'THA',
  'MALAYSIA': 'MYS',
  'INDONESIA': 'IDN',
  'PHILIPPINES': 'PHL',
  'VIETNAM': 'VNM',
  'VIET NAM': 'VNM',
  'UAE': 'ARE',
  'UNITED ARAB EMIRATES': 'ARE',
  'SAUDI ARABIA': 'SAU',
  'TURKEY': 'TUR',
  'ISRAEL': 'ISR',
  'GREECE': 'GRC',
  'PORTUGAL': 'PRT',
  'POLAND': 'POL',
  'IRELAND': 'IRL',
  'AUSTRIA': 'AUT',
  'BELGIUM': 'BEL',
  'CZECH': 'CZE',
  'CZECH REPUBLIC': 'CZE',
  'HUNGARY': 'HUN',
  'ROMANIA': 'ROU',
  'UKRAINE': 'UKR',
  'CHILE': 'CHL',
  'PERU': 'PER',
  'COLOMBIA': 'COL'
};

// 反向映射（代码到中文名称）
const codeToNameMap = {
  'CHN': '中国',
  'NZL': '新西兰',
  'AUS': '澳大利亚',
  'USA': '美国',
  'GBR': '英国',
  'CAN': '加拿大',
  'JPN': '日本',
  'KOR': '韩国',
  'SGP': '新加坡',
  'DEU': '德国',
  'FRA': '法国',
  'ITA': '意大利',
  'ESP': '西班牙',
  'NLD': '荷兰',
  'CHE': '瑞士',
  'SWE': '瑞典',
  'NOR': '挪威',
  'DNK': '丹麦',
  'FIN': '芬兰',
  'RUS': '俄罗斯',
  'IND': '印度',
  'BRA': '巴西',
  'MEX': '墨西哥',
  'ARG': '阿根廷',
  'ZAF': '南非',
  'EGY': '埃及',
  'THA': '泰国',
  'MYS': '马来西亚',
  'IDN': '印度尼西亚',
  'PHL': '菲律宾',
  'VNM': '越南',
  'ARE': '阿联酋',
  'SAU': '沙特阿拉伯',
  'TUR': '土耳其',
  'ISR': '以色列',
  'GRC': '希腊',
  'PRT': '葡萄牙',
  'POL': '波兰',
  'IRL': '爱尔兰',
  'AUT': '奥地利',
  'BEL': '比利时',
  'CZE': '捷克',
  'HUN': '匈牙利',
  'ROU': '罗马尼亚',
  'UKR': '乌克兰',
  'CHL': '智利',
  'PER': '秘鲁',
  'COL': '哥伦比亚'
};

// 获取国家代码
function getCountryCode(countryName) {
  if (!countryName) return null;
  
  // 如果已经是三位代码，直接返回
  if (countryName.length === 3 && /^[A-Z]{3}$/.test(countryName)) {
    return countryName;
  }
  
  // 转换为大写并去除空格
  const normalized = countryName.toUpperCase().trim();
  
  // 查找对应的代码
  const code = countryCodeMap[normalized] || countryCodeMap[countryName];
  
  // 如果找不到，返回前三个字母的大写（作为后备方案）
  return code || (normalized.length >= 3 ? normalized.substring(0, 3) : 'OTH');
}

// 获取国家中文名称
function getCountryName(code) {
  if (!code) return null;
  return codeToNameMap[code.toUpperCase()] || code;
}

// 获取所有国家列表（用于前端选择）
function getAllCountries() {
  return Object.entries(codeToNameMap).map(([code, name]) => ({
    code,
    name,
    label: `${name} (${code})`
  }));
}

module.exports = {
  getCountryCode,
  getCountryName,
  getAllCountries,
  countryCodeMap,
  codeToNameMap
};