// 姓名格式验证工具（后端版本）

/**
 * 验证姓名格式是否符合规范
 * 格式要求：姓/名，纯字母，姓在前名在后
 * @param {string} name - 需要验证的姓名
 * @returns {object} - 包含验证结果和错误信息
 */
function validatePassportName(name) {
  if (!name) {
    return {
      valid: false,
      error: '请输入姓名'
    };
  }

  // 去除首尾空格
  const trimmedName = name.trim();

  // 检查是否包含斜杠
  if (!trimmedName.includes('/')) {
    return {
      valid: false,
      error: '姓名格式错误，请使用"姓/名"格式，例如：ZHANG/SAN'
    };
  }

  // 分割姓和名
  const parts = trimmedName.split('/');
  
  // 检查是否只有两部分
  if (parts.length !== 2) {
    return {
      valid: false,
      error: '姓名格式错误，只能包含一个斜杠分隔姓和名'
    };
  }

  const [surname, givenName] = parts;

  // 检查姓是否为空
  if (!surname || surname.trim() === '') {
    return {
      valid: false,
      error: '姓氏不能为空'
    };
  }

  // 检查名是否为空
  if (!givenName || givenName.trim() === '') {
    return {
      valid: false,
      error: '名字不能为空'
    };
  }

  // 正则表达式：只允许字母和空格
  const namePattern = /^[A-Za-z\s]+$/;

  // 检查姓是否只包含字母和空格
  if (!namePattern.test(surname.trim())) {
    return {
      valid: false,
      error: '姓氏只能包含英文字母和空格'
    };
  }

  // 检查名是否只包含字母和空格
  if (!namePattern.test(givenName.trim())) {
    return {
      valid: false,
      error: '名字只能包含英文字母和空格'
    };
  }

  // 检查长度限制
  if (surname.trim().length > 50) {
    return {
      valid: false,
      error: '姓氏长度不能超过50个字符'
    };
  }

  if (givenName.trim().length > 50) {
    return {
      valid: false,
      error: '名字长度不能超过50个字符'
    };
  }

  // 所有验证通过
  return {
    valid: true,
    formatted: `${surname.trim().toUpperCase()}/${givenName.trim().toUpperCase()}`,
    surname: surname.trim().toUpperCase(),
    givenName: givenName.trim().toUpperCase()
  };
}

/**
 * 格式化姓名为标准格式
 * @param {string} name - 需要格式化的姓名
 * @returns {string} - 格式化后的姓名
 */
function formatPassportName(name) {
  const validation = validatePassportName(name);
  if (validation.valid) {
    return validation.formatted;
  }
  return name;
}

module.exports = {
  validatePassportName,
  formatPassportName
};