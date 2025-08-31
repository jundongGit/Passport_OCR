import React from 'react';
import { Modal, Row, Col, Card, Alert } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import './PassportExample.css';

function PassportExample({ visible, onClose }) {
  return (
    <Modal
      title="护照拍摄示例"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      className="passport-example-modal"
    >
      <Alert
        message="重要提示"
        description="请严格按照正确示例拍摄，确保护照信息页平整、清晰、正面拍摄"
        type="warning"
        showIcon
        style={{ marginBottom: 20 }}
      />
      
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title={
              <div style={{ color: '#52c41a' }}>
                <CheckOutlined /> 正确示例
              </div>
            }
            className="example-card correct"
          >
            <div className="example-image correct-example">
              <div className="passport-mockup">
                <div className="passport-header">PASSPORT</div>
                <div className="passport-photo"></div>
                <div className="passport-info">
                  <div className="info-line">Name: ZHANG SAN</div>
                  <div className="info-line">Passport No: E12345678</div>
                  <div className="info-line">Nationality: CHINA</div>
                  <div className="info-line">Date of Birth: 01 JAN 1990</div>
                  <div className="info-line">Date of Issue: 01 JAN 2020</div>
                  <div className="info-line">Date of Expiry: 01 JAN 2030</div>
                </div>
              </div>
            </div>
            <ul className="example-tips correct-tips">
              <li>护照完全平放</li>
              <li>正面垂直拍摄</li>
              <li>信息页完整清晰</li>
              <li>光线充足均匀</li>
              <li>无反光和阴影</li>
            </ul>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card
            title={
              <div style={{ color: '#ff4d4f' }}>
                <CloseOutlined /> 错误示例
              </div>
            }
            className="example-card incorrect"
          >
            <div className="example-image incorrect-example">
              <div className="passport-mockup tilted">
                <div className="passport-header">PASSPORT</div>
                <div className="passport-photo"></div>
                <div className="passport-info">
                  <div className="info-line">Name: ZHANG SAN</div>
                  <div className="info-line">Passport No: E12345678</div>
                  <div className="info-line">Nationality: CHINA</div>
                </div>
              </div>
            </div>
            <ul className="example-tips incorrect-tips">
              <li>护照倾斜放置</li>
              <li>拍摄角度不正</li>
              <li>信息不完整</li>
              <li>存在阴影</li>
              <li>边缘模糊</li>
            </ul>
          </Card>
        </Col>
      </Row>
      
      <Alert
        message="拍摄要求"
        description={
          <div>
            <p><strong>设备要求：</strong>使用手机或相机，确保镜头清洁</p>
            <p><strong>环境要求：</strong>选择光线充足的环境，避免强光直射</p>
            <p><strong>拍摄技巧：</strong>将护照平放在桌面上，垂直向下拍摄</p>
            <p><strong>质量标准：</strong>确保所有文字清晰可读，照片无变形</p>
          </div>
        }
        type="info"
        style={{ marginTop: 20 }}
      />
    </Modal>
  );
}

export default PassportExample;