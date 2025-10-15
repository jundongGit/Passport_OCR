import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../utils/auth';
import Footer from '../components/Footer';
import './LoginPage.css';

function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 检查是否已经登录
  useEffect(() => {
    if (authService.isAuthenticated()) {
      const userInfo = authService.getUserInfo();
      if (userInfo.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/sales', { replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const { username, password } = values;

      const result = await authService.login(username, password);

      message.success('登录成功！');

      // 根据角色跳转
      const from = location.state?.from?.pathname ||
        (result.user.role === 'admin' ? '/admin' : '/sales');

      navigate(from, { replace: true });
    } catch (error) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="护照管理系统">
        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          size="large"
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少6位' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-button"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <Alert
          message="系统说明"
          description={
            <div>
              <p><strong>管理员：</strong>管理旅游产品和销售人员</p>
              <p><strong>销售人员：</strong>管理自己的游客信息</p>
              <p style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
                初次使用请联系管理员开通账号
              </p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
        <Footer className="card-footer" />
      </Card>
    </div>
  );
}

export default LoginPage;