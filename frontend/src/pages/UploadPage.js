import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Button, Card, Alert, Spin, Result, Steps, message, Form, Input, Select, Image, Row, Col, Space, Progress } from 'antd';
import { InboxOutlined, CheckCircleOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAllCountries } from '../utils/countryCode';
import { validatePassportName, getNameFormatHint } from '../utils/nameValidator';
import Footer from '../components/Footer';
import './UploadPage.css';

const { Dragger } = Upload;
const { Step } = Steps;
const { Option } = Select;

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3060/api';

// 格式化日期为YYYY-MM-DD
const formatDate = (date) => {
  if (!date) return '';
  // 处理DD/MM/YYYY格式
  if (typeof date === 'string' && date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  // 处理ISO日期格式
  return moment(date).format('YYYY-MM-DD');
};

function UploadPage() {
  const { uploadLink } = useParams();
  const [form] = Form.useForm();
  const [touristInfo, setTouristInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [tempImageFile, setTempImageFile] = useState(null);
  const [recognizedData, setRecognizedData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      await fetchTouristInfo();
      await checkUploadStatus();
    };
    fetchData();
  }, [uploadLink]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTouristInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tourists/link/${uploadLink}`);
      setTouristInfo(response.data.data);
      setLoading(false);
      
      // 如果已经上传过，显示已完成状态
      if (response.data.data.uploadStatus === 'verified') {
        // 从touristInfo中提取数据
        const submittedData = {
          fullName: response.data.data.passportName || response.data.data.touristName,
          passportNumber: response.data.data.passportNumber,
          gender: response.data.data.gender || 'M',
          expiryDate: response.data.data.passportExpiryDate,
          nationality: response.data.data.nationality
        };
        setRecognizedData(submittedData);
        setFinalSubmitted(true);
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Failed to fetch tourist info:', error);
      setLoading(false);
    }
  };

  const checkUploadStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/upload/status/${uploadLink}`);
      if (response.data.data.status === 'verified') {
        setFinalSubmitted(true);
        setCurrentStep(2);
        // 格式化数据，确保fullName字段存在
        const recognizedData = response.data.data.recognizedData || {};
        if (recognizedData.name && !recognizedData.fullName) {
          recognizedData.fullName = recognizedData.name;
        }
        setRecognizedData(recognizedData);
      }
    } catch (error) {
      console.error('Failed to check upload status:', error);
    }
  };

  const handleUpload = async (file) => {
    // 先创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setTempImageUrl(e.target.result);
    };
    reader.readAsDataURL(file);
    setTempImageFile(file);

    const formData = new FormData();
    formData.append('passport', file);
    formData.append('preview', 'true'); // 告诉后端这只是预览

    setUploading(true);
    setUploadProgress(0);

    // 更真实的进度条模拟
    const progressSteps = [
      { percent: 20, text: '正在上传图片...' },
      { percent: 40, text: '图片质量检查中...' },
      { percent: 60, text: 'AI智能识别中...' },
      { percent: 80, text: '解析护照信息...' },
      { percent: 95, text: '完成识别处理...' }
    ];
    
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setUploadProgress(progressSteps[stepIndex].percent);
        setProgressText(progressSteps[stepIndex].text);
        stepIndex++;
      } else {
        clearInterval(progressInterval);
      }
    }, 800);

    try {
      const response = await axios.post(
        `${API_BASE}/upload/passport/preview/${uploadLink}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // 完成进度条
        clearInterval(progressInterval);
        setUploadProgress(100);
        setProgressText('识别完成！');
        
        setRecognizedData(response.data.data);
        
        // 设置表单默认值
        let nationality = response.data.data.nationality || 'CHN';
        // 确保CHI被转换为CHN
        if (nationality === 'CHI') {
          nationality = 'CHN';
        }
        
        form.setFieldsValue({
          fullName: response.data.data.recognizedName || '',
          passportNumber: response.data.data.passportNumber || '',
          gender: response.data.data.gender || 'M',
          issueDate: response.data.data.issueDate || '',
          expiryDate: response.data.data.expiryDate || '',
          birthDate: response.data.data.birthDate || '',
          birthPlace: response.data.data.birthPlace || '',
          nationality: nationality
        });
        
        setCurrentStep(1);
        setIsEditing(true);
        message.success('护照识别成功，请确认信息！');
      }
    } catch (error) {
      // 处理错误 - 简化错误提示
      clearInterval(progressInterval);
      const errorMessage = error.response?.data?.error || '识别失败，请重试';
      message.error(errorMessage);
      setCurrentStep(0);
      setTempImageUrl(null);
      setTempImageFile(null);
      setUploadProgress(0);
      setProgressText('');
    } finally {
      setUploading(false);
    }

    return false;
  };

  const handleFinalSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 验证并格式化姓名
      const nameValidation = validatePassportName(values.fullName);
      if (!nameValidation.valid) {
        message.error(nameValidation.error);
        return;
      }
      
      // 验证邮箱是否已验证
      if (!emailVerified) {
        message.error('请先验证邮箱');
        return;
      }
      
      setConfirming(true);

      const formData = new FormData();
      formData.append('passport', tempImageFile);
      formData.append('confirmData', JSON.stringify({
        fullName: nameValidation.formatted,
        passportNumber: values.passportNumber,
        gender: values.gender,
        issueDate: values.issueDate,
        expiryDate: values.expiryDate,
        birthDate: values.birthDate,
        birthPlace: values.birthPlace,
        nationality: values.nationality,
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail
      }));

      const response = await axios.post(
        `${API_BASE}/upload/passport/${uploadLink}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // 保存提交的数据用于显示
        const submittedData = {
          fullName: nameValidation.formatted,
          passportNumber: values.passportNumber,
          gender: values.gender,
          expiryDate: values.expiryDate,
          birthDate: values.birthDate,
          nationality: values.nationality
        };
        setRecognizedData(submittedData);
        setFinalSubmitted(true);
        setCurrentStep(2);
        message.success('护照信息已确认并保存！');
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.error || '提交失败，请重试');
      } else if (error.errorFields) {
        message.error('请填写所有必填项');
      } else {
        message.error('提交失败，请重试');
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setTempImageUrl(null);
    setTempImageFile(null);
    setRecognizedData(null);
    setIsEditing(false);
    setUploadProgress(0);
    setProgressText('');
    setEmailVerified(false);
    setCountdown(0);
    form.resetFields();
  };

  // 发送验证码
  const handleSendVerificationCode = async () => {
    try {
      const email = form.getFieldValue('contactEmail');
      if (!email) {
        message.error('请先输入邮箱地址');
        return;
      }

      setSendingCode(true);
      const response = await axios.post(`${API_BASE}/email-verification/send-code`, {
        email,
        uploadLink
      });

      if (response.data.success) {
        message.success('验证码已发送，请查收邮件');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      message.error(error.response?.data?.error || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  // 验证验证码
  const handleVerifyCode = async () => {
    try {
      const email = form.getFieldValue('contactEmail');
      const verificationCode = form.getFieldValue('verificationCode');
      
      if (!email || !verificationCode) {
        message.error('请输入邮箱和验证码');
        return;
      }

      setVerifyingCode(true);
      const response = await axios.post(`${API_BASE}/email-verification/verify-code`, {
        email,
        uploadLink,
        code: verificationCode
      });

      if (response.data.success) {
        setEmailVerified(true);
        message.success('邮箱验证成功');
      }
    } catch (error) {
      message.error(error.response?.data?.error || '验证码验证失败');
    } finally {
      setVerifyingCode(false);
    }
  };

  const uploadProps = {
    name: 'passport',
    multiple: false,
    accept: 'image/*',
    beforeUpload: handleUpload,
    showUploadList: false,
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!touristInfo) {
    return (
      <Result
        status="404"
        title="404"
        subTitle="无效的上传链接"
      />
    );
  }

  if (finalSubmitted) {
    return (
      <div className="upload-page">
        <Card className="upload-card">
          <Result
            status="success"
            title="护照信息已提交！"
            subTitle="您的护照信息已成功验证并保存"
            extra={
              <div className="recognized-info">
                <h3>提交的信息：</h3>
                {recognizedData && (
                  <>
                    <p><strong>姓名：</strong>{recognizedData.fullName || recognizedData.name || ''}</p>
                    <p><strong>护照号：</strong>{recognizedData.passportNumber || ''}</p>
                    <p><strong>性别：</strong>{recognizedData.gender === 'M' ? '男' : '女'}</p>
                    <p><strong>护照有效期至：</strong>{formatDate(recognizedData.expiryDate)}</p>
                  </>
                )}
              </div>
            }
          />
          <Footer />
        </Card>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <Card className="upload-card">
        <h1>护照上传</h1>
        
        <div className="info-section">
          <p><strong>旅游产品：</strong>{touristInfo.tourName}</p>
          <p><strong>出团日期：</strong>{new Date(touristInfo.departureDate).toLocaleDateString('zh-CN')}</p>
          <p><strong>游客姓名：</strong>{touristInfo.touristName}</p>
          <p><strong>销售姓名：</strong>{touristInfo.salesName}</p>
        </div>

        <Steps current={currentStep} className="upload-steps">
          <Step title="上传护照" />
          <Step title="确认信息" />
          <Step title="完成" />
        </Steps>

        {currentStep === 0 && (
          <>
            <Dragger {...uploadProps} className="upload-dragger" disabled={uploading}>
              {uploading ? (
                <div>
                  <Spin size="large" />
                  <p className="ant-upload-text">{progressText || '正在处理护照图片...'}</p>
                  <div style={{ margin: '20px 40px' }}>
                    <Progress 
                      percent={Math.round(uploadProgress)} 
                      status="active"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#52c41a',
                      }}
                      format={percent => `${percent}%`}
                    />
                  </div>
                  <p className="ant-upload-hint">{progressText || 'AI智能识别中，请稍候...'}</p>
                </div>
              ) : (
                <>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽护照照片到此区域</p>
                  <p className="ant-upload-hint">
                    支持 JPG/PNG 格式，自动识别护照信息
                  </p>
                </>
              )}
            </Dragger>

            <Alert
              message="上传说明"
              description={
                <div>
                  <ol style={{ fontSize: '13px', paddingLeft: '20px', margin: 0 }}>
                    <li style={{ marginBottom: '8px' }}>
                      <strong>照片清晰完整：</strong>请确保上传的护照照片清晰可见，文字、号码和头像部分不得模糊。
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                      <strong>四角齐全：</strong>护照照片需完整显示四个边角，避免缺边缺角。
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                      <strong>无反光无阴影：</strong>拍摄或扫描时请避免灯光反射、水波纹或阴影影响，确保页面内容清晰。
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                      <strong>原件直拍：</strong>请上传护照原件的实拍照片或扫描件，不得上传翻拍屏幕或复印件照片。
                    </li>
                    <li style={{ marginBottom: 0 }}>
                      <strong>正确方向：</strong>请保持护照页面正向上传，避免倒置或倾斜。
                    </li>
                  </ol>
                </div>
              }
              type="info"
              showIcon
              className="upload-tips"
            />
          </>
        )}

        {currentStep === 1 && isEditing && (
          <div className="confirmation-section">
            <Row gutter={24}>
              <Col xs={24} md={10}>
                <div className="passport-image-section">
                  <h3>护照照片</h3>
                  {tempImageUrl && (
                    <Image
                      src={tempImageUrl}
                      alt="护照照片"
                      style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
                    />
                  )}
                </div>
              </Col>
              <Col xs={24} md={14}>
                <div className="passport-info-section">
                  <h3>
                    <EditOutlined /> 请确认或修改护照信息
                  </h3>
                  <Form
                    form={form}
                    layout="vertical"
                    className="passport-form"
                  >
                    <Form.Item
                      name="fullName"
                      label="姓名（英文）"
                      rules={[
                        { required: true, message: '请输入姓名' },
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
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          form.setFieldsValue({ fullName: value });
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="passportNumber"
                      label="护照号码"
                      rules={[{ required: true, message: '请输入护照号码' }]}
                    >
                      <Input placeholder="请输入护照号码" style={{ textTransform: 'uppercase' }} />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="gender"
                          label="性别"
                          rules={[{ required: true, message: '请选择性别' }]}
                        >
                          <Select>
                            <Option value="M">男</Option>
                            <Option value="F">女</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="nationality"
                          label="国籍"
                          rules={[{ required: true, message: '请选择国籍' }]}
                        >
                          <Select
                            placeholder="请选择国籍"
                            showSearch
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                              option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                          >
                            {getAllCountries().map(country => (
                              <Option key={country.value} value={country.value} label={country.label}>
                                {country.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="birthDate"
                          label="出生日期"
                          rules={[{ required: true, message: '请输入出生日期' }]}
                        >
                          <Input placeholder="DD/MM/YYYY" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="issueDate"
                          label="护照签发日期"
                        >
                          <Input placeholder="DD/MM/YYYY" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      name="expiryDate"
                      label="护照有效期"
                      rules={[{ required: true, message: '请输入护照有效期' }]}
                    >
                      <Input placeholder="DD/MM/YYYY" />
                    </Form.Item>

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
                        placeholder="请输入出生地（英文）" 
                        style={{ textTransform: 'uppercase' }}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          form.setFieldsValue({ birthPlace: value });
                        }}
                      />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="contactPhone"
                          label="联系电话"
                          rules={[{ required: true, message: '请输入联系电话' }]}
                        >
                          <Input placeholder="请输入联系电话" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="contactEmail"
                          label="联系邮箱"
                          rules={[
                            { required: true, message: '请输入联系邮箱' },
                            { type: 'email', message: '邮箱格式不正确' }
                          ]}
                        >
                          <Input 
                            placeholder="请输入联系邮箱" 
                            suffix={
                              emailVerified ? 
                                <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                                null
                            }
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* 邮箱验证码 */}
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="verificationCode"
                          label="邮箱验证码"
                          rules={[
                            { required: !emailVerified, message: '请输入验证码' }
                          ]}
                        >
                          <Input 
                            placeholder="请输入6位验证码" 
                            maxLength={6}
                            disabled={emailVerified}
                            suffix={
                              emailVerified ? 
                                <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                                null
                            }
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label=" ">
                          <Space>
                            <Button
                              onClick={handleSendVerificationCode}
                              loading={sendingCode}
                              disabled={countdown > 0 || emailVerified}
                            >
                              {countdown > 0 ? `${countdown}s后重发` : '发送验证码'}
                            </Button>
                            <Button
                              type="primary"
                              onClick={handleVerifyCode}
                              loading={verifyingCode}
                              disabled={emailVerified}
                            >
                              验证
                            </Button>
                          </Space>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item>
                      <Space size="middle">
                        <Button 
                          type="primary" 
                          size="large"
                          icon={<CheckCircleOutlined />}
                          onClick={handleFinalSubmit}
                          loading={confirming}
                          disabled={!emailVerified}
                        >
                          {emailVerified ? '确认无误，提交信息' : '请先验证邮箱'}
                        </Button>
                        <Button 
                          size="large"
                          icon={<ReloadOutlined />}
                          onClick={handleReset}
                        >
                          重新上传
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </div>
              </Col>
            </Row>
          </div>
        )}
        
        <Footer />
      </Card>
    </div>
  );
}

export default UploadPage;