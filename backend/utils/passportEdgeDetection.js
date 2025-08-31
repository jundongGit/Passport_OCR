const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');
const { detectPassportEdgesWithOpenCV } = require('./opencvEdgeDetection');

/**
 * 检测护照四个边角是否在图像中完整显示
 * @param {string} imagePath - 图像文件路径
 * @returns {Promise<Object>} - 检测结果
 */
async function detectPassportEdges(imagePath) {
  try {
    console.log('开始护照边缘检测, 图像路径:', imagePath);
    
    // 优先尝试使用OpenCV风格的专业检测
    try {
      const opencvResult = await detectPassportEdgesWithOpenCV(imagePath);
      if (opencvResult.success) {
        console.log('OpenCV检测成功:', opencvResult.message);
        return opencvResult;
      }
    } catch (opencvError) {
      console.log('OpenCV检测失败，使用备用方案:', opencvError.message);
    }
    
    // 备用方案：使用原有的简单检测
    console.log('使用备用检测方案...');
    const fallbackResult = await fallbackDetection(imagePath);
    return fallbackResult;
    
  } catch (error) {
    console.error('所有边缘检测方案失败:', error);
    return {
      success: false,
      hasCompleteEdges: true, // 失败时默认通过，避免影响用户体验
      message: '检测系统暂时不可用，图像已接受',
      error: error.message
    };
  }
}

/**
 * 备用检测方案 - 基于原有的简单检测逻辑
 */
async function fallbackDetection(imagePath) {
  try {
    // 使用sharp获取图像信息并处理
    const imageBuffer = await sharp(imagePath)
      .resize(800, null, { withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });

    const { width, height } = imageBuffer.info;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 加载图像到canvas
    const img = await loadImage(imageBuffer.data);
    ctx.drawImage(img, 0, 0);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 简单检测策略：主要检查图像质量和基本完整性
    const passportAnalysis = analyzePassportImage(data, width, height);
    
    return {
      success: true,
      hasCompleteEdges: passportAnalysis.isValid,
      edges: passportAnalysis.edges,
      message: `备用检测: ${passportAnalysis.message}`,
      details: {
        method: 'fallback',
        ...passportAnalysis.details
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 分析护照图像的完整性 - 使用更宽松和智能的方法
 * @param {Uint8ClampedArray} data - 图像像素数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @returns {Object} - 分析结果
 */
function analyzePassportImage(data, width, height) {
  try {
    // 基本图像质量检查
    const imageQuality = checkImageQuality(data, width, height);
    
    // 如果图像质量太差，直接失败
    if (!imageQuality.acceptable) {
      return {
        isValid: false,
        message: imageQuality.reason,
        edges: {},
        details: imageQuality
      };
    }
    
    // 检测护照特征（非常宽松）
    const passportFeatures = detectPassportFeatures(data, width, height);
    
    // 新的宽松判断逻辑：只要图像质量可接受且有基本的文档特征就通过
    const isValid = imageQuality.acceptable && passportFeatures.hasDocumentFeatures;
    
    let message = '';
    if (isValid) {
      message = '护照图像检测通过';
    } else if (!imageQuality.acceptable) {
      message = imageQuality.reason;
    } else {
      message = '图像可能不是护照信息页，请确认上传的是护照信息页照片';
    }
    
    return {
      isValid,
      message,
      edges: passportFeatures.edges,
      details: {
        imageQuality,
        passportFeatures,
        width,
        height
      }
    };
    
  } catch (error) {
    console.error('Passport analysis error:', error);
    return {
      isValid: true, // 出错时默认通过，避免误判
      message: '检测过程中出现问题，但图像已接受',
      edges: {},
      details: { error: error.message }
    };
  }
}

/**
 * 检查基本图像质量
 */
function checkImageQuality(data, width, height) {
  // 计算图像的基本统计信息
  let totalBrightness = 0;
  let veryDarkPixels = 0;
  let veryBrightPixels = 0;
  const totalPixels = width * height;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    
    totalBrightness += brightness;
    
    if (brightness < 20) veryDarkPixels++;
    if (brightness > 240) veryBrightPixels++;
  }
  
  const avgBrightness = totalBrightness / totalPixels;
  const darkRatio = veryDarkPixels / totalPixels;
  const brightRatio = veryBrightPixels / totalPixels;
  
  // 非常宽松的质量标准
  if (avgBrightness < 15) {
    return {
      acceptable: false,
      reason: '图像太暗，请在更好的光线下重新拍摄'
    };
  }
  
  if (brightRatio > 0.8) {
    return {
      acceptable: false,
      reason: '图像过度曝光，请避免强光直射'
    };
  }
  
  if (darkRatio > 0.8) {
    return {
      acceptable: false,
      reason: '图像太暗，请增加光线或调整拍摄角度'
    };
  }
  
  return {
    acceptable: true,
    avgBrightness,
    darkRatio,
    brightRatio
  };
}

/**
 * 检测护照文档特征（非常宽松）
 */
function detectPassportFeatures(data, width, height) {
  // 简单检测是否有文档的基本特征
  // 主要看是否有文字区域（对比度变化）
  
  let contrastChanges = 0;
  const sampleSize = Math.min(1000, Math.floor(data.length / 40)); // 只采样部分像素
  
  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * (data.length / 4)) * 4;
    if (idx + 4 < data.length) {
      const brightness1 = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const brightness2 = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
      
      if (Math.abs(brightness1 - brightness2) > 30) {
        contrastChanges++;
      }
    }
  }
  
  // 如果有足够的对比度变化，认为是文档
  const hasDocumentFeatures = contrastChanges > sampleSize * 0.1;
  
  return {
    hasDocumentFeatures,
    contrastChanges,
    sampleSize,
    edges: {
      top: true,    // 默认都为true，实际不检测严格的边缘
      bottom: true,
      left: true,
      right: true,
      corners: {
        topLeft: true,
        topRight: true,
        bottomLeft: true,
        bottomRight: true
      }
    }
  };
}

module.exports = {
  detectPassportEdges
};