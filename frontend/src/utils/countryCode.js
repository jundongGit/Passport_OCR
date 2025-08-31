// 国家/地区三位代码映射（ISO 3166-1 alpha-3）

// 代码到中文名称映射
export const codeToNameMap = {
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
  'COL': '哥伦比亚',
  'OTH': '其他'
};

// 获取国家中文名称
export function getCountryName(code) {
  if (!code) return '-';
  return codeToNameMap[code.toUpperCase()] || code;
}

// 获取国家显示格式（名称+代码）
export function getCountryDisplay(code) {
  if (!code) return '-';
  const name = getCountryName(code);
  if (name === code) {
    return code; // 如果没有找到对应的中文名，只显示代码
  }
  return `${name} (${code.toUpperCase()})`;
}

// 获取所有国家列表（用于选择框）
export function getAllCountries() {
  return Object.entries(codeToNameMap).map(([code, name]) => ({
    value: code,
    label: `${name} (${code})`,
    name: name,
    code: code
  }));
}

// 国籍到代码的映射
export const nameToCodeMap = {
  '中国': 'CHN',
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
  '其他': 'OTH'
};

// 转换国籍名称为代码
export function getCountryCode(countryName) {
  if (!countryName) return null;
  
  // 如果已经是三位代码，直接返回
  if (countryName.length === 3 && /^[A-Z]{3}$/.test(countryName)) {
    return countryName;
  }
  
  // 查找对应的代码
  return nameToCodeMap[countryName] || 'OTH';
}