import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Space, message, Card, Tag, Popconfirm, Tooltip, Row, Col, Upload, Image, Select, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, CopyOutlined, ExclamationCircleOutlined, DownloadOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import authService from '../utils/auth';
import { getCountryDisplay, getAllCountries } from '../utils/countryCode';
import { validatePassportName, getNameFormatHint } from '../utils/nameValidator';
import './TourManagement.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3060/api';
const { Option } = Select;

function TourManagement() {
  const [tours, setTours] = useState([]);
  const [tourists, setTourists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [touristModalVisible, setTouristModalVisible] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [editingTourist, setEditingTourist] = useState(null);
  const [editingRemarks, setEditingRemarks] = useState(null);
  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newPassportPhoto, setNewPassportPhoto] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form] = Form.useForm();
  const [touristForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [remarksForm] = Form.useForm();

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/tours`, {
        headers: authService.getAuthHeaders()
      });
      setTours(response.data.data);
    } catch (error) {
      message.error('获取旅游产品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTourists = async (tourId) => {
    try {
      const response = await axios.get(`${API_BASE}/tourists/tour/${tourId}`, {
        headers: authService.getAuthHeaders()
      });
      setTourists(response.data.data);
    } catch (error) {
      message.error('获取游客列表失败');
    }
  };

  const handleCreateTour = async (values) => {
    try {
      await axios.post(`${API_BASE}/tours`, {
        productName: values.productName,
        departureDate: values.departureDate.format('YYYY-MM-DD')
      }, {
        headers: authService.getAuthHeaders()
      });
      message.success('旅游产品创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchTours();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleUpdateTour = async (values) => {
    try {
      await axios.put(`${API_BASE}/tours/${selectedTour._id}`, {
        productName: values.productName,
        departureDate: values.departureDate.format('YYYY-MM-DD')
      }, {
        headers: authService.getAuthHeaders()
      });
      message.success('更新成功');
      setModalVisible(false);
      form.resetFields();
      setSelectedTour(null);
      fetchTours();
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleDeleteTour = async (tourId) => {
    try {
      await axios.delete(`${API_BASE}/tours/${tourId}`, {
        headers: authService.getAuthHeaders()
      });
      message.success('删除成功');
      fetchTours();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleAddTourist = async (values) => {
    // 验证并格式化游客姓名
    const nameValidation = validatePassportName(values.touristName);
    if (!nameValidation.valid) {
      message.error(nameValidation.error);
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE}/tourists`, {
        tourId: selectedTour._id,
        touristName: nameValidation.formatted,
        salesName: values.salesName,
        ekok: values.ekok || null
      }, {
        headers: authService.getAuthHeaders()
      });
      
      const uploadUrl = response.data.uploadUrl;
      message.success('游客添加成功');
      
      Modal.info({
        title: '上传链接已生成',
        content: (
          <div>
            <p>请将以下链接发送给游客：</p>
            <Input.TextArea 
              value={uploadUrl} 
              readOnly 
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
            <Button 
              type="primary" 
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(uploadUrl);
                  message.success('链接已复制到剪贴板');
                } catch (error) {
                  // 降级方案：使用传统方法复制
                  const textArea = document.createElement('textarea');
                  textArea.value = uploadUrl;
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    message.success('链接已复制到剪贴板');
                  } catch (copyError) {
                    message.error('复制失败，请手动复制链接');
                  }
                  document.body.removeChild(textArea);
                }
              }}
              style={{ marginTop: 10 }}
              icon={<CopyOutlined />}
            >
              复制链接
            </Button>
          </div>
        ),
        okText: '确定'
      });
      
      touristForm.resetFields();
      setTouristModalVisible(false);
      fetchTourists(selectedTour._id);
    } catch (error) {
      message.error('添加游客失败');
    }
  };

  const openTouristModal = (tour) => {
    setSelectedTour(tour);
    fetchTourists(tour._id);
    setTouristModalVisible(true);
  };

  const copyUploadLink = async (uploadLink) => {
    const fullUrl = `${window.location.origin}/upload/${uploadLink}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      message.success('上传链接已复制');
    } catch (error) {
      // 降级方案：使用传统方法复制
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        message.success('上传链接已复制');
      } catch (copyError) {
        message.error('复制失败，请手动复制链接');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDeleteTourist = async (touristId) => {
    try {
      await axios.delete(`${API_BASE}/tourists/${touristId}`, {
        headers: authService.getAuthHeaders()
      });
      message.success('游客删除成功');
      // 重新获取游客列表
      fetchTourists(selectedTour._id);
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 导出护照照片打包下载
  const handleExportPhotos = async () => {
    try {
      const touristsWithPhotos = tourists.filter(tourist => tourist.passportPhoto);
      
      if (touristsWithPhotos.length === 0) {
        message.warning('暂无护照照片可导出');
        return;
      }

      message.loading('正在打包护照照片...', 2);
      
      const response = await axios.post(`${API_BASE}/export/passport-photos`, {
        tourId: selectedTour._id,
        touristIds: touristsWithPhotos.map(t => t._id)
      }, {
        headers: authService.getAuthHeaders(),
        responseType: 'blob'
      });

      // 创建下载链接
      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${selectedTour.productName}_护照照片_${moment().format('YYYYMMDD')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      message.success('护照照片导出成功');
    } catch (error) {
      message.error('导出失败：' + (error.response?.data?.error || error.message));
    }
  };

  // CSV导出功能
  const handleExportCSV = () => {
    const verifiedTourists = tourists.filter(tourist => tourist.uploadStatus === 'verified');
    
    if (verifiedTourists.length === 0) {
      message.warning('暂无已验证的游客记录可导出');
      return;
    }

    // CSV表头
    const csvHeaders = [
      '游客姓名',
      '护照姓名', 
      '护照号码',
      '国籍',
      '性别',
      '出生日期',
      '护照有效期',
      '签发日期',
      '销售姓名',
      '添加时间'
    ];

    // 构建CSV内容
    const csvContent = [
      csvHeaders.join(','),
      ...verifiedTourists.map(tourist => [
        tourist.touristName || '',
        tourist.passportName || '',
        tourist.passportNumber || '',
        tourist.nationality || '',
        tourist.gender === 'M' ? '男' : (tourist.gender === 'F' ? '女' : ''),
        tourist.passportBirthDate ? moment(tourist.passportBirthDate).format('YYYY-MM-DD') : '',
        tourist.passportExpiryDate ? moment(tourist.passportExpiryDate).format('YYYY-MM-DD') : '',
        tourist.passportIssueDate ? moment(tourist.passportIssueDate).format('YYYY-MM-DD') : '',
        tourist.salesName || '',
        tourist.createdAt ? moment(tourist.createdAt).format('YYYY-MM-DD HH:mm') : ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // 创建下载
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedTour.productName}_已验证游客_${moment().format('YYYYMMDD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`已导出 ${verifiedTourists.length} 条已验证游客记录`);
  };

  // 编辑游客
  const handleEditTourist = (tourist) => {
    setEditingTourist(tourist);
    setNewPassportPhoto(null);
    setUploadProgress(0);
    editForm.setFieldsValue({
      touristName: tourist.touristName,
      passportName: tourist.passportName,
      passportNumber: tourist.passportNumber,
      nationality: tourist.nationality,
      gender: tourist.gender || 'M',
      passportBirthDate: tourist.passportBirthDate ? moment(tourist.passportBirthDate).format('YYYY-MM-DD') : '',
      passportExpiryDate: tourist.passportExpiryDate ? moment(tourist.passportExpiryDate).format('YYYY-MM-DD') : '',
      passportIssueDate: tourist.passportIssueDate ? moment(tourist.passportIssueDate).format('YYYY-MM-DD') : ''
    });
  };

  const handleEditRemarks = (tourist) => {
    setEditingRemarks(tourist);
    setRemarksModalVisible(true);
    remarksForm.setFieldsValue({
      remarks: tourist.remarks || ''
    });
  };

  const handleUpdateRemarks = async (values) => {
    try {
      await axios.put(`${API_BASE}/tourists/${editingRemarks._id}`, {
        remarks: values.remarks
      }, {
        headers: authService.getAuthHeaders()
      });
      
      message.success('备注更新成功');
      setRemarksModalVisible(false);
      setEditingRemarks(null);
      remarksForm.resetFields();
      
      // 刷新游客列表
      fetchTourists(selectedTour._id);
    } catch (error) {
      message.error(error.response?.data?.error || '备注更新失败');
    }
  };

  // 更新游客信息
  const handleUpdateTourist = async (values) => {
    const nameValidation = validatePassportName(values.touristName);
    if (!nameValidation.valid) {
      message.error(nameValidation.error);
      return;
    }

    // 护照姓名验证（如果有填写）
    if (values.passportName) {
      const passportNameValidation = validatePassportName(values.passportName);
      if (!passportNameValidation.valid) {
        message.error('护照姓名格式错误：' + passportNameValidation.error);
        return;
      }
      values.passportName = passportNameValidation.formatted;
    }

    try {
      await axios.put(`${API_BASE}/tourists/${editingTourist._id}`, {
        touristName: nameValidation.formatted,
        passportName: values.passportName,
        passportNumber: values.passportNumber,
        nationality: values.nationality,
        gender: values.gender,
        passportBirthDate: values.passportBirthDate,
        passportExpiryDate: values.passportExpiryDate,
        passportIssueDate: values.passportIssueDate,
        tourId: selectedTour._id
      }, {
        headers: authService.getAuthHeaders()
      });
      
      message.success('游客信息更新成功');
      setEditingTourist(null);
      editForm.resetFields();
      fetchTourists(selectedTour._id);
    } catch (error) {
      message.error(error.response?.data?.error || '更新失败');
    }
  };

  // 护照照片上传处理
  const handlePassportUpload = async (file) => {
    setUploadingPhoto(true);
    setUploadProgress(0);
    
    // 模拟进度条
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    
    const formData = new FormData();
    formData.append('passport', file);
    formData.append('touristId', editingTourist._id);

    try {
      const response = await axios.post(
        `${API_BASE}/tourists/${editingTourist._id}/update-passport`,
        formData,
        {
          headers: {
            ...authService.getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // 完成进度条
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setNewPassportPhoto(response.data.passportPhoto);
        message.success('护照照片上传成功');
        
        // 如果有识别结果，更新表单
        if (response.data.recognizedData) {
          const data = response.data.recognizedData;
          editForm.setFieldsValue({
            passportName: data.fullName || data.recognizedName,
            passportNumber: data.passportNumber,
            nationality: data.nationality,
            gender: data.gender,
            passportBirthDate: data.birthDate ? moment(data.birthDate).format('YYYY-MM-DD') : '',
            passportExpiryDate: data.expiryDate ? moment(data.expiryDate).format('YYYY-MM-DD') : '',
            passportIssueDate: data.issueDate ? moment(data.issueDate).format('YYYY-MM-DD') : ''
          });
          message.info('护照信息已自动识别并填入表单，请确认后保存');
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      message.error('护照照片上传失败：' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingPhoto(false);
    }

    return false; // 阻止默认上传行为
  };

  const tourColumns = [
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: '出团日期',
      dataIndex: 'departureDate',
      key: 'departureDate',
      render: (date) => moment(date).format('YYYY-MM-DD'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '游客统计',
      key: 'touristStats',
      width: 180,
      render: (_, record) => {
        const total = record.totalTourists || 0;
        const verified = record.verifiedTourists || 0;
        const pending = record.pendingTourists || 0;
        const percentage = total > 0 ? Math.round((verified / total) * 100) : 0;
        
        return (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
              总数: {total} | 完成率: {percentage}%
            </div>
            {total > 0 && (
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                <span style={{ color: '#52c41a' }}>已验证: {verified}</span>
                {pending > 0 && (
                  <>
                    {' • '}
                    <span style={{ color: '#faad14' }}>待处理: {pending}</span>
                  </>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<TeamOutlined />}
            onClick={() => openTouristModal(record)}
          >
            管理游客
          </Button>
          <Button 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedTour(record);
              form.setFieldsValue({
                productName: record.productName,
                departureDate: moment(record.departureDate)
              });
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个旅游产品吗？"
            onConfirm={() => handleDeleteTour(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const touristColumns = [
    {
      title: '游客姓名',
      dataIndex: 'touristName',
      key: 'touristName',
      width: 150,
    },
    {
      title: 'EKOK',
      dataIndex: 'ekok',
      key: 'ekok',
      width: 100,
      render: (text) => text || '-',
    },
    {
      title: '游客类型',
      dataIndex: 'touristType',
      key: 'touristType',
      width: 80,
      render: (type) => {
        if (type === 'ADT') {
          return <Tag color="blue">ADT</Tag>;
        } else if (type === 'CHD') {
          return <Tag color="green">CHD</Tag>;
        }
        return '-';
      },
    },
    {
      title: '销售姓名',
      dataIndex: 'salesName',
      key: 'salesName',
      width: 120,
    },
    {
      title: '护照号码',
      dataIndex: 'passportNumber',
      key: 'passportNumber',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '护照姓名',
      dataIndex: 'passportName',
      key: 'passportName',
      width: 180,
      render: (text) => text || '-',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (gender) => {
        if (!gender) return '-';
        return gender === 'M' ? '男' : '女';
      },
    },
    {
      title: '国籍',
      dataIndex: 'nationality',
      key: 'nationality',
      width: 80,
      render: (code) => code || '-',
    },
    {
      title: '出生地',
      dataIndex: 'birthPlace',
      key: 'birthPlace',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '联系邮箱',
      dataIndex: 'contactEmail',
      key: 'contactEmail',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '房型',
      dataIndex: 'roomType',
      key: 'roomType',
      width: 80,
      render: (type) => {
        if (type === 'SINGLE') return <Tag color="orange">单人房</Tag>;
        if (type === 'TWIN') return <Tag color="purple">双床房</Tag>;
        return '-';
      },
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '出生日期',
      dataIndex: 'passportBirthDate',
      key: 'passportBirthDate',
      width: 100,
      render: (date) => {
        if (!date) return '-';
        return moment(date).format('DD/MM/YYYY');
      },
    },
    {
      title: '签发日期',
      dataIndex: 'passportIssueDate',
      key: 'passportIssueDate',
      width: 100,
      render: (date) => {
        if (!date) return '-';
        return moment(date).format('DD/MM/YYYY');
      },
    },
    {
      title: '有效期',
      dataIndex: 'passportExpiryDate',
      key: 'passportExpiryDate',
      width: 100,
      render: (date) => {
        if (!date) return '-';
        return moment(date).format('DD/MM/YYYY');
      },
    },
    {
      title: '状态',
      dataIndex: 'uploadStatus',
      key: 'uploadStatus',
      width: 80,
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
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.uploadStatus !== 'pending' && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditTourist(record)}
            >
              编辑
            </Button>
          )}
          <Button
            size="small"
            onClick={() => handleEditRemarks(record)}
          >
            备注
          </Button>
          {record.uploadStatus !== 'verified' && (
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyUploadLink(record.uploadLink)}
            >
              复制链接
            </Button>
          )}
          {record.passportPhoto && (
            <Button 
              size="small"
              type="link"
              onClick={() => window.open(`${API_BASE.replace('/api', '')}${record.passportPhoto}`, '_blank')}
            >
              查看护照
            </Button>
          )}
          <Popconfirm
            title="确定要删除这个游客吗？"
            description="删除后将无法恢复"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleDeleteTourist(record._id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button 
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="tour-management">
      <Card title="旅游产品管理" className="management-card">
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setSelectedTour(null);
            form.resetFields();
            setModalVisible(true);
          }}
          style={{ marginBottom: 16 }}
        >
          新建旅游产品
        </Button>
        
        <Table 
          columns={tourColumns} 
          dataSource={tours}
          rowKey="_id"
          loading={loading}
        />
      </Card>

      <Modal
        title={selectedTour ? '编辑旅游产品' : '新建旅游产品'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedTour(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={selectedTour ? handleUpdateTour : handleCreateTour}
        >
          <Form.Item
            name="productName"
            label="产品名称"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          
          <Form.Item
            name="departureDate"
            label="出团日期"
            rules={[{ required: true, message: '请选择出团日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedTour ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                setSelectedTour(null);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 'bold' }}>{selectedTour?.productName}</span>
              <Tag color="blue" style={{ marginLeft: 8 }}>
                共 {tourists.length} 人
              </Tag>
              {selectedTour?.departureDate && (
                <Tag color="green" style={{ marginLeft: 4 }}>
                  {moment(selectedTour.departureDate).format('YYYY-MM-DD')} 出发
                </Tag>
              )}
            </div>
          </div>
        }
        open={touristModalVisible}
        onCancel={() => {
          setTouristModalVisible(false);
          setSelectedTour(null);
          setTourists([]);
        }}
        width={1600}
        footer={[
          <Button 
            key="export" 
            icon={<DownloadOutlined />}
            onClick={handleExportPhotos}
            disabled={tourists.filter(t => t.passportPhoto).length === 0}
          >
            导出护照 ({tourists.filter(t => t.passportPhoto).length})
          </Button>,
          <Button 
            key="csv" 
            icon={<FileTextOutlined />}
            onClick={handleExportCSV}
            disabled={tourists.filter(t => t.uploadStatus === 'verified').length === 0}
          >
            CSV导出 ({tourists.filter(t => t.uploadStatus === 'verified').length})
          </Button>,
          <Button 
            key="close" 
            onClick={() => setTouristModalVisible(false)}
          >
            关闭
          </Button>
        ]}
      >
        <Table 
          columns={touristColumns} 
          dataSource={tourists}
          rowKey="_id"
          scroll={{ x: 2000 }}
          pagination={false}
        />
      </Modal>

      {/* 编辑游客弹窗 */}
      {editingTourist && (
        <Modal
          title="编辑游客信息"
          open={!!editingTourist}
          onCancel={() => {
            setEditingTourist(null);
            setUploadProgress(0);
            editForm.resetFields();
          }}
          footer={null}
          width={700}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdateTourist}
          >
            <Row gutter={16}>
              <Col span={12}>
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
              </Col>
              <Col span={12}>
                <Form.Item
                  name="passportName"
                  label="护照姓名"
                  rules={[
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
                >
                  <Input 
                    placeholder="护照上的姓名" 
                    style={{ textTransform: 'uppercase' }}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      editForm.setFieldsValue({ passportName: value });
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="passportNumber"
                  label="护照号码"
                >
                  <Input placeholder="护照号码" style={{ textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="nationality"
                  label="国籍"
                >
                  <Select
                    placeholder="选择国籍"
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {getAllCountries().map(country => (
                      <Option key={country.value} value={country.value} label={country.label}>
                        {country.value} - {country.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="gender"
                  label="性别"
                >
                  <Select placeholder="选择性别">
                    <Option value="M">男</Option>
                    <Option value="F">女</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="passportBirthDate"
                  label="出生日期"
                >
                  <Input placeholder="YYYY-MM-DD" type="date" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="passportIssueDate"
                  label="签发日期"
                >
                  <Input placeholder="YYYY-MM-DD" type="date" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="passportExpiryDate"
                  label="护照有效期"
                >
                  <Input placeholder="YYYY-MM-DD" type="date" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="护照照片">
              <div>
                {editingTourist?.passportPhoto && (
                  <div style={{ marginBottom: 12 }}>
                    <Image
                      src={`${API_BASE.replace('/api', '')}${editingTourist.passportPhoto}`}
                      alt="当前护照照片"
                      width={200}
                      height={120}
                      style={{ objectFit: 'cover', border: '1px solid #d9d9d9', borderRadius: 4 }}
                    />
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>当前护照照片</div>
                  </div>
                )}
                {newPassportPhoto && (
                  <div style={{ marginBottom: 12 }}>
                    <Image
                      src={`${API_BASE.replace('/api', '')}${newPassportPhoto}`}
                      alt="新护照照片"
                      width={200}
                      height={120}
                      style={{ objectFit: 'cover', border: '2px solid #52c41a', borderRadius: 4 }}
                    />
                    <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>新上传的护照照片</div>
                  </div>
                )}
                <Upload
                  name="passport"
                  showUploadList={false}
                  beforeUpload={handlePassportUpload}
                  accept="image/*"
                  disabled={uploadingPhoto}
                >
                  <Button 
                    icon={<UploadOutlined />}
                    loading={uploadingPhoto}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? '上传中...' : '上传新护照照片'}
                  </Button>
                </Upload>
                {uploadingPhoto && (
                  <div style={{ margin: '12px 0' }}>
                    <Progress 
                      percent={Math.round(uploadProgress)} 
                      status="active"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#52c41a',
                      }}
                      size="small"
                    />
                    <div style={{ fontSize: 11, color: '#1890ff', marginTop: 4, textAlign: 'center' }}>
                      AI智能识别中，请稍候...
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  上传新的护照照片将自动识别并更新表单信息
                </div>
              </div>
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<EditOutlined />}>
                  更新信息
                </Button>
                <Button onClick={() => {
                  setEditingTourist(null);
                  setUploadProgress(0);
                  editForm.resetFields();
                }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}

      {/* 备注编辑弹窗 */}
      <Modal
        title="编辑备注"
        open={remarksModalVisible}
        onCancel={() => {
          setRemarksModalVisible(false);
          setEditingRemarks(null);
          remarksForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={remarksForm}
          layout="vertical"
          onFinish={handleUpdateRemarks}
        >
          <Form.Item
            name="remarks"
            label="备注信息"
          >
            <Input.TextArea 
              rows={4}
              placeholder="请输入备注信息"
              maxLength={500}
              showCount
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<EditOutlined />}>
                保存备注
              </Button>
              <Button onClick={() => {
                setRemarksModalVisible(false);
                setEditingRemarks(null);
                remarksForm.resetFields();
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

export default TourManagement;