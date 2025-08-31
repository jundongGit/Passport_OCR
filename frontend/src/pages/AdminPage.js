import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Row, Col } from 'antd';
import { TeamOutlined, FileImageOutlined } from '@ant-design/icons';
import './AdminPage.css';

function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-page">
      <h1 className="admin-title">护照识别管理系统</h1>
      <Row gutter={[24, 24]} justify="center">
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            className="admin-card"
            onClick={() => navigate('/admin/tours')}
          >
            <TeamOutlined className="card-icon" />
            <h2>旅游产品管理</h2>
            <p>创建和管理旅游产品，添加游客信息</p>
            <Button type="primary" block>
              进入管理
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            className="admin-card"
          >
            <FileImageOutlined className="card-icon" />
            <h2>护照识别统计</h2>
            <p>查看护照识别统计和分析报告</p>
            <Button type="primary" block disabled>
              即将推出
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AdminPage;