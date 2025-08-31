import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button, Modal, message, Space } from 'antd';
import { CameraOutlined, CloseOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import './CameraCapture.css';

function CameraCapture({ visible, onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [edgesDetected, setEdgesDetected] = useState(false);
  const [edgeStatus, setEdgeStatus] = useState({
    top: false,
    bottom: false,
    left: false,
    right: false
  });
  const [cornerStatus, setCornerStatus] = useState({
    topLeft: false,
    topRight: false,
    bottomLeft: false,
    bottomRight: false
  });

  // 启动相机
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // 使用后置摄像头
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setIsDetecting(true);
    } catch (error) {
      console.error('Camera access error:', error);
      message.error('无法访问相机，请确保已授予相机权限');
    }
  }, []);

  // 停止相机
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsDetecting(false);
  }, [stream]);

  // 边缘检测 - 检测护照四个边角
  const detectEdges = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isDetecting) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // 获取图像数据进行边缘检测
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 定义检测区域 - 识别框的位置（相对于视频尺寸的10%边距）
    const frameMarginPercent = 0.1;
    const frameLeft = Math.floor(canvas.width * frameMarginPercent);
    const frameTop = Math.floor(canvas.height * frameMarginPercent);
    const frameRight = Math.floor(canvas.width * (1 - frameMarginPercent));
    const frameBottom = Math.floor(canvas.height * (1 - frameMarginPercent));
    const frameWidth = frameRight - frameLeft;
    const frameHeight = frameBottom - frameTop;
    
    // 边缘检测参数
    const edgeWidth = 40; // 边缘检测宽度（扩大检测区域）
    const cornerSize = 80; // 角落检测区域大小（扩大角落检测区域）
    const brightnessThreshold = 160; // 亮度阈值（降低以检测更多边缘）
    const contrastThreshold = 50; // 对比度阈值
    
    // 辅助函数：检测某个区域是否有护照边缘
    const detectRegion = (x1, y1, x2, y2) => {
      let brightPixels = 0;
      let darkPixels = 0;
      let totalPixels = 0;
      
      for (let y = y1; y < y2 && y < canvas.height; y++) {
        for (let x = x1; x < x2 && x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (brightness > brightnessThreshold) {
            brightPixels++;
          } else if (brightness < 100) {
            darkPixels++;
          }
          totalPixels++;
        }
      }
      
      // 需要有一定比例的亮像素（护照通常是白色/浅色）
      // 同时要有对比（不能全是亮的或全是暗的）
      const brightRatio = brightPixels / totalPixels;
      const darkRatio = darkPixels / totalPixels;
      
      // 调整阈值以提高检测成功率
      // 护照边缘通常有15%-80%的亮像素
      return brightRatio > 0.15 && brightRatio < 0.85 && (darkRatio > 0.02 || brightRatio > 0.3);
    };
    
    // 检测四个角落
    const corners = {
      topLeft: detectRegion(
        frameLeft - edgeWidth, 
        frameTop - edgeWidth, 
        frameLeft + cornerSize, 
        frameTop + cornerSize
      ),
      topRight: detectRegion(
        frameRight - cornerSize, 
        frameTop - edgeWidth, 
        frameRight + edgeWidth, 
        frameTop + cornerSize
      ),
      bottomLeft: detectRegion(
        frameLeft - edgeWidth, 
        frameBottom - cornerSize, 
        frameLeft + cornerSize, 
        frameBottom + edgeWidth
      ),
      bottomRight: detectRegion(
        frameRight - cornerSize, 
        frameBottom - cornerSize, 
        frameRight + edgeWidth, 
        frameBottom + edgeWidth
      )
    };
    
    // 检测四条边（用于辅助显示）
    const edges = {
      top: detectRegion(
        frameLeft + cornerSize, 
        frameTop - edgeWidth, 
        frameRight - cornerSize, 
        frameTop + edgeWidth
      ),
      bottom: detectRegion(
        frameLeft + cornerSize, 
        frameBottom - edgeWidth, 
        frameRight - cornerSize, 
        frameBottom + edgeWidth
      ),
      left: detectRegion(
        frameLeft - edgeWidth, 
        frameTop + cornerSize, 
        frameLeft + edgeWidth, 
        frameBottom - cornerSize
      ),
      right: detectRegion(
        frameRight - edgeWidth, 
        frameTop + cornerSize, 
        frameRight + edgeWidth, 
        frameBottom - cornerSize
      )
    };
    
    // 更新状态
    const newEdgeStatus = {
      top: edges.top && corners.topLeft && corners.topRight,
      bottom: edges.bottom && corners.bottomLeft && corners.bottomRight,
      left: edges.left && corners.topLeft && corners.bottomLeft,
      right: edges.right && corners.topRight && corners.bottomRight
    };
    
    setEdgeStatus(newEdgeStatus);
    setCornerStatus(corners);
    
    // 只有四个角都检测到才认为护照完整在框内
    const allCornersDetected = 
      corners.topLeft && 
      corners.topRight && 
      corners.bottomLeft && 
      corners.bottomRight;
    
    setEdgesDetected(allCornersDetected);
  }, [isDetecting]);

  // 拍照
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedImage({ url, blob });
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  // 重拍
  const retake = () => {
    setCapturedImage(null);
    setEdgesDetected(false);
    startCamera();
  };

  // 确认使用照片
  const confirmPhoto = () => {
    if (capturedImage && capturedImage.blob) {
      const file = new File([capturedImage.blob], 'passport.jpg', { type: 'image/jpeg' });
      onCapture(file);
      handleClose();
    }
  };

  // 关闭弹窗
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setEdgesDetected(false);
    setEdgeStatus({
      top: false,
      bottom: false,
      left: false,
      right: false
    });
    setCornerStatus({
      topLeft: false,
      topRight: false,
      bottomLeft: false,
      bottomRight: false
    });
    onCancel();
  };

  useEffect(() => {
    if (visible) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isDetecting && !capturedImage) {
      // 降低检测频率以提高性能
      const interval = setInterval(detectEdges, 300);
      return () => clearInterval(interval);
    }
  }, [isDetecting, capturedImage, detectEdges]);

  return (
    <Modal
      title="拍摄护照照片"
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={null}
      className="camera-modal"
    >
      <div className="camera-container">
        {!capturedImage ? (
          <>
            <div className="video-wrapper">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="camera-video"
              />
              <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }}
              />
              
              {/* 识别框 */}
              <div className={`detection-frame ${edgesDetected ? 'detected' : ''}`}>
                <div className={`corner top-left ${cornerStatus.topLeft ? 'active' : ''}`}></div>
                <div className={`corner top-right ${cornerStatus.topRight ? 'active' : ''}`}></div>
                <div className={`corner bottom-left ${cornerStatus.bottomLeft ? 'active' : ''}`}></div>
                <div className={`corner bottom-right ${cornerStatus.bottomRight ? 'active' : ''}`}></div>
                
                {/* 边缘指示器 */}
                <div className={`edge-indicator top ${edgeStatus.top ? 'active' : ''}`}></div>
                <div className={`edge-indicator bottom ${edgeStatus.bottom ? 'active' : ''}`}></div>
                <div className={`edge-indicator left ${edgeStatus.left ? 'active' : ''}`}></div>
                <div className={`edge-indicator right ${edgeStatus.right ? 'active' : ''}`}></div>
              </div>
              
              <div className="camera-hint">
                {edgesDetected ? (
                  <span className="success">✓ 护照四个边角已完整检测，可以拍照</span>
                ) : (
                  <div>
                    <div>请调整护照位置，确保四个边角都在框内</div>
                    <div className="corner-status">
                      {!cornerStatus.topLeft && <span className="missing">• 左上角未检测到</span>}
                      {!cornerStatus.topRight && <span className="missing">• 右上角未检测到</span>}
                      {!cornerStatus.bottomLeft && <span className="missing">• 左下角未检测到</span>}
                      {!cornerStatus.bottomRight && <span className="missing">• 右下角未检测到</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="camera-controls">
              <Button 
                type="primary" 
                size="large" 
                icon={<CameraOutlined />}
                onClick={capturePhoto}
                disabled={!edgesDetected}
              >
                拍照
              </Button>
              <Button 
                size="large" 
                icon={<CloseOutlined />}
                onClick={handleClose}
              >
                取消
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="preview-wrapper">
              <img 
                src={capturedImage.url} 
                alt="Captured passport" 
                className="preview-image"
              />
            </div>
            
            <div className="preview-controls">
              <Space size="middle">
                <Button 
                  size="large" 
                  icon={<ReloadOutlined />}
                  onClick={retake}
                >
                  重拍
                </Button>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<CheckOutlined />}
                  onClick={confirmPhoto}
                >
                  使用此照片
                </Button>
              </Space>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default CameraCapture;