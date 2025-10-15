import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, message, Space, Input, Select, Modal, Empty, Form, Popconfirm, Alert, Row, Col, Upload, Image } from 'antd';
import { EyeOutlined, TeamOutlined, PlusOutlined, CopyOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, DownloadOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import authService from '../utils/auth';
import { getCountryDisplay, getAllCountries } from '../utils/countryCode';
import { validatePassportName, getNameFormatHint } from '../utils/nameValidator';
import './SalesTours.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3060/api';
const { Option } = Select;

function SalesTours() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [touristsModalVisible, setTouristsModalVisible] = useState(false);
  const [selectedTourTourists, setSelectedTourTourists] = useState([]);
  const [selectedTourInfo, setSelectedTourInfo] = useState(null);
  const [touristsLoading, setTouristsLoading] = useState(false);
  const [addTouristModalVisible, setAddTouristModalVisible] = useState(false);
  const [editingTourist, setEditingTourist] = useState(null);
  const [editingRemarks, setEditingRemarks] = useState(null);
  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newPassportPhoto, setNewPassportPhoto] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [remarksForm] = Form.useForm();
  const navigate = useNavigate();
  const userInfo = authService.getUserInfo();

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
      console.error('Fetch tours error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTourists = async (tour) => {
    setSelectedTourInfo(tour);
    setTouristsModalVisible(true);
    setTouristsLoading(true);
    
    try {
      // 获取所有游客，然后在前端筛选
      const response = await axios.get(`${API_BASE}/tourists`, {
        headers: authService.getAuthHeaders()
      });
      
      // 筛选当前销售人员在该产品下的游客
      const myTourists = response.data.data.filter(tourist => 
        tourist.salesName === userInfo?.name && 
        (tourist.tourId === tour.id || tourist.tourId?.id === tour.id)
      );
      
      setSelectedTourTourists(myTourists);
    } catch (error) {
      message.error('获取游客列表失败');
      console.error('Fetch tourists error:', error);
    } finally {
      setTouristsLoading(false);
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
        tourId: selectedTourInfo.id,
        touristName: nameValidation.formatted,
        salesName: userInfo.name,
        salespersonId: userInfo.id,
        ekok: values.ekok || null
      }, {
        headers: authService.getAuthHeaders()
      });
      
      const uploadUrl = response.data.uploadUrl; // 后端已经返回完整URL
      
      Modal.success({
        title: '游客添加成功',
        width: 600,
        content: (
          <div>
            <p>游客 <strong>{nameValidation.formatted}</strong> 已成功添加</p>
            <div style={{ marginTop: 16 }}>
              <Alert
                message="护照上传链接"
                description={uploadUrl}
                type="info"
                showIcon
              />
              <Button 
                type="primary" 
                icon={<CopyOutlined />}
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
                style={{ marginTop: 8 }}
                block
              >
                复制链接
              </Button>
            </div>
          </div>
        ),
        onOk: () => {
          form.resetFields();
          setAddTouristModalVisible(false);
          // 刷新游客列表
          handleViewTourists(selectedTourInfo);
        }
      });
    } catch (error) {
      message.error(error.response?.data?.error || '添加游客失败');
    }
  };

  const handleEditTourist = (tourist) => {
    setEditingTourist(tourist);
    setNewPassportPhoto(null); // 重置上传状态
    editForm.setFieldsValue({
      touristName: tourist.touristName,
      ekok: tourist.ekok,
      contactPhone: tourist.contactPhone,
      contactEmail: tourist.contactEmail,
      birthPlace: tourist.birthPlace,
      roomType: tourist.roomType,
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
      await axios.put(`${API_BASE}/tourists/${editingRemarks.id}`, {
        remarks: values.remarks
      }, {
        headers: authService.getAuthHeaders()
      });
      
      message.success('备注更新成功');
      setRemarksModalVisible(false);
      setEditingRemarks(null);
      remarksForm.resetFields();
      
      // 刷新游客列表
      handleViewTourists(selectedTourInfo);
    } catch (error) {
      message.error(error.response?.data?.error || '备注更新失败');
    }
  };

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
      await axios.put(`${API_BASE}/tourists/${editingTourist.id}`, {
        touristName: nameValidation.formatted,
        passportName: values.passportName,
        passportNumber: values.passportNumber,
        nationality: values.nationality,
        gender: values.gender,
        passportBirthDate: values.passportBirthDate,
        passportExpiryDate: values.passportExpiryDate,
        passportIssueDate: values.passportIssueDate,
        tourId: selectedTourInfo.id
      }, {
        headers: authService.getAuthHeaders()
      });
      
      message.success('游客信息更新成功');
      setEditingTourist(null);
      editForm.resetFields();
      // 刷新游客列表
      handleViewTourists(selectedTourInfo);
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
      // 刷新游客列表
      handleViewTourists(selectedTourInfo);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const copyUploadLink = async (uploadLink) => {
    const fullUrl = `${window.location.origin}/upload/${uploadLink}`;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
        message.success('链接已复制');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
          document.execCommand('copy');
          message.success('链接已复制');
        } catch (err) {
          message.error('复制失败，请手动复制');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      message.error('复制失败');
    }
  };

  // 导出护照照片打包下载
  const handleExportPhotos = async () => {
    try {
      const touristsWithPhotos = selectedTourTourists.filter(tourist => tourist.passportPhoto);
      
      if (touristsWithPhotos.length === 0) {
        message.warning('暂无护照照片可导出');
        return;
      }

      message.loading('正在打包护照照片...', 2);
      
      const response = await axios.post(`${API_BASE}/export/passport-photos`, {
        tourId: selectedTourInfo.id,
        touristIds: touristsWithPhotos.map(t => t.id)
      }, {
        headers: authService.getAuthHeaders(),
        responseType: 'blob'
      });

      // 创建下载链接
      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${selectedTourInfo.productName}_护照照片_${moment().format('YYYYMMDD')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      message.success('护照照片导出成功');
    } catch (error) {
      if (error.response?.status === 404) {
        // 如果后端还没有导出接口，使用前端方式
        handleClientSideExport();
      } else {
        message.error('导出失败：' + (error.response?.data?.error || error.message));
      }
    }
  };

  // 客户端方式导出（备用方案）
  const handleClientSideExport = async () => {
    const touristsWithPhotos = selectedTourTourists.filter(tourist => tourist.passportPhoto);
    
    if (touristsWithPhotos.length === 0) {
      message.warning('暂无护照照片可导出');
      return;
    }

    try {
      message.info(`开始下载 ${touristsWithPhotos.length} 张护照照片`);
      
      for (let i = 0; i < touristsWithPhotos.length; i++) {
        const tourist = touristsWithPhotos[i];
        const photoUrl = `${API_BASE.replace('/api', '')}${tourist.passportPhoto}`;
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = photoUrl;
        link.download = `${tourist.touristName}_护照.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 添加延迟避免浏览器阻止多文件下载
        if (i < touristsWithPhotos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      message.success('护照照片下载完成');
    } catch (error) {
      message.error('下载失败');
    }
  };

  // CSV导出功能
  const handleExportCSV = () => {
    const verifiedTourists = selectedTourTourists.filter(tourist => tourist.uploadStatus === 'verified');
    
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
        tourist.createdAt ? moment(tourist.createdAt).format('YYYY-MM-DD HH:mm') : ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // 创建下载
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedTourInfo.productName}_已验证游客_${moment().format('YYYYMMDD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`已导出 ${verifiedTourists.length} 条已验证游客记录`);
  };

  // 护照照片上传处理
  const handlePassportUpload = async (file) => {
    setUploadingPhoto(true);
    
    const formData = new FormData();
    formData.append('passport', file);
    formData.append('touristId', editingTourist.id);

    try {
      const response = await axios.post(
        `${API_BASE}/tourists/${editingTourist.id}/update-passport`,
        formData,
        {
          headers: {
            ...authService.getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // 更新本地状态
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
            birthPlace: data.birthPlace,
            passportBirthDate: data.birthDate ? moment(data.birthDate).format('YYYY-MM-DD') : '',
            passportExpiryDate: data.expiryDate ? moment(data.expiryDate).format('YYYY-MM-DD') : '',
            passportIssueDate: data.issueDate ? moment(data.issueDate).format('YYYY-MM-DD') : ''
          });
          message.info('护照信息已自动识别并填入表单，请确认后保存');
        }
      }
    } catch (error) {
      message.error('护照照片上传失败：' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingPhoto(false);
    }

    return false; // 阻止默认上传行为
  };

  const columns = [
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '出团日期',
      dataIndex: 'departureDate',
      key: 'departureDate',
      width: 120,
      render: (date) => moment(date).format('YYYY-MM-DD'),
    },
    {
      title: '状态',
      dataIndex: 'departureDate',
      key: 'status',
      width: 100,
      render: (date) => {
        const today = moment();
        const departure = moment(date);
        
        if (departure.isBefore(today)) {
          return <Tag color="default">已出团</Tag>;
        } else if (departure.diff(today, 'days') <= 7) {
          return <Tag color="orange">即将出团</Tag>;
        } else {
          return <Tag color="green">可报名</Tag>;
        }
      },
    },
    {
      title: '我的游客数',
      key: 'touristCount',
      width: 120,
      render: (_, record) => {
        const total = record.touristCount || 0;
        const verified = record.verifiedCount || 0;
        const pending = record.pendingCount || 0;
        
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>总数: {total}</div>
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
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => moment(date).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small"
            type="primary"
            icon={<TeamOutlined />}
            onClick={() => handleViewTourists(record)}
          >
            管理游客
          </Button>
        </Space>
      ),
    },
  ];

  // 筛选旅游产品
  const filteredTours = tours.filter(tour => {
    // 按搜索文本过滤
    const searchFilter = searchText === '' || 
      tour.productName?.toLowerCase().includes(searchText.toLowerCase());
    
    // 按状态过滤
    const today = moment();
    const departure = moment(tour.departureDate);
    let tourStatus = 'available';
    
    if (departure.isBefore(today)) {
      tourStatus = 'departed';
    } else if (departure.diff(today, 'days') <= 7) {
      tourStatus = 'upcoming';
    }
    
    const statusFilterResult = statusFilter === 'all' || 
      (statusFilter === 'available' && tourStatus === 'available') ||
      (statusFilter === 'upcoming' && tourStatus === 'upcoming') ||
      (statusFilter === 'departed' && tourStatus === 'departed');
    
    return searchFilter && statusFilterResult;
  });

  return (
    <div className="sales-tours">
      <Card 
        title={
          <div className="page-header">
            <h3>旅游产品列表</h3>
            <p>选择旅游产品来管理您的游客信息</p>
          </div>
        }
        className="tours-card"
      >
        <div className="info-banner">
          <div className="banner-content">
            <h4>👋 欢迎，{userInfo?.name}！</h4>
            <p>选择一个旅游产品开始添加和管理您的游客。您可以为每个产品创建游客档案并生成护照上传链接。</p>
          </div>
        </div>

        <div className="filter-bar">
          <Input.Search
            placeholder="搜索产品名称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250, marginRight: 16 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Option value="all">所有产品</Option>
            <Option value="available">可报名</Option>
            <Option value="upcoming">即将出团</Option>
            <Option value="departed">已出团</Option>
          </Select>
        </div>

        <Table 
          columns={columns} 
          dataSource={filteredTours}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 个产品`,
          }}
        />
      </Card>

      {/* 游客列表弹窗 - 表格形式 */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 'bold' }}>{selectedTourInfo?.productName}</span>
              <Tag color="blue" style={{ marginLeft: 8 }}>
                共 {selectedTourTourists.length} 人
              </Tag>
              <Tag color="green" style={{ marginLeft: 4 }}>
                {moment(selectedTourInfo?.departureDate).format('YYYY-MM-DD')} 出发
              </Tag>
            </div>
          </div>
        }
        open={touristsModalVisible}
        onCancel={() => {
          setTouristsModalVisible(false);
          setSelectedTourTourists([]);
          setSelectedTourInfo(null);
        }}
        width={1200}
        footer={[
          <Button 
            key="export" 
            icon={<DownloadOutlined />}
            onClick={handleExportPhotos}
            disabled={selectedTourTourists.filter(t => t.passportPhoto).length === 0}
          >
            导出护照 ({selectedTourTourists.filter(t => t.passportPhoto).length})
          </Button>,
          <Button 
            key="csv" 
            icon={<FileTextOutlined />}
            onClick={handleExportCSV}
            disabled={selectedTourTourists.filter(t => t.uploadStatus === 'verified').length === 0}
          >
            CSV导出 ({selectedTourTourists.filter(t => t.uploadStatus === 'verified').length})
          </Button>,
          <Button 
            key="add" 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setAddTouristModalVisible(true)}
          >
            添加游客
          </Button>,
          <Button 
            key="close" 
            onClick={() => setTouristsModalVisible(false)}
          >
            关闭
          </Button>
        ]}
      >
        <Table
          columns={[
            {
              title: '游客姓名',
              dataIndex: 'touristName',
              key: 'touristName',
              width: 120,
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
              width: 80,
              render: (code) => code || '-',
            },
            {
              title: '性别',
              dataIndex: 'gender',
              key: 'gender',
              width: 60,
              render: (gender) => {
                if (gender === 'M') return '男';
                if (gender === 'F') return '女';
                return '-';
              },
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
              title: '操作',
              key: 'action',
              width: 340,
              fixed: 'right',
              render: (_, record) => (
                <Space size="small">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEditTourist(record)}
                  >
                    编辑
                  </Button>
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
                    title="确定删除这个游客吗？"
                    description="删除后将无法恢复"
                    icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                    onConfirm={() => handleDeleteTourist(record.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          dataSource={selectedTourTourists}
          rowKey="id"
          loading={touristsLoading}
          scroll={{ x: 1800 }}
          pagination={false}
          locale={{
            emptyText: (
              <Empty 
                description="暂无游客"
                style={{ padding: '20px 0' }}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddTouristModalVisible(true)}>
                  立即添加游客
                </Button>
              </Empty>
            )
          }}
        />
      </Modal>

      {/* 添加游客弹窗 */}
      <Modal
        title="添加游客"
        open={addTouristModalVisible}
        onCancel={() => {
          setAddTouristModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddTourist}
        >
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

          <Form.Item
            name="ekok"
            label="EKOK"
            tooltip="EKOK编号，支持英文和数字"
            extra="可选填，支持英文字母和数字，可以重复"
          >
            <Input 
              placeholder="请输入EKOK编号" 
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                添加游客
              </Button>
              <Button onClick={() => {
                setAddTouristModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑游客弹窗 */}
      {editingTourist && (
        <Modal
          title="编辑游客信息"
          open={!!editingTourist}
          onCancel={() => {
            setEditingTourist(null);
            editForm.resetFields();
          }}
          footer={null}
          width={900}
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
              <Col span={12}>
                <Form.Item
                  name="birthPlace"
                  label="出生地"
                  rules={[
                    { required: true, message: '请输入出生地' },
                    {
                      pattern: /^[A-Za-z\s-]+$/,
                      message: '出生地只能包含英文字母、空格和横线'
                    }
                  ]}
                  extra="请使用英文格式，例如：BEIJING"
                >
                  <Input 
                    placeholder="出生地（英文）"
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="ekok"
                  label="EKOK"
                >
                  <Input placeholder="EKOK编号" style={{ textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="roomType"
                  label="房型"
                >
                  <Select placeholder="选择房型">
                    <Option value="SINGLE">单人房</Option>
                    <Option value="TWIN">双床房</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contactPhone"
                  label="联系电话"
                >
                  <Input placeholder="联系电话" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="contactEmail"
                  label="联系邮箱"
                  rules={[
                    {
                      type: 'email',
                      message: '邮箱格式不正确',
                    }
                  ]}
                >
                  <Input placeholder="联系邮箱" />
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

export default SalesTours;