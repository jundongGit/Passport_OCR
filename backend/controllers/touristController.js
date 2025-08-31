const Tourist = require('../models/Tourist');
const Tour = require('../models/Tour');
const { v4: uuidv4 } = require('uuid');
const imageQuality = require('../utils/imageQuality');
const passportOCR = require('../utils/passportOCR');
const { getCountryCode } = require('../utils/countryCode');
const { validatePassportName } = require('../utils/nameValidator');
const fs = require('fs').promises;
const path = require('path');

exports.getAllTourists = async (req, res) => {
  try {
    const tourists = await Tourist.find({})
      .populate('tourId', 'productName departureDate')
      .sort({ ekok: 1, touristName: 1 }); // 按EKOK分组，EKOK相同则按姓名排序
    
    // 添加tourName字段以便前端使用
    const touristsWithTourName = tourists.map(tourist => ({
      ...tourist.toObject(),
      tourName: tourist.tourId ? tourist.tourId.productName : 'Unknown Tour'
    }));
    
    res.json({
      success: true,
      data: touristsWithTourName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.createTourist = async (req, res) => {
  try {
    const { 
      tourId, 
      touristName, 
      salesName, 
      salespersonId,
      ekok,
      contactPhone,
      contactEmail 
    } = req.body;
    
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        error: 'Tour not found'
      });
    }
    
    // 验证邮箱格式
    if (contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        return res.status(400).json({
          success: false,
          error: '邮箱格式不正确'
        });
      }
    }
    
    const uploadLink = uuidv4();
    
    const newTourist = new Tourist({
      tourId,
      touristName,
      salesName,
      salespersonId,
      ekok,
      contactPhone,
      contactEmail,
      uploadLink
    });
    
    const savedTourist = await newTourist.save();
    res.status(201).json({
      success: true,
      data: savedTourist,
      uploadUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/upload/${uploadLink}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.getTouristsByTour = async (req, res) => {
  try {
    const tourists = await Tourist.find({ tourId: req.params.tourId })
      .populate('tourId', 'productName departureDate')
      .sort({ ekok: 1, touristName: 1 }); // 按EKOK排序，EKOK相同则按姓名排序
    
    // 计算游客类型（基于出生日期和出团日期）
    const touristsWithType = tourists.map(tourist => {
      const touristObj = tourist.toObject();
      
      // 计算游客类型
      if (tourist.passportBirthDate && tourist.tourId && tourist.tourId.departureDate) {
        const birthDate = new Date(tourist.passportBirthDate);
        const departureDate = new Date(tourist.tourId.departureDate);
        
        // 计算年龄
        let age = departureDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = departureDate.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && departureDate.getDate() < birthDate.getDate())) {
          age--;
        }
        
        // 大于12岁为成人ADT，小于等于12岁为儿童CHD
        touristObj.touristType = age > 12 ? 'ADT' : 'CHD';
      } else {
        // 默认为成人
        touristObj.touristType = 'ADT';
      }
      
      return touristObj;
    });
    
    res.json({
      success: true,
      data: touristsWithType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getTouristByUploadLink = async (req, res) => {
  try {
    const tourist = await Tourist.findOne({ uploadLink: req.params.uploadLink })
      .populate('tourId', 'productName departureDate');
    
    if (!tourist) {
      return res.status(404).json({
        success: false,
        error: 'Invalid upload link'
      });
    }
    
    res.json({
      success: true,
      data: {
        touristName: tourist.touristName,
        salesName: tourist.salesName,
        tourName: tourist.tourId.productName,
        departureDate: tourist.tourId.departureDate,
        uploadStatus: tourist.uploadStatus,
        passportPhoto: tourist.passportPhoto,
        rejectionReason: tourist.rejectionReason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getTouristById = async (req, res) => {
  try {
    const tourist = await Tourist.findById(req.params.id)
      .populate('tourId', 'productName departureDate');
    
    if (!tourist) {
      return res.status(404).json({
        success: false,
        error: 'Tourist not found'
      });
    }
    
    res.json({
      success: true,
      data: tourist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.updateTourist = async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() };
    
    // 如果不是管理员，移除房型和备注的修改权限
    if (req.salesperson && req.salesperson.role !== 'admin') {
      delete updateData.roomType;
      delete updateData.remarks;
    }
    
    const tourist = await Tourist.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!tourist) {
      return res.status(404).json({
        success: false,
        error: 'Tourist not found'
      });
    }
    
    res.json({
      success: true,
      data: tourist
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.deleteTourist = async (req, res) => {
  try {
    const tourist = await Tourist.findById(req.params.id);
    
    if (!tourist) {
      return res.status(404).json({
        success: false,
        error: '游客不存在'
      });
    }
    
    // 如果有护照照片，删除文件
    if (tourist.passportPhoto) {
      const fs = require('fs').promises;
      const path = require('path');
      
      try {
        const filePath = path.join(__dirname, '..', tourist.passportPhoto);
        await fs.unlink(filePath);
        console.log(`Deleted passport photo: ${filePath}`);
      } catch (fileError) {
        console.error('Failed to delete passport photo:', fileError);
        // 不要因为文件删除失败而终止整个删除操作
      }
    }
    
    // 删除游客记录
    await Tourist.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: '游客删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.updatePassportPhoto = async (req, res) => {
  try {
    const touristId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传护照图片'
      });
    }

    const tourist = await Tourist.findById(touristId);
    if (!tourist) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        error: '游客不存在'
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
      uploadLink: tourist.uploadLink,
      touristId: tourist._id,
      operationType: 'update',
      operatorName: req.salesperson?.name || '管理员',
      operatorId: req.salesperson?._id || null,
      imageQuality: qualityCheck,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    const ocrResult = await passportOCR.recognizePassport(req.file.path, null, logContext);
    
    if (!ocrResult.success) {
      // 即使识别失败，也保存照片并返回部分成功
      const filename = path.basename(req.file.path);
      
      // 删除旧的护照照片文件（如果存在）
      if (tourist.passportPhoto) {
        try {
          const oldFilePath = path.join(__dirname, '..', tourist.passportPhoto);
          await fs.unlink(oldFilePath);
        } catch (err) {
          console.log('旧文件删除失败或不存在');
        }
      }
      
      tourist.passportPhoto = `/uploads/${filename}`;
      await tourist.save();
      
      return res.json({
        success: true,
        message: '护照照片已上传，但自动识别失败，请手动填写信息',
        passportPhoto: tourist.passportPhoto,
        recognizedData: null
      });
    }

    const passportData = ocrResult.data;
    
    // 如果游客已有护照姓名信息，验证新护照是否为同一人
    if (tourist.passportName && passportData.fullName) {
      const existingName = tourist.passportName.replace(/\s+/g, ' ').trim().toUpperCase();
      const newName = passportData.fullName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
      
      if (existingName !== newName) {
        // 删除已上传的文件
        await fs.unlink(req.file.path);
        
        return res.status(400).json({
          success: false,
          error: `护照姓名不匹配。原护照姓名: ${tourist.passportName}，新护照姓名: ${passportData.fullName}。不能通过编辑护照照片来更换游客。`
        });
      }
    }
    
    // 如果游客已有护照号码，验证新护照号码是否一致
    if (tourist.passportNumber && passportData.passportNumber) {
      const existingNumber = tourist.passportNumber.toUpperCase().replace(/\s+/g, '');
      const newNumber = passportData.passportNumber.toUpperCase().replace(/\s+/g, '');
      
      if (existingNumber !== newNumber) {
        // 删除已上传的文件
        await fs.unlink(req.file.path);
        
        return res.status(400).json({
          success: false,
          error: `不可更改护照持有人。原护照号码: ${tourist.passportNumber}，新识别的护照号码: ${passportData.passportNumber}。`
        });
      }
    }
    
    // 处理DD/MM/YYYY格式的日期
    const parseDDMMYYYY = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[2]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[0]);
        return new Date(year, month, day);
      }
      return new Date(dateStr);
    };

    // 保存文件和更新游客信息
    const filename = path.basename(req.file.path);
    
    // 删除旧的护照照片文件（如果存在）
    if (tourist.passportPhoto) {
      try {
        const oldFilePath = path.join(__dirname, '..', tourist.passportPhoto);
        await fs.unlink(oldFilePath);
      } catch (err) {
        console.log('旧文件删除失败或不存在');
      }
    }
    
    tourist.passportPhoto = `/uploads/${filename}`;
    tourist.recognizedData = {
      name: passportData.fullName ? passportData.fullName.replace(/-/g, ' ') : null,
      fullName: passportData.fullName ? passportData.fullName.replace(/-/g, ' ') : null,
      passportNumber: passportData.passportNumber,
      gender: passportData.gender,
      nationality: passportData.nationality,
      birthDate: parseDDMMYYYY(passportData.birthDate),
      birthPlace: passportData.birthPlace ? passportData.birthPlace.toUpperCase() : null,
      issueDate: parseDDMMYYYY(passportData.issueDate),
      expiryDate: parseDDMMYYYY(passportData.expiryDate)
    };
    
    await tourist.save();
    
    res.json({
      success: true,
      message: '护照照片上传并识别成功',
      passportPhoto: tourist.passportPhoto,
      recognizedData: {
        fullName: passportData.fullName ? passportData.fullName.replace(/-/g, ' ') : null,
        passportNumber: passportData.passportNumber,
        gender: passportData.gender,
        nationality: passportData.nationality,
        birthDate: passportData.birthDate,
        birthPlace: passportData.birthPlace ? passportData.birthPlace.toUpperCase() : null,
        issueDate: passportData.issueDate,
        expiryDate: passportData.expiryDate
      }
    });
  } catch (error) {
    console.error('Update passport photo error:', error);
    
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || '护照照片更新失败，请重试'
    });
  }
};