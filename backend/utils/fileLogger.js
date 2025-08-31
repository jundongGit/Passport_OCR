const fs = require('fs');
const path = require('path');

class FileLogger {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.ensureLogsDir();
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  getLogFileName(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return `ocr-${dateStr}.log`;
  }

  formatLogEntry(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };
    return JSON.stringify(logEntry) + '\n';
  }

  writeLog(level, message, data = {}) {
    try {
      const logFileName = this.getLogFileName();
      const logFilePath = path.join(this.logsDir, logFileName);
      const logEntry = this.formatLogEntry(level, message, data);
      
      fs.appendFileSync(logFilePath, logEntry);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  logOCRStart(uploadLink, operationType, operatorName, imageInfo = {}) {
    this.writeLog('INFO', 'OCR识别开始', {
      uploadLink,
      operationType,
      operatorName,
      imageSize: imageInfo.size,
      imageMimetype: imageInfo.mimetype,
      event: 'ocr_start'
    });
  }

  logOCRSuccess(uploadLink, recognizedData, duration, operatorName) {
    this.writeLog('INFO', 'OCR识别成功', {
      uploadLink,
      duration,
      operatorName,
      recognizedData: {
        fullName: recognizedData.fullName,
        passportNumber: recognizedData.passportNumber,
        nationality: recognizedData.nationality,
        birthDate: recognizedData.birthDate,
        expiryDate: recognizedData.expiryDate
      },
      event: 'ocr_success'
    });
  }

  logOCRError(uploadLink, error, duration, operatorName) {
    this.writeLog('ERROR', 'OCR识别失败', {
      uploadLink,
      duration,
      operatorName,
      error: error.message || error,
      event: 'ocr_error'
    });
  }

  logOCRConfirmation(uploadLink, confirmedData, operatorName) {
    this.writeLog('INFO', '用户确认数据', {
      uploadLink,
      operatorName,
      confirmedData: {
        fullName: confirmedData.fullName,
        passportNumber: confirmedData.passportNumber,
        contactPhone: confirmedData.contactPhone,
        contactEmail: confirmedData.contactEmail
      },
      event: 'ocr_confirmation'
    });
  }

  logSystemEvent(event, message, data = {}) {
    this.writeLog('SYSTEM', message, {
      event,
      ...data
    });
  }
}

module.exports = new FileLogger();