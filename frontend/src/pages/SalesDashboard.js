import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, message } from 'antd';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  TeamOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import authService from '../utils/auth';
import { getCountryDisplay } from '../utils/countryCode';
import './SalesDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3060/api';

function SalesDashboard() {
  const [stats, setStats] = useState({});
  const [recentTourists, setRecentTourists] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userInfo = authService.getUserInfo();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 获取销售人员的游客统计
      const [touristsResponse] = await Promise.all([
        axios.get(`${API_BASE}/tourists`, {
          headers: authService.getAuthHeaders()
        })
      ]);

      const allTourists = touristsResponse.data.data || [];
      // 筛选出当前销售人员的游客
      const myTourists = allTourists.filter(tourist => 
        tourist.salesName === userInfo?.name
      );

      // 计算统计数据
      const totalTourists = myTourists.length;
      const verifiedTourists = myTourists.filter(t => t.uploadStatus === 'verified').length;
      const pendingTourists = myTourists.filter(t => t.uploadStatus === 'pending').length;

      setStats({
        totalTourists,
        verifiedTourists,
        pendingTourists,
        completionRate: totalTourists > 0 ? ((verifiedTourists / totalTourists) * 100).toFixed(1) : 0
      });

      // 获取最近的游客（最多10个）
      setRecentTourists(
        myTourists
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
      );

    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTourists = () => {
    navigate('/sales/tourists');
  };

  const handleViewTours = () => {
    navigate('/sales/tours');
  };

  const touristColumns = [
    {
      title: '游客姓名',
      dataIndex: 'touristName',
      key: 'touristName',
      width: 120,
    },
    {
      title: '护照姓名',
      dataIndex: 'passportName',
      key: 'passportName',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '国籍',
      dataIndex: 'nationality',
      key: 'nationality',
      width: 100,
      render: (code) => code ? getCountryDisplay(code) : '-',
    },
    {
      title: '状态',
      dataIndex: 'uploadStatus',
      key: 'uploadStatus',
      width: 100,
      render: (status) => {
        const statusMap = {
          'pending': { text: '待上传', color: 'default' },
          'uploaded': { text: '已上传', color: 'processing' },
          'verified': { text: '已验证', color: 'success' },
          'rejected': { text: '已拒绝', color: 'error' }
        };
        const config = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => moment(date).format('MM-DD HH:mm'),
    },
  ];

  return (
    <div className="sales-dashboard">
      <div className="welcome-section">
        <h2>欢迎回来，{userInfo?.name}！</h2>
        <p>这是您的工作台，可以查看游客管理情况和工作统计</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总游客数"
              value={stats.totalTourists}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已验证"
              value={stats.verifiedTourists}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="待处理"
              value={stats.pendingTourists}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="完成率"
              value={stats.completionRate}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card 
            title="快速操作" 
            extra={<TeamOutlined />}
            className="quick-actions-card"
          >
            <div className="quick-actions">
              <Button 
                type="primary" 
                size="large" 
                onClick={handleViewTours}
                style={{ marginRight: 16, marginBottom: 8 }}
              >
                查看旅游产品
              </Button>
              <Button 
                size="large" 
                onClick={handleViewTourists}
                style={{ marginBottom: 8 }}
              >
                管理我的游客
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title="工作提醒" className="reminder-card">
            <div className="reminders">
              {stats.pendingTourists > 0 ? (
                <p>📝 您有 {stats.pendingTourists} 个游客待上传护照信息</p>
              ) : (
                <p>✅ 所有游客都已完成护照上传</p>
              )}
              <p>📊 当前完成率：{stats.completionRate}%</p>
              <p>👥 总计管理 {stats.totalTourists} 个游客</p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 最近游客 */}
      <Card 
        title="最近添加的游客" 
        extra={
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={handleViewTourists}
          >
            查看全部
          </Button>
        }
      >
        <Table
          columns={touristColumns}
          dataSource={recentTourists}
          rowKey="_id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}

export default SalesDashboard;