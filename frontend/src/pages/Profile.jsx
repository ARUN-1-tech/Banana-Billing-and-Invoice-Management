import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Upload, Alert, Typography, Divider, Row, Col, Modal, Space, Select } from 'antd';
import { UserOutlined, ShopOutlined, PhoneOutlined, HomeOutlined, GlobalOutlined, UploadOutlined, ClearOutlined, CheckOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Profile = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, updateProfile } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Drawing Pad States & References
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        business_name: user.business_name,
        phone: user.phone,
        native_place: user.native_place,
        district: user.district,
        pin: user.pin,
      });
      if (user.signature) {
        setSignatureData(user.signature);
      }
    }
  }, [user]);

  // Canvas Drawing Handlers
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#333';
  }, [canvasRef.current]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64 = canvas.toDataURL('image/png');
    setSignatureData(base64);
    Modal.success({
      title: 'Signature Captured',
      content: 'Signature drawn successfully! Click Save Changes below to update your profile.',
      borderRadius: 12
    });
  };

  // Image Upload handler for signature (alternative to drawing)
  const handleSignatureUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSignatureData(e.target.result);
    };
    reader.readAsDataURL(file);
    return false; // Prevent auto upload
  };

  const onFinish = async (values) => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      await updateProfile({
        ...values,
        signature: signatureData
      });
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setError(err.detail || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ marginBottom: '4px', fontWeight: 800 }}>{t('profile_settings')}</Title>
        <Text type="secondary">{t('profile_subtitle')}</Text>
      </div>

      {success && <Alert message="Profile Settings Saved Successfully!" type="success" showIcon style={{ marginBottom: '20px', borderRadius: '12px' }} />}
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '20px', borderRadius: '12px' }} />}

      <Row gutter={[24, 24]}>
        <Col xs={24} md={15}>
          <Card className="glass-panel" title={t('profile_settings')}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              size="large"
            >
              <Form.Item
                name="name"
                label={t('billing_owner')}
                rules={[{ required: true, message: 'Please input the Operator name!' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="e.g. Arun Kumar" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="business_name"
                    label={t('weighing_center')}
                    rules={[{ required: true, message: 'Please input the Business name!' }]}
                  >
                    <Input prefix={<ShopOutlined />} placeholder="e.g. Trichy Banana Traders" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="phone"
                    label={t('operator_phone')}
                    rules={[{ required: true, message: 'Please input the Phone number!' }]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="e.g. +91 98765 43210" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="native_place"
                    label={t('location')}
                    rules={[{ required: true, message: 'Please input the Native place!' }]}
                  >
                    <Input prefix={<HomeOutlined />} placeholder="e.g. Thottiyam" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="district"
                    label={t('district')}
                    rules={[{ required: true, message: 'Please input the District!' }]}
                  >
                    <Input prefix={<GlobalOutlined />} placeholder="e.g. Trichy" disabled={user?.is_approved} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="pin"
                    label="Security PIN (4 Digits)"
                    rules={[
                      { required: true, message: 'Please input your 4-digit PIN!' },
                      { len: 4, message: 'PIN must be exactly 4 digits!' },
                      { pattern: /^\d+$/, message: 'PIN must contain only numbers!' }
                    ]}
                  >
                    <Input.Password maxLength={4} placeholder="e.g. 1234" style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} className="btn-primary">
                  {t('save_changes')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Right side: Language Settings & Signature Box */}
        <Col xs={24} md={9}>
          <Card className="glass-panel" title={t('language_select')} style={{ marginBottom: '24px' }}>
            <Select
              value={language}
              onChange={(val) => setLanguage(val)}
              style={{ width: '100%' }}
              size="large"
            >
              <Option value="en">{t('english')}</Option>
              <Option value="ta">{t('tamil')}</Option>
              <Option value="hi">{t('hindi')}</Option>
            </Select>
          </Card>

          <Card className="glass-panel" title={t('auth_signature')}>
            <div style={{ textAlign: 'center' }}>
              {signatureData ? (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    padding: '20px',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100px'
                  }}>
                    <img src={signatureData} alt="Signature Preview" style={{ maxHeight: '80px', maxWidth: '100%' }} />
                  </div>
                  <Button type="text" danger icon={<ClearOutlined />} onClick={() => setSignatureData(null)}>
                    Clear Signature
                  </Button>
                </div>
              ) : (
                <div style={{ marginBottom: '16px', opacity: 0.6 }}>
                  <Text type="secondary">No signature set. Draw or upload a signature below to sign invoices.</Text>
                </div>
              )}

              <Divider style={{ margin: '12px 0' }} />

              <Typography.Title level={5} style={{ textAlign: 'left', marginBottom: '8px' }}>{t('digital_pad')}</Typography.Title>
              
              <canvas
                ref={canvasRef}
                width={200}
                height={100}
                style={{
                  border: '1px dashed #aaa',
                  background: '#fdfdfd',
                  borderRadius: '6px',
                  cursor: 'crosshair',
                  display: 'block',
                  margin: '0 auto 12px'
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              
              <Space style={{ marginBottom: '16px' }}>
                <Button size="small" icon={<ClearOutlined />} onClick={clearCanvas}>Reset</Button>
                <Button size="small" type="primary" icon={<CheckOutlined />} className="btn-primary" onClick={saveCanvasSignature}>Confirm Sign</Button>
              </Space>

              <Divider style={{ margin: '8px 0' }} />

              <Typography.Title level={5} style={{ textAlign: 'left', marginBottom: '8px' }}>{t('upload_scan')}</Typography.Title>
              
              <Upload
                beforeUpload={handleSignatureUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} style={{ width: '100%' }}>Select Image File</Button>
              </Upload>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
