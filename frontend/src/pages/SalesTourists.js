import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Card, Tag, Popconfirm, Select, Alert, DatePicker } from 'antd';
import { PlusOutlined, CopyOutlined, ExclamationCircleOutlined, ArrowLeftOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import authService from '../utils/auth';
import { getCountryDisplay } from '../utils/countryCode';
import { validatePassportName, getNameFormatHint } from '../utils/nameValidator';
import './SalesTourists.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3060/api';
const { Option } = Select;

function SalesTourists() {
  const [tourists, setTourists] = useState([]);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [editingTourist, setEditingTourist] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = authService.getUserInfo();

  useEffect(() => {
    fetchTours();
    fetchMyTourists();
    
    // 如果从旅游产品页面跳转过来，设置选中的产品
    if (location.state?.selectedTour) {
      setSelectedTour(location.state.selectedTour);
    }
  }, [location.state]);

  const fetchTours = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tours`, {
        headers: authService.getAuthHeaders()
      });
      setTours(response.data.data);
    } catch (error) {
      message.error('获取旅游产品失败');
    }
  };

  const fetchMyTourists = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/tourists`, {
        headers: authService.getAuthHeaders()
      });
      // 筛选出当前销售人员的游客
      const myTourists = response.data.data.filter(tourist => 
        tourist.salesName === userInfo?.name
      );
      setTourists(myTourists);
    } catch (error) {
      message.error('获取游客列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTourist = async (values) => {
    // 验证姓名格式
    const nameValidation = validatePassportName(values.touristName);
    if (!nameValidation.valid) {
      message.error(nameValidation.error);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/tourists`, {
        tourId: values.tourId,
        touristName: nameValidation.formatted,
        salesName: userInfo.name,
        salespersonId: userInfo._id
      }, {
        headers: authService.getAuthHeaders()
      });
      
      const uploadUrl = response.data.uploadUrl;
      message.success('游客添加成功');
      
      Modal.info({
        title: '上传链接已生成',
        width: 600,
        content: (
          <div>
            <p>请将以下链接发送给游客 <strong>{nameValidation.formatted}</strong>：</p>
            <Input.TextArea 
              value={uploadUrl} 
              readOnly 
              autoSize={{ minRows: 3, maxRows: 5 }}
              style={{ marginBottom: 12 }}
            />
            <Button 
              type="primary" 
              onClick={async () => {
                try {
                  if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(uploadUrl);
                    message.success('链接已复制到剪贴板');
                  } else {
                    // 使用降级方案
                    const textArea = document.createElement('textarea');
                    textArea.value = uploadUrl;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (successful) {
                      message.success('链接已复制到剪贴板');
                    } else {
                      message.error('复制失败，请手动复制上方文本框中的链接');
                    }
                  }
                } catch (err) {
                  console.error('Copy failed:', err);
                  message.error('复制失败，请手动复制上方文本框中的链接');
                }
              }}
              icon={<CopyOutlined />}
              block
            >
              复制链接
            </Button>
            <Alert
              message="使用说明"
              description="游客点击链接后可以上传护照照片，系统会自动识别护照信息并要求游客确认。"
              type="info"
              showIcon
              style={{ marginTop: 12 }}
            />
          </div>
        ),
        okText: '确定'
      });
      
      form.resetFields();
      setModalVisible(false);
      setSelectedTour(null);
      fetchMyTourists();
    } catch (error) {
      message.error(error.response?.data?.error || '添加游客失败');
    }
  };

  const handleEditTourist = (tourist) => {
    setEditingTourist(tourist);
    // tourId 可能是对象或字符串，需要正确处理
    const tourIdValue = typeof tourist.tourId === 'object' ? tourist.tourId._id : tourist.tourId;
    editForm.setFieldsValue({
      touristName: tourist.touristName,
      tourId: tourIdValue
    });
    setEditModalVisible(true);
  };

  const handleUpdateTourist = async (values) => {
    // 验证姓名格式
    const nameValidation = validatePassportName(values.touristName);
    if (!nameValidation.valid) {
      message.error(nameValidation.error);
      return;
    }

    try {
      await axios.put(`${API_BASE}/tourists/${editingTourist._id}`, {
        touristName: nameValidation.formatted,
        tourId: values.tourId
      }, {
        headers: authService.getAuthHeaders()
      });
      
      message.success('游客信息更新成功');
      editForm.resetFields();
      setEditModalVisible(false);
      setEditingTourist(null);
      fetchMyTourists();
    } catch (error) {
      message.error(error.response?.data?.error || '更新失败');
    }
  };

  const handleDeleteTourist = async (touristId) => {
    try {
      await axios.delete(`${API_BASE}/tourists/${touristId}`, {
        headers: authService.getAuthHeaders()
      });
      message.success('游客删除成功');
      fetchMyTourists();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const copyUploadLink = async (uploadLink) => {
    const fullUrl = `${window.location.origin}/upload/${uploadLink}`;
    
    try {
      // 优先尝试使用 clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
        message.success('上传链接已复制');
      } else {
        // 降级方案：创建临时文本框
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            message.success('上传链接已复制');
          } else {
            message.error('复制失败，请手动复制');
          }
        } catch (err) {
          console.error('Fallback copy failed:', err);
          message.error('复制失败，请手动复制');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('Copy failed:', err);
      // 显示链接让用户手动复制
      Modal.info({
        title: '上传链接',
        content: (
          <div>
            <p>请手动复制以下链接：</p>
            <Input.TextArea 
              value={fullUrl} 
              readOnly 
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </div>
        ),
        okText: '确定'
      });
    }
  };

  const columns = [
    {
      title: '游客姓名',
      dataIndex: 'touristName',
      key: 'touristName',
      width: 120,
    },
    {
      title: '旅游产品',
      dataIndex: 'tourName',
      key: 'tourName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '护照姓名',
      dataIndex: 'passportName',
      key: 'passportName',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '护照号码',
      dataIndex: 'passportNumber',
      key: 'passportNumber',
      width: 120,
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
      title: '出生日期',
      dataIndex: 'passportBirthDate',
      key: 'passportBirthDate',
      width: 100,
      render: (date) => {
        if (!date) return '-';
        return moment(date).format('YYYY-MM-DD');
      },
    },
    {
      title: '护照有效期',
      dataIndex: 'passportExpiryDate',
      key: 'passportExpiryDate',
      width: 100,
      render: (date) => {
        if (!date) return '-';
        return moment(date).format('YYYY-MM-DD');
      },
    },
    {
      title: '房型',
      dataIndex: 'roomType',
      key: 'roomType',
      width: 120,
      render: (roomType) => roomType || '-',
    },
    {
      title: '上传状态',
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
      title: '添加时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (date) => moment(date).format('MM-DD'),
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
            icon={<CopyOutlined />}
            onClick={() => copyUploadLink(record.uploadLink)}
            title="复制上传链接"
          >
            复制链接
          </Button>
          {record.passportPhoto && (
            <Button 
              size="small"
              type="link"
              onClick={() => window.open(`http://localhost:3060${record.passportPhoto}`, '_blank')}
            >
              查看护照
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 根据条件过滤游客
  const filteredTourists = tourists.filter(tourist => {
    // 按选中的产品过滤
    const tourFilter = selectedTour ? tourist.tourName === selectedTour.productName : true;
    
    // 按搜索文本过滤
    const searchFilter = searchText === '' || 
      tourist.touristName?.toLowerCase().includes(searchText.toLowerCase()) ||
      tourist.passportName?.toLowerCase().includes(searchText.toLowerCase()) ||
      tourist.passportNumber?.toLowerCase().includes(searchText.toLowerCase());
    
    // 按状态过滤
    const statusFilterResult = statusFilter === 'all' || tourist.uploadStatus === statusFilter;
    
    return tourFilter && searchFilter && statusFilterResult;
  });

  return (
    <div className="sales-tourists">
      <Card 
        title={
          <div className="page-header">
            <div className="header-left">
              <h3>我的游客历史</h3>
              <p>查看您添加的所有游客历史记录</p>
            </div>
            <div className="header-right">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/sales/tours')}
              >
                返回产品列表
              </Button>
            </div>
          </div>
        }
        className="tourists-card"
      >

        <div className="action-bar">
          <div className="action-left">
            <span style={{ fontSize: 14, color: '#8c8c8c' }}>
              💡 提示：在旅游产品列表中管理各产品的游客
            </span>
          </div>
          
          <div className="filter-controls">
            <Input.Search
              placeholder="搜索游客姓名/护照号"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200, marginRight: 8 }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120, marginRight: 8 }}
            >
              <Option value="all">所有状态</Option>
              <Option value="pending">待上传</Option>
              <Option value="uploaded">已上传</Option>
              <Option value="verified">已验证</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
          </div>
          
          <div className="stats-info">
            <span>总计：{filteredTourists.length} 人</span>
            <span>已验证：{filteredTourists.filter(t => t.uploadStatus === 'verified').length} 人</span>
            <span>待上传：{filteredTourists.filter(t => t.uploadStatus === 'pending').length} 人</span>
          </div>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={filteredTourists}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 个游客`,
          }}
        />
      </Card>

      {/* 添加游客弹窗 */}
      <Modal
        title="添加游客"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddTourist}
        >
          <Form.Item
            name="tourId"
            label="选择旅游产品"
            rules={[{ required: true, message: '请选择旅游产品' }]}
          >
            <Select placeholder="请选择旅游产品" showSearch>
              {tours.map(tour => (
                <Option key={tour._id} value={tour._id}>
                  {tour.productName} - {moment(tour.departureDate).format('YYYY-MM-DD')}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="touristName"
            label="游客姓名"
            rules={[
              { required: true, message: '请输入游客姓名' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const validation = validatePassportName(value);
                  if (validation.valid) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(validation.error));
                }
              }
            ]}
            tooltip={getNameFormatHint()}
            extra="格式：姓/名（纯英文），例如：ZHANG/SAN"
          >
            <Input 
              placeholder="姓/名 (例: ZHANG/SAN)" 
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                form.setFieldsValue({ touristName: value });
              }}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<UserOutlined />}>
                添加游客
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑游客弹窗 */}
      <Modal
        title="编辑游客信息"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTourist(null);
          editForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateTourist}
        >
          <Form.Item
            name="tourId"
            label="旅游产品"
            rules={[{ required: true, message: '请选择旅游产品' }]}
          >
            <Select placeholder="请选择旅游产品" showSearch>
              {tours.map(tour => (
                <Option key={tour._id} value={tour._id}>
                  {tour.productName} - {moment(tour.departureDate).format('YYYY-MM-DD')}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="touristName"
            label="游客姓名"
            rules={[
              { required: true, message: '请输入游客姓名' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const validation = validatePassportName(value);
                  if (validation.valid) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(validation.error));
                }
              }
            ]}
            tooltip={getNameFormatHint()}
            extra="格式：姓/名（纯英文），例如：ZHANG/SAN"
          >
            <Input 
              placeholder="姓/名 (例: ZHANG/SAN)" 
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                editForm.setFieldsValue({ touristName: value });
              }}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<EditOutlined />}>
                更新信息
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                setEditingTourist(null);
                editForm.resetFields();
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

export default SalesTourists;