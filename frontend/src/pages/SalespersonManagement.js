import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Card, Tag, Popconfirm, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import authService from '../utils/auth';
import './SalespersonManagement.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3060/api';

function SalespersonManagement() {
  const [salespersons, setSalespersons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    // 只有在已登录时才获取数据
    if (authService.isAuthenticated()) {
      fetchSalespersons();
    }
  }, []);

  const fetchSalespersons = async () => {
    // 再次检查认证状态
    if (!authService.isAuthenticated()) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/salespersons`, {
        headers: authService.getAuthHeaders()
      });
      setSalespersons(response.data.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // 401/403错误不显示消息，让路由保护处理
        return;
      }
      message.error('获取销售人员列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSalesperson = async (values) => {
    try {
      await axios.post(`${API_BASE}/salespersons`, values, {
        headers: authService.getAuthHeaders()
      });
      message.success('销售人员创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchSalespersons();
    } catch (error) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleUpdateSalesperson = async (values) => {
    try {
      await axios.put(`${API_BASE}/salespersons/${selectedSalesperson.id}`, values, {
        headers: authService.getAuthHeaders()
      });
      message.success('更新成功');
      setModalVisible(false);
      form.resetFields();
      setSelectedSalesperson(null);
      fetchSalespersons();
    } catch (error) {
      message.error(error.response?.data?.error || '更新失败');
    }
  };

  const handleResetPassword = async (values) => {
    try {
      await axios.post(
        `${API_BASE}/salespersons/${selectedSalesperson.id}/reset-password`, 
        { newPassword: values.newPassword },
        { headers: authService.getAuthHeaders() }
      );
      message.success('密码重置成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
      setSelectedSalesperson(null);
    } catch (error) {
      message.error(error.response?.data?.error || '密码重置失败');
    }
  };

  const handleDeleteSalesperson = async (salespersonId) => {
    try {
      await axios.delete(`${API_BASE}/salespersons/${salespersonId}`, {
        headers: authService.getAuthHeaders()
      });
      message.success('删除成功');
      fetchSalespersons();
    } catch (error) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleStatusChange = async (salesperson, checked) => {
    try {
      await axios.put(
        `${API_BASE}/salespersons/${salesperson.id}`, 
        { isActive: checked },
        { headers: authService.getAuthHeaders() }
      );
      message.success(checked ? '启用成功' : '禁用成功');
      fetchSalespersons();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 80,
      render: (role) => {
        const roleMap = {
          admin: { text: '管理员', color: 'red' },
          salesperson: { text: '销售员', color: 'blue' }
        };
        const config = roleMap[role] || { text: role, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleStatusChange(record, checked)}
          disabled={record.role === 'admin'}
        />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 150,
      render: (date) => date ? moment(date).format('YYYY-MM-DD HH:mm') : '未登录',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedSalesperson(record);
              form.setFieldsValue({
                name: record.name,
                email: record.email,
                phone: record.phone,
                department: record.department,
                isActive: record.isActive
              });
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => {
              setSelectedSalesperson(record);
              setPasswordModalVisible(true);
            }}
          >
            重置密码
          </Button>
          {record.role !== 'admin' && (
            <Popconfirm
              title="确定要删除这个销售人员吗？"
              onConfirm={() => handleDeleteSalesperson(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="salesperson-management">
      <Card title="销售人员管理" className="management-card">
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setSelectedSalesperson(null);
            form.resetFields();
            setModalVisible(true);
          }}
          style={{ marginBottom: 16 }}
        >
          新建销售人员
        </Button>
        
        <Table 
          columns={columns} 
          dataSource={salespersons}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑销售人员弹窗 */}
      <Modal
        title={selectedSalesperson ? '编辑销售人员' : '新建销售人员'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedSalesperson(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={selectedSalesperson ? handleUpdateSalesperson : handleCreateSalesperson}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 50, message: '用户名最多50个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
            ]}
          >
            <Input placeholder="请输入用户名（登录使用）" disabled={selectedSalesperson} />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱地址" />
          </Form.Item>

          {!selectedSalesperson && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 6, message: '密码长度至少6位' }
              ]}
            >
              <Input.Password placeholder="请输入初始密码" />
            </Form.Item>
          )}
          
          <Form.Item
            name="phone"
            label="电话"
          >
            <Input placeholder="请输入电话号码" />
          </Form.Item>
          
          <Form.Item
            name="department"
            label="部门"
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>

          {selectedSalesperson && (
            <Form.Item
              name="isActive"
              label="状态"
              valuePropName="checked"
            >
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          )}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedSalesperson ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                setSelectedSalesperson(null);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal
        title="重置密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          setSelectedSalesperson(null);
          passwordForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item>
            <p>重置销售人员密码：<strong>{selectedSalesperson?.name}</strong></p>
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
            label="确认密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认密码' },
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
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                重置密码
              </Button>
              <Button onClick={() => {
                setPasswordModalVisible(false);
                setSelectedSalesperson(null);
                passwordForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SalespersonManagement;