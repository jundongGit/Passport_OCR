const OpenAI = require('openai');
const fs = require('fs').promises;
const sharp = require('sharp');
const { getCountryCode } = require('./countryCode');
const OCRLog = require('../models/OCRLog');
const fileLogger = require('./fileLogger');

class PassportOCR {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async recognizePassport(imagePath, passportType = null, logContext = {}) {
    const startTime = Date.now();
    let logEntry = null;
    
    try {
      // 创建日志记录
      logEntry = await this.createOCRLog(imagePath, logContext);
      
      // 文件日志：记录识别开始
      const stats = await fs.stat(imagePath);
      fileLogger.logOCRStart(
        logContext.uploadLink || 'unknown',
        logContext.operationType || 'preview',
        logContext.operatorName || '游客',
        { size: stats.size, mimetype: 'image/jpeg' }
      );
      
      const base64Image = await this.imageToBase64(imagePath);
      
      const systemPrompt = this.getSystemPrompt(passportType);
      
      // 更新日志状态为处理中
      await this.updateOCRLog(logEntry._id, { ocrStatus: 'processing' });
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请识别这本护照中的信息，并按照指定格式返回JSON数据。"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const passportData = JSON.parse(jsonMatch[0]);
        const normalizedData = this.normalizePassportData(passportData, passportType);
        const duration = Date.now() - startTime;
        
        // 更新日志记录为成功
        await this.updateOCRLog(logEntry._id, {
          ocrStatus: 'success',
          ocrDuration: duration,
          recognizedData: normalizedData
        });
        
        // 文件日志：记录识别成功
        fileLogger.logOCRSuccess(
          logContext.uploadLink || 'unknown',
          normalizedData,
          duration,
          logContext.operatorName || '游客'
        );
        
        console.log(`[OCR成功] 识别耗时: ${duration}ms, 上传链接: ${logContext.uploadLink || 'unknown'}`);
        
        return {
          success: true,
          data: normalizedData,
          logId: logEntry._id
        };
      } else {
        throw new Error('无法解析护照信息');
      }
    } catch (error) {
      console.error('Passport OCR error:', error);
      const duration = Date.now() - startTime;
      
      // 更新日志记录为失败
      if (logEntry) {
        await this.updateOCRLog(logEntry._id, {
          ocrStatus: 'failed',
          ocrDuration: duration,
          ocrError: error.message
        });
      }
      
      // 文件日志：记录识别失败
      fileLogger.logOCRError(
        logContext.uploadLink || 'unknown',
        error,
        duration,
        logContext.operatorName || '游客'
      );
      
      console.log(`[OCR失败] 识别耗时: ${duration}ms, 错误: ${error.message}, 上传链接: ${logContext.uploadLink || 'unknown'}`);
      
      return {
        success: false,
        error: error.message,
        logId: logEntry?._id
      };
    }
  }

  getSystemPrompt(passportType) {
    const basePrompt = `你是一个专业的护照信息识别助手。请仔细识别护照图片中的信息，并返回JSON格式的数据。
    
    请返回以下格式的JSON数据：
    {
      "fullName": "姓名（英文，格式：姓/名）",
      "chineseName": "中文姓名（如果有）",
      "passportNumber": "护照号码",
      "gender": "性别（M/F）",
      "nationality": "国籍",
      "birthDate": "出生日期（DD/MM/YYYY格式）",
      "issueDate": "签发日期（DD/MM/YYYY格式）",
      "expiryDate": "有效期至（DD/MM/YYYY格式）",
      "birthPlace": "出生地（英文）"
    }
    
    注意：
    1. 如果某个字段无法识别，请返回null
    2. 日期必须转换为DD/MM/YYYY格式
    3. 性别只返回M或F
    4. 护照号码要完整准确
    5. 姓名格式必须为 姓/名 （例如：ZHANG/SAN）
    6. 姓名中如果有横线(-)请替换为空格
    7. 出生地识别规则：
       - 仔细扫描护照上的所有文本信息，特别关注出生地相关字段
       - 优先识别以下标准字段：
         * "Place of Birth" / "PLACE OF BIRTH"
         * "Birth Place" / "BIRTH PLACE"
         * "Born in" / "BORN IN"
         * "出生地" (中文护照)
         * "Lieu de naissance" (法文护照)
         * "Lugar de nacimiento" (西班牙文护照)
       - 在这些字段标签后面的内容就是出生地信息
       - 出生地格式：只返回城市名称（例如：BEIJING 或 NEW YORK）
       - 如果标准字段中没有找到，再扫描护照其他区域寻找可能的城市名称
       - 不需要包含国家名称，只要城市名称即可
    8. 请确保识别出生日期字段`;

    if (passportType === 'CN') {
      return basePrompt + `
      9. 这是中国护照，请特别注意：
         - 识别中文姓名
         - 中国护照通常有"出生地"字段，也可能有英文"Place of Birth"
         - 出生地通常为中国的城市名，只返回城市名如：BEIJING 或 SHANGHAI
         - 查找拼音城市名或英文城市名，如：北京→BEIJING，上海→SHANGHAI
         - 常见格式："出生地：北京" 或 "Place of Birth: BEIJING"`;
    } else if (passportType === 'NZ') {
      return basePrompt + `
      9. 这是新西兰护照，请特别注意：
         - 新西兰护照标准格式包含"Place of Birth"字段
         - 该字段通常位于个人信息页面的下方
         - 出生地可能为新西兰城市或其他国家城市，只返回城市名
         - 例如："Place of Birth: AUCKLAND" 或 "Place of Birth: LONDON"
         - 只提取城市名：AUCKLAND 或 LONDON`;
    } else if (passportType === 'AU') {
      return basePrompt + `
      9. 这是澳大利亚护照，请特别注意：
         - 澳大利亚护照标准格式包含"Place of Birth"字段
         - 该字段通常位于个人信息页面
         - 出生地可能为澳大利亚城市或其他国家城市，只返回城市名
         - 例如："Place of Birth: SYDNEY" 或 "Place of Birth: MELBOURNE"
         - 只提取城市名：SYDNEY 或 MELBOURNE`;
    }
    
    return basePrompt;
  }

  normalizePassportData(data, expectedType) {
    const normalized = {
      fullName: data.fullName ? data.fullName.replace(/-/g, ' ') : null,
      chineseName: data.chineseName || null,
      passportNumber: data.passportNumber ? data.passportNumber.toUpperCase().replace(/\s/g, '') : null,
      gender: data.gender || null,
      nationality: getCountryCode(data.nationality) || data.nationality || null,
      birthDate: this.parseDate(data.birthDate),
      issueDate: this.parseDate(data.issueDate),
      expiryDate: this.parseDate(data.expiryDate),
      birthPlace: this.normalizeBirthPlace(data.birthPlace, expectedType)
    };

    if (normalized.gender) {
      normalized.gender = normalized.gender.toUpperCase().charAt(0);
      if (normalized.gender !== 'M' && normalized.gender !== 'F') {
        normalized.gender = null;
      }
    }

    return normalized;
  }

  normalizeBirthPlace(birthPlace, expectedType) {
    if (!birthPlace) return null;
    
    let normalized = birthPlace.toUpperCase().trim();
    
    // 清理可能的标签前缀
    const labelPrefixes = [
      'PLACE OF BIRTH:', 'PLACE OF BIRTH', 'BIRTH PLACE:', 'BIRTH PLACE',
      'BORN IN:', 'BORN IN', '出生地:', '出生地', 'LIEU DE NAISSANCE:',
      'LUGAR DE NACIMIENTO:', 'POB:', 'BIRTHPLACE:'
    ];
    
    for (const prefix of labelPrefixes) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.replace(prefix, '').trim();
        break;
      }
    }
    
    // 如果包含逗号分隔的国家信息，只取城市部分
    if (normalized.includes(',')) {
      normalized = normalized.split(',')[0].trim();
    }
    
    // 清理可能的国家名称后缀
    const countryNames = [
      'CHINA', 'NEW ZEALAND', 'AUSTRALIA', 'USA', 'UK', 'CANADA', 
      'JAPAN', 'FRANCE', 'GERMANY', 'ITALY', 'SPAIN', 'NETHERLANDS'
    ];
    
    for (const country of countryNames) {
      if (normalized.endsWith(country)) {
        normalized = normalized.replace(country, '').trim();
        // 移除可能的分隔符
        normalized = normalized.replace(/[,\-\s]+$/, '');
        break;
      }
    }
    
    // 移除其他可能的标点符号和多余空格
    normalized = normalized.replace(/[.:;]/g, '').trim();
    
    // 只返回城市名称
    return normalized || null;
  }

  async createOCRLog(imagePath, logContext = {}) {
    try {
      const stats = await fs.stat(imagePath);
      
      const logData = {
        uploadLink: logContext.uploadLink || 'unknown',
        touristId: logContext.touristId || null,
        operationType: logContext.operationType || 'preview',
        operatorName: logContext.operatorName || '游客',
        operatorId: logContext.operatorId || null,
        imagePath: imagePath,
        imageSize: stats.size,
        imageQuality: logContext.imageQuality || null,
        ocrStatus: 'pending',
        ocrModel: 'gpt-4o-mini',
        ipAddress: logContext.ipAddress || null,
        userAgent: logContext.userAgent || null
      };
      
      const logEntry = new OCRLog(logData);
      return await logEntry.save();
    } catch (error) {
      console.error('创建OCR日志失败:', error);
      return null;
    }
  }

  async updateOCRLog(logId, updateData) {
    try {
      if (!logId) return;
      await OCRLog.findByIdAndUpdate(logId, updateData);
    } catch (error) {
      console.error('更新OCR日志失败:', error);
    }
  }

  async logConfirmation(logId, confirmedData, uploadLink = 'unknown', operatorName = '游客') {
    try {
      if (!logId) return;
      await OCRLog.findByIdAndUpdate(logId, {
        confirmedData: confirmedData
      });
      
      // 文件日志：记录用户确认
      fileLogger.logOCRConfirmation(uploadLink, confirmedData, operatorName);
      
      console.log(`[用户确认] 日志ID: ${logId}, 用户确认了识别数据`);
    } catch (error) {
      console.error('记录用户确认失败:', error);
    }
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      const patterns = [
        /(\d{4})-(\d{2})-(\d{2})/,
        /(\d{2})\/(\d{2})\/(\d{4})/,
        /(\d{2})-(\d{2})-(\d{4})/,
        /(\d{2})\.(\d{2})\.(\d{4})/
      ];
      
      for (const pattern of patterns) {
        const match = dateStr.match(pattern);
        if (match) {
          let year, month, day;
          
          if (match[1].length === 4) {
            // YYYY-MM-DD format
            year = match[1];
            month = match[2];
            day = match[3];
          } else {
            // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY formats
            day = match[1];
            month = match[2];
            year = match[3];
          }
          
          // Return DD/MM/YYYY format
          return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
      }
      
      return dateStr;
    } catch (error) {
      return null;
    }
  }

  async imageToBase64(imagePath) {
    try {
      const processedPath = imagePath.replace('.jpg', '_processed.jpg');
      
      await sharp(imagePath)
        .resize(1500, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 90 })
        .toFile(processedPath);
      
      const imageBuffer = await fs.readFile(processedPath);
      await fs.unlink(processedPath);
      
      return imageBuffer.toString('base64');
    } catch (error) {
      const imageBuffer = await fs.readFile(imagePath);
      return imageBuffer.toString('base64');
    }
  }

  async validatePassportData(data) {
    const errors = [];
    
    if (!data.fullName) {
      errors.push('姓名未识别');
    }
    
    if (!data.passportNumber || data.passportNumber.length < 6) {
      errors.push('护照号码无效');
    }
    
    if (!data.gender || !['M', 'F'].includes(data.gender)) {
      errors.push('性别信息无效');
    }
    
    if (!data.expiryDate) {
      errors.push('有效期未识别');
    } else {
      const expiry = new Date(data.expiryDate);
      if (expiry < new Date()) {
        errors.push('护照已过期');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = new PassportOCR();