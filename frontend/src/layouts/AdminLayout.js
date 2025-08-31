import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button, message, Modal, Form, Input } from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  LogoutOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import authService from '../utils/auth';
import Footer from '../components/Footer';
import axios from 'axios';
import './AdminLayout.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3060/api';

const { Header, Sider, Content } = Layout;

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = authService.getUserInfo();
  const [form] = Form.useForm();

  const handleLogout = async () => {
    try {
      await authService.logout();
      message.success('退出成功');
      navigate('/login');
    } catch (error) {
      message.error('退出失败');
    }
  };

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/change-password`, {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      }, {
        headers: authService.getAuthHeaders()
      });
      
      message.success('密码修改成功');
      form.resetFields();
      setChangePasswordVisible(false);
    } catch (error) {
      message.error(error.response?.data?.error || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: '/admin/tours',
      icon: <GlobalOutlined />,
      label: '旅游产品管理',
    },
    {
      key: '/admin/salespersons',
      icon: <TeamOutlined />,
      label: '销售人员管理',
    },
    {
      key: '/admin/ocr-logs',
      icon: <FileTextOutlined />,
      label: 'OCR识别日志',
    },
  ];

  const userMenuItems = [
    {
      key: 'change-password',
      icon: <UserOutlined />,
      label: '修改密码',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'change-password') {
      setChangePasswordVisible(true);
    } else if (key !== 'logout') {
      navigate(key);
    }
  };

  return (
    <Layout className="admin-layout">
      <Sider trigger={null} collapsible collapsed={collapsed} className="admin-sider">
        <div className="admin-logo">
          <h2>{collapsed ? 'PM' : '护照管理'}</h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64, color: 'white' }}
            />
            <span className="page-title">管理员后台</span>
          </div>
          <div className="header-right">
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleMenuClick }}
              placement="bottomRight"
            >
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                <span className="user-name">{userInfo?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content">
          <Outlet />
          <Footer className="layout-footer" />
        </Content>
      </Layout>
      
      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={changePasswordVisible}
        onCancel={() => {
          setChangePasswordVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[
              { required: true, message: '请输入原密码' }
            ]}
          >
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>
          
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          
          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  setChangePasswordVisible(false);
                  form.resetFields();
                }}
              >
                取消
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
              >
                确定修改
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default AdminLayout;