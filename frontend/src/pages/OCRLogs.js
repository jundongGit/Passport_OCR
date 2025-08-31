import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, Space, DatePicker, Select, Input, Modal, Statistic, Row, Col, Alert, Popconfirm, message } from 'antd';
import { 
  EyeOutlined, 
  DeleteOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import authService from '../utils/auth';
import './OCRLogs.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3060/api';
const { RangePicker } = DatePicker;
const { Option } = Select;

function OCRLogs() {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: 'all',
    operationType: 'all',
    dateRange: null,
    uploadLink: ''
  });
  
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  useEffect(() => {
    fetchLogs();
    fetchStatistics();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        operationType: filters.operationType,
        uploadLink: filters.uploadLink
      };
      
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.dateFrom = filters.dateRange[0].format('YYYY-MM-DD');
        params.dateTo = filters.dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await axios.get(`${API_BASE}/ocr-logs`, {
        params,
        headers: authService.getAuthHeaders()
      });
      
      setLogs(response.data.data.logs);
      setPagination({
        current: response.data.data.pagination.current,
        pageSize: response.data.data.pagination.pageSize,
        total: response.data.data.pagination.total
      });
    } catch (error) {
      message.error('获取OCR日志失败');
      console.error('Fetch OCR logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      const params = {};
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.dateFrom = filters.dateRange[0].format('YYYY-MM-DD');
        params.dateTo = filters.dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await axios.get(`${API_BASE}/ocr-logs/statistics`, {
        params,
        headers: authService.getAuthHeaders()
      });
      
      setStatistics(response.data.data);
    } catch (error) {
      message.error('获取统计信息失败');
      console.error('Fetch statistics error:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleViewDetail = async (logId) => {
    try {
      const response = await axios.get(`${API_BASE}/ocr-logs/${logId}`, {
        headers: authService.getAuthHeaders()
      });
      setSelectedLog(response.data.data);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取日志详情失败');
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      await axios.delete(`${API_BASE}/ocr-logs/${logId}`, {
        headers: authService.getAuthHeaders()
      });
      message.success('日志删除成功');
      fetchLogs();
    } catch (error) {
      message.error('删除日志失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的日志记录');
      return;
    }
    
    try {
      await axios.post(`${API_BASE}/ocr-logs/batch-delete`, {
        ids: selectedRowKeys
      }, {
        headers: authService.getAuthHeaders()
      });
      message.success(`成功删除 ${selectedRowKeys.length} 条日志记录`);
      setSelectedRowKeys([]);
      fetchLogs();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date) => moment(date).format('MM-DD HH:mm:ss'),
      sorter: true,
    },
    {
      title: '上传链接',
      dataIndex: 'uploadLink',
      key: 'uploadLink',
      width: 120,
      ellipsis: true,
      render: (text) => text?.substring(0, 8) + '...' || '-',
    },
    {
      title: '游客姓名',
      dataIndex: ['touristId', 'touristName'],
      key: 'touristName',
      width: 120,
      render: (text, record) => record.touristId?.touristName || '-',
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 100,
      render: (type) => {
        const typeMap = {
          preview: { text: '预览识别', color: 'blue' },
          upload: { text: '上传确认', color: 'green' },
          update: { text: '更新护照', color: 'orange' }
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '识别状态',
      dataIndex: 'ocrStatus',
      key: 'ocrStatus',
      width: 100,
      render: (status) => {
        const statusMap = {
          pending: { text: '等待中', color: 'default', icon: <ClockCircleOutlined /> },
          processing: { text: '识别中', color: 'processing', icon: <ClockCircleOutlined /> },
          success: { text: '成功', color: 'success', icon: <CheckCircleOutlined /> },
          failed: { text: '失败', color: 'error', icon: <CloseCircleOutlined /> }
        };
        const config = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
    },
    {
      title: '耗时',
      dataIndex: 'ocrDuration',
      key: 'ocrDuration',
      width: 80,
      render: (duration) => {
        if (!duration) return '-';
        return `${duration}ms`;
      },
    },
    {
      title: '操作员',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 100,
    },
    {
      title: '图片大小',
      dataIndex: 'imageSize',
      key: 'imageSize',
      width: 100,
      render: (size) => {
        if (!size) return '-';
        return `${(size / 1024).toFixed(1)}KB`;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record._id)}
          >
            详情
          </Button>
          <Popconfirm
            title="确定删除这条日志吗？"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleDeleteLog(record._id)}
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
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  return (
    <div className="ocr-logs">
      <Card title="护照识别日志" className="logs-card">
        {/* 统计信息 */}
        {statistics && (
          <div className="statistics-section" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="今日识别次数"
                    value={statistics.today.totalCount}
                    suffix="次"
                    loading={statsLoading}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="今日成功率"
                    value={statistics.today.totalCount > 0 ? 
                      ((statistics.today.successCount / statistics.today.totalCount) * 100).toFixed(1) : 0}
                    suffix="%"
                    loading={statsLoading}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均耗时"
                    value={statistics.overall.avgDuration ? 
                      statistics.overall.avgDuration.toFixed(0) : 0}
                    suffix="ms"
                    loading={statsLoading}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总识别次数"
                    value={statistics.overall.totalCount}
                    suffix="次"
                    loading={statsLoading}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* 筛选条件 */}
        <div className="filter-section" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <Input.Search
                placeholder="搜索上传链接"
                value={filters.uploadLink}
                onChange={(e) => setFilters(prev => ({ ...prev, uploadLink: e.target.value }))}
                onSearch={() => fetchLogs()}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value, page: 1 }))}
                style={{ width: '100%' }}
              >
                <Option value="all">全部状态</Option>
                <Option value="success">成功</Option>
                <Option value="failed">失败</Option>
                <Option value="processing">识别中</Option>
                <Option value="pending">等待中</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                value={filters.operationType}
                onChange={(value) => setFilters(prev => ({ ...prev, operationType: value, page: 1 }))}
                style={{ width: '100%' }}
              >
                <Option value="all">全部类型</Option>
                <Option value="preview">预览识别</Option>
                <Option value="upload">上传确认</Option>
                <Option value="update">更新护照</Option>
              </Select>
            </Col>
            <Col span={6}>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates, page: 1 }))}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={4}>
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchLogs}
                >
                  刷新
                </Button>
                {selectedRowKeys.length > 0 && (
                  <Popconfirm
                    title={`确定删除选中的 ${selectedRowKeys.length} 条日志吗？`}
                    onConfirm={handleBatchDelete}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      批量删除
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="_id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1200 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setFilters(prev => ({ ...prev, page, limit: pageSize }));
            }
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="OCR识别详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedLog(null);
        }}
        width={800}
        footer={null}
      >
        {selectedLog && (
          <div className="log-detail">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Alert
                  message="基本信息"
                  type="info"
                  style={{ marginBottom: 16 }}
                />
              </Col>
              <Col span={12}>
                <div><strong>上传链接：</strong>{selectedLog.uploadLink}</div>
                <div><strong>操作类型：</strong>{selectedLog.operationType}</div>
                <div><strong>操作员：</strong>{selectedLog.operatorName}</div>
                <div><strong>识别状态：</strong>
                  <Tag color={
                    selectedLog.ocrStatus === 'success' ? 'green' :
                    selectedLog.ocrStatus === 'failed' ? 'red' : 'blue'
                  }>
                    {selectedLog.ocrStatus}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <div><strong>识别耗时：</strong>{selectedLog.ocrDuration}ms</div>
                <div><strong>图片大小：</strong>{(selectedLog.imageSize / 1024).toFixed(1)}KB</div>
                <div><strong>识别时间：</strong>{moment(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                <div><strong>IP地址：</strong>{selectedLog.ipAddress || '-'}</div>
              </Col>
              
              {selectedLog.recognizedData && (
                <>
                  <Col span={24}>
                    <Alert
                      message="识别结果"
                      type="success"
                      style={{ marginTop: 16, marginBottom: 16 }}
                    />
                  </Col>
                  <Col span={12}>
                    <div><strong>姓名：</strong>{selectedLog.recognizedData.fullName || '-'}</div>
                    <div><strong>护照号：</strong>{selectedLog.recognizedData.passportNumber || '-'}</div>
                    <div><strong>性别：</strong>{selectedLog.recognizedData.gender || '-'}</div>
                    <div><strong>国籍：</strong>{selectedLog.recognizedData.nationality || '-'}</div>
                  </Col>
                  <Col span={12}>
                    <div><strong>出生日期：</strong>{selectedLog.recognizedData.birthDate ? 
                      moment(selectedLog.recognizedData.birthDate).format('DD/MM/YYYY') : '-'}</div>
                    <div><strong>出生地：</strong>{selectedLog.recognizedData.birthPlace || '-'}</div>
                    <div><strong>签发日期：</strong>{selectedLog.recognizedData.issueDate ? 
                      moment(selectedLog.recognizedData.issueDate).format('DD/MM/YYYY') : '-'}</div>
                    <div><strong>有效期：</strong>{selectedLog.recognizedData.expiryDate ? 
                      moment(selectedLog.recognizedData.expiryDate).format('DD/MM/YYYY') : '-'}</div>
                  </Col>
                </>
              )}
              
              {selectedLog.confirmedData && (
                <>
                  <Col span={24}>
                    <Alert
                      message="用户确认数据"
                      type="warning"
                      style={{ marginTop: 16, marginBottom: 16 }}
                    />
                  </Col>
                  <Col span={12}>
                    <div><strong>确认姓名：</strong>{selectedLog.confirmedData.fullName || '-'}</div>
                    <div><strong>确认护照号：</strong>{selectedLog.confirmedData.passportNumber || '-'}</div>
                    <div><strong>联系电话：</strong>{selectedLog.confirmedData.contactPhone || '-'}</div>
                    <div><strong>联系邮箱：</strong>{selectedLog.confirmedData.contactEmail || '-'}</div>
                  </Col>
                  <Col span={12}>
                    <div><strong>确认出生地：</strong>{selectedLog.confirmedData.birthPlace || '-'}</div>
                    <div><strong>确认国籍：</strong>{selectedLog.confirmedData.nationality || '-'}</div>
                    <div><strong>确认性别：</strong>{selectedLog.confirmedData.gender || '-'}</div>
                  </Col>
                </>
              )}
              
              {selectedLog.ocrError && (
                <>
                  <Col span={24}>
                    <Alert
                      message="错误信息"
                      type="error"
                      style={{ marginTop: 16, marginBottom: 16 }}
                    />
                  </Col>
                  <Col span={24}>
                    <div style={{ color: 'red' }}>{selectedLog.ocrError}</div>
                  </Col>
                </>
              )}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default OCRLogs;