const Tourist = require('../models/Tourist');
const EmailVerification = require('../models/EmailVerification');
const imageQuality = require('../utils/imageQuality');
const passportOCR = require('../utils/passportOCR');
const { getCountryCode } = require('../utils/countryCode');
const { validatePassportName } = require('../utils/nameValidator');
const fs = require('fs').promises;
const path = require('path');

exports.previewPassport = async (req, res) => {
  try {
    const { uploadLink } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传护照图片'
      });
    }

    const tourist = await Tourist.findOne({ uploadLink });
    if (!tourist) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        error: '无效的上传链接'
      });
    }

    console.log('检查图像质量...');
    const qualityCheck = await imageQuality.checkImageQuality(req.file.path);
    
    if (!qualityCheck.isValid) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '图像质量不符合要求',
        issues: qualityCheck.issues,
        needsExample: qualityCheck.needsExample
      });
    }

    console.log('识别护照信息...');
    const logContext = {
      uploadLink,
      operationType: 'preview',
      operatorName: '游客',
      imageQuality: qualityCheck,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    const ocrResult = await passportOCR.recognizePassport(req.file.path, null, logContext);
    
    // 无论识别成功与否，都删除临时文件
    await fs.unlink(req.file.path);
    
    if (!ocrResult.success) {
      return res.status(400).json({
        success: false,
        error: '无法识别护照信息，请重新上传清晰的护照照片'
      });
    }

    const passportData = ocrResult.data;
    
    // 返回识别结果供前端编辑
    res.json({
      success: true,
      message: '护照信息识别成功',
      data: {
        recognizedName: passportData.fullName,
        passportNumber: passportData.passportNumber,
        gender: passportData.gender,
        nationality: passportData.nationality,
        issueDate: passportData.issueDate,
        expiryDate: passportData.expiryDate,
        birthDate: passportData.birthDate,
        birthPlace: passportData.birthPlace
      }
    });
  } catch (error) {
    console.error('Preview error:', error);
    
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || '预览失败，请重试'
    });
  }
};

exports.uploadPassport = async (req, res) => {
  try {
    const { uploadLink } = req.params;
    const { confirmData } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传护照图片'
      });
    }

    if (!confirmData) {
      return res.status(400).json({
        success: false,
        error: '缺少确认数据'
      });
    }

    let confirmedData;
    try {
      confirmedData = JSON.parse(confirmData);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: '确认数据格式错误'
      });
    }

    const tourist = await Tourist.findOne({ uploadLink });
    if (!tourist) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        error: '无效的上传链接'
      });
    }

    if (tourist.uploadStatus === 'verified') {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '护照已经上传并验证'
      });
    }

    // 验证必填字段
    if (!confirmedData.fullName || !confirmedData.passportNumber || !confirmedData.expiryDate || !confirmedData.birthDate || !confirmedData.birthPlace || !confirmedData.contactPhone || !confirmedData.contactEmail) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '姓名、护照号码、出生日期、出生地、有效期、联系电话和邮箱为必填项'
      });
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(confirmedData.contactEmail)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '邮箱格式不正确'
      });
    }
    
    // 验证邮箱验证码
    const isEmailVerified = await EmailVerification.isEmailVerified(confirmedData.contactEmail, uploadLink);
    if (!isEmailVerified) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '邮箱未验证，请先验证邮箱'
      });
    }
    
    // 验证出生地格式（只允许英文字母、空格和横线）
    const birthPlaceRegex = /^[A-Za-z\s-]+$/;
    if (!birthPlaceRegex.test(confirmedData.birthPlace)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '出生地只能包含英文字母、空格和横线'
      });
    }
    
    // 验证姓名格式
    const nameValidation = validatePassportName(confirmedData.fullName);
    if (!nameValidation.valid) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: nameValidation.error
      });
    }

    // 保存文件
    const filename = path.basename(req.file.path);
    tourist.passportPhoto = `/uploads/${filename}`;
    // 处理姓名中的横线并使用格式化后的姓名
    tourist.passportName = nameValidation.formatted.replace(/-/g, ' ');
    tourist.passportNumber = confirmedData.passportNumber.toUpperCase();
    // 确保国籍保存为三位代码格式
    tourist.nationality = getCountryCode(confirmedData.nationality) || confirmedData.nationality;
    tourist.gender = confirmedData.gender;
    // 处理DD/MM/YYYY格式的日期
    const parseDDMMYYYY = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY -> Create Date object with year, month-1, day
        const year = parseInt(parts[2]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed in JavaScript
        const day = parseInt(parts[0]);
        return new Date(year, month, day);
      }
      return new Date(dateStr);
    };
    
    tourist.passportIssueDate = confirmedData.issueDate ? parseDDMMYYYY(confirmedData.issueDate) : null;
    tourist.passportExpiryDate = confirmedData.expiryDate ? parseDDMMYYYY(confirmedData.expiryDate) : null;
    tourist.passportBirthDate = confirmedData.birthDate ? parseDDMMYYYY(confirmedData.birthDate) : null;
    tourist.birthPlace = confirmedData.birthPlace ? confirmedData.birthPlace.toUpperCase() : null;
    tourist.contactPhone = confirmedData.contactPhone;
    tourist.contactEmail = confirmedData.contactEmail.toLowerCase();
    tourist.uploadStatus = 'verified';
    tourist.rejectionReason = null;
    tourist.recognizedData = {
      name: confirmedData.fullName.replace(/-/g, ' '),
      passportNumber: confirmedData.passportNumber.toUpperCase(),
      gender: confirmedData.gender,
      nationality: confirmedData.nationality,
      birthDate: parseDDMMYYYY(confirmedData.birthDate),
      birthPlace: confirmedData.birthPlace ? confirmedData.birthPlace.toUpperCase() : null,
      issueDate: parseDDMMYYYY(confirmedData.issueDate),
      expiryDate: parseDDMMYYYY(confirmedData.expiryDate)
    };

    // 更新游客姓名（如果原来为空）
    if (confirmedData.fullName && !tourist.touristName) {
      tourist.touristName = confirmedData.fullName;
    }

    await tourist.save();

    // 记录用户确认的数据到日志
    try {
      const passportOCR = require('../utils/passportOCR');
      await passportOCR.logConfirmation(null, {
        fullName: confirmedData.fullName,
        passportNumber: confirmedData.passportNumber,
        gender: confirmedData.gender,
        nationality: confirmedData.nationality,
        birthDate: parseDDMMYYYY(confirmedData.birthDate),
        issueDate: parseDDMMYYYY(confirmedData.issueDate),
        expiryDate: parseDDMMYYYY(confirmedData.expiryDate),
        birthPlace: confirmedData.birthPlace,
        contactPhone: confirmedData.contactPhone,
        contactEmail: confirmedData.contactEmail
      }, uploadLink, '游客');
    } catch (logError) {
      console.error('记录确认日志失败:', logError);
    }

    res.json({
      success: true,
      message: '护照信息确认并保存成功',
      data: {
        name: confirmedData.fullName,
        passportNumber: confirmedData.passportNumber,
        gender: confirmedData.gender,
        nationality: tourist.nationality,
        expiryDate: confirmedData.expiryDate
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || '上传失败，请重试'
    });
  }
};

exports.checkImageQuality = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传图片'
      });
    }

    const qualityCheck = await imageQuality.checkImageQuality(req.file.path);
    
    await fs.unlink(req.file.path);

    res.json({
      success: qualityCheck.isValid,
      issues: qualityCheck.issues,
      metadata: qualityCheck.metadata
    });
  } catch (error) {
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getUploadStatus = async (req, res) => {
  try {
    const { uploadLink } = req.params;
    
    const tourist = await Tourist.findOne({ uploadLink })
      .select('uploadStatus rejectionReason passportPhoto recognizedData')
      .populate('tourId', 'productName departureDate');
    
    if (!tourist) {
      return res.status(404).json({
        success: false,
        error: '无效的上传链接'
      });
    }
    
    res.json({
      success: true,
      data: {
        status: tourist.uploadStatus,
        rejectionReason: tourist.rejectionReason,
        passportPhoto: tourist.passportPhoto,
        recognizedData: tourist.recognizedData,
        tourInfo: {
          productName: tourist.tourId.productName,
          departureDate: tourist.tourId.departureDate
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};