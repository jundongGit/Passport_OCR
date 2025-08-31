const sharp = require('sharp');
const { detectPassportEdges } = require('./passportEdgeDetection');

class ImageQualityChecker {
  constructor() {
    this.minWidth = 800;
    this.minHeight = 600;
    this.maxBrightness = 240;
    this.minBrightness = 30;
    this.minSharpness = 0.5;
  }

  async checkImageQuality(imagePath) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      // 已移除所有图像质量限制 - 接受任何护照照片
      return {
        isValid: true, // 总是返回有效
        issues: [], // 不再有任何限制
        needsExample: false,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          aspectRatio: metadata.width / metadata.height
        }
      };
    } catch (error) {
      // 即使检查失败也允许通过
      return {
        isValid: true,
        issues: [],
        needsExample: false,
        metadata: {
          width: 0,
          height: 0,
          format: 'unknown'
        }
      };
    }
  }

  calculateAverageBrightness(stats) {
    const channels = stats.channels;
    let totalBrightness = 0;
    let channelCount = 0;
    
    channels.forEach(channel => {
      totalBrightness += channel.mean;
      channelCount++;
    });
    
    return totalBrightness / channelCount;
  }

  async detectGlare(imagePath) {
    try {
      const image = sharp(imagePath);
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const pixels = new Uint8Array(data);
      const pixelCount = info.width * info.height;
      let overexposedPixels = 0;
      
      for (let i = 0; i < pixels.length; i += info.channels) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        if (r > 250 && g > 250 && b > 250) {
          overexposedPixels++;
        }
      }
      
      const overexposedRatio = overexposedPixels / pixelCount;
      return overexposedRatio > 0.15;
    } catch (error) {
      console.error('Glare detection error:', error);
      return false;
    }
  }

  async detectBlur(imagePath) {
    try {
      const image = sharp(imagePath);
      const edges = await image
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .raw()
        .toBuffer();
      
      let edgeStrength = 0;
      for (let i = 0; i < edges.length; i++) {
        edgeStrength += Math.abs(edges[i]);
      }
      
      const avgEdgeStrength = edgeStrength / edges.length;
      return avgEdgeStrength < this.minSharpness;
    } catch (error) {
      console.error('Blur detection error:', error);
      return false;
    }
  }


  async preprocessImage(imagePath, outputPath) {
    try {
      await sharp(imagePath)
        .resize(1200, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .normalize()
        .sharpen()
        .jpeg({ quality: 95 })
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      throw new Error(`图像预处理失败: ${error.message}`);
    }
  }
}

module.exports = new ImageQualityChecker();