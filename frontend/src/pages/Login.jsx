import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState(null);

  useEffect(() => {
    // Clear all fields on mount to prevent cached credentials from displaying
    form.resetFields();

    // Check if logout was triggered by an idle timeout
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'timeout') {
      setTimeoutMessage('Session expired. You have been logged out due to 1 hour of inactivity.');
    }
  }, [location, form]);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    setTimeoutMessage(null);
    try {
      await login(values.usernameOrEmail, values.password);
      navigate('/');
    } catch (err) {
      console.error(err);
      if (typeof err === 'object') {
        setError(err.detail || err.non_field_errors?.[0] || 'Authentication failed. Please verify credentials.');
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
          maxWidth: '420px',
          padding: '20px 10px',
          margin: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '48px' }}>🍌</span>
          <Title level={2} style={{ marginTop: '12px', marginBottom: '4px', fontWeight: 800 }}>
            Welcome Back
          </Title>
          <Text type="secondary">Banana Billing & Invoice Management</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: '20px', borderRadius: '8px', textAlign: 'left' }}
          />
        )}

        {timeoutMessage && !error && (
          <Alert
            message={timeoutMessage}
            type="warning"
            showIcon
            closable
            onClose={() => setTimeoutMessage(null)}
            style={{ marginBottom: '20px', borderRadius: '8px', textAlign: 'left' }}
          />
        )}

        <Form
          form={form}
          name="login_form"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="usernameOrEmail"
            rules={[{ required: true, message: 'Please input your Username or Email!' }]}
          >
            <Input
              prefix={<UserOutlined style={{ opacity: 0.5 }} />}
              placeholder="Username or Email"
              autoComplete="new-username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ opacity: 0.5 }} />}
              placeholder="Password"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="btn-primary"
              style={{ width: '100%', height: '48px', fontSize: '16px' }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ marginTop: '16px' }}>
          <Text style={{ opacity: 0.7 }}>New trader or agent? </Text>
          <Link to="/signup" style={{ fontWeight: 600, color: '#f6b93b' }}>
            Register Business
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
