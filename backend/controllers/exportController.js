const Tourist = require('../models/Tourist');
const Tour = require('../models/Tour');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

exports.exportPassportPhotos = async (req, res) => {
  try {
    const { tourId, touristIds } = req.body;
    
    // 验证输入
    if (!tourId || !touristIds || !Array.isArray(touristIds) || touristIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：tourId 和 touristIds'
      });
    }

    // 获取旅游产品信息
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        error: '旅游产品不存在'
      });
    }

    // 获取指定游客的护照照片
    const tourists = await Tourist.find({
      _id: { $in: touristIds },
      tourId: tourId,
      passportPhoto: { $exists: true, $ne: null }
    });

    if (tourists.length === 0) {
      return res.status(404).json({
        success: false,
        error: '没有找到护照照片'
      });
    }

    // 验证文件是否存在并收集有效的照片
    const validPhotos = [];
    for (const tourist of tourists) {
      const photoPath = path.join(__dirname, '..', tourist.passportPhoto);
      try {
        await fs.promises.access(photoPath);
        // 将游客姓名中的 / 替换为 _ 用作文件夹名
        const folderName = tourist.touristName.replace(/\//g, '_');
        const fileExtension = path.extname(tourist.passportPhoto) || '.jpg';
        validPhotos.push({
          tourist,
          photoPath,
          folderName,
          filename: `${folderName}/${folderName}_护照${fileExtension}`
        });
      } catch (err) {
        console.log(`护照照片不存在: ${photoPath}`);
      }
    }

    if (validPhotos.length === 0) {
      return res.status(404).json({
        success: false,
        error: '所有护照照片文件都不存在'
      });
    }

    // 设置响应头
    const zipFilename = `${tour.productName}_护照照片_${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);

    // 创建 zip 压缩包
    const archive = archiver('zip', {
      zlib: { level: 9 } // 压缩级别
    });

    // 处理错误
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: '压缩包创建失败'
        });
      }
    });

    // 将压缩包流式传输到响应
    archive.pipe(res);

    // 添加文件到压缩包
    for (const photo of validPhotos) {
      archive.file(photo.photoPath, { name: photo.filename });
    }

    // 完成压缩包
    await archive.finalize();
    
    console.log(`成功导出 ${validPhotos.length} 张护照照片`);

  } catch (error) {
    console.error('Export passport photos error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || '导出失败'
      });
    }
  }
};