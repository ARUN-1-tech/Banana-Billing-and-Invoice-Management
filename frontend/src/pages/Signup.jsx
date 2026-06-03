import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Row, Col, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, KeyOutlined, GlobalOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const { confirm_password, ...signupData } = values;
      await signup({
        ...signupData,
        confirm_password
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error(err);
      if (typeof err === 'object') {
        // Collect field specific errors or global errors
        const errorMsg = Object.entries(err)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(errorMsg || 'Registration failed. Check your inputs.');
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Animated Blobs specific to Auth Screen */}
      <div className="bg-blobs">
        <div className="blob blob-1" style={{ opacity: 0.2 }}></div>
        <div className="blob blob-2" style={{ opacity: 0.2 }}></div>
      </div>

      <Card
        className="glass-panel floating-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '10px 10px',
          margin: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '40px' }}>🍌</span>
          <Title level={3} style={{ marginTop: '8px', marginBottom: '4px', fontWeight: 800 }}>
            Register Trading Account
          </Title>
          <Text type="secondary">Validate passcode to setup your billing station</Text>
        </div>

        {success ? (
          <Alert
            message="Registration Successful!"
            description="Your account was created. Please wait for District Banana Head approval. Redirecting to Login..."
            type="success"
            showIcon
            style={{ marginBottom: '20px', borderRadius: '8px', textAlign: 'left' }}
          />
        ) : (
          <>
            {error && (
              <Alert
                message="Registration Blocked"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: '20px', borderRadius: '8px', textAlign: 'left' }}
              />
            )}

            <Form
              name="signup_form"
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="name"
                    rules={[{ required: true, message: 'Please input your Full Name!' }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ opacity: 0.5 }} />}
                      placeholder="Full Name"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: 'Please input your Username!' }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ opacity: 0.5 }} />}
                      placeholder="Username"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Please input your Email!' },
                      { type: 'email', message: 'Please enter a valid Email!' }
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined style={{ opacity: 0.5 }} />}
                      placeholder="Email Address"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="phone"
                    rules={[{ required: true, message: 'Please input your Phone Number!' }]}
                  >
                    <Input
                      prefix={<PhoneOutlined style={{ opacity: 0.5 }} />}
                      placeholder="Phone Number"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="district"
                    rules={[{ required: true, message: 'Please specify your District!' }]}
                  >
                    <Input
                      prefix={<GlobalOutlined style={{ opacity: 0.5 }} />}
                      placeholder="District"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="passcode"
                    rules={[{ required: true, message: 'Please input registration Passcode!' }]}
                  >
                    <Input
                      prefix={<KeyOutlined style={{ opacity: 0.5 }} />}
                      placeholder="Signup Passcode"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Please input Password!' }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ opacity: 0.5 }} />}
                      placeholder="Password"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="confirm_password"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm password!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ opacity: 0.5 }} />}
                      placeholder="Confirm Password"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginTop: '8px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="btn-primary"
                  style={{ width: '100%', height: '48px', fontSize: '16px' }}
                >
                  Verify and Register
                </Button>
              </Form.Item>
            </Form>
          </>
        )}

        <Divider style={{ margin: '16px 0' }} />

        <div>
          <Text style={{ opacity: 0.7 }}>Already have a billing account? </Text>
          <Link to="/login" style={{ fontWeight: 600, color: '#f6b93b' }}>
            Login here
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
