import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Form, Input, Modal, Space, Typography, Tag, Spin, Alert, Row, Col } from 'antd';
import { CheckOutlined, CloseOutlined, PlusOutlined, KeyOutlined, UserOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const AdminPanel = () => {
  const { user } = useAuth();
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPasscodes, setLoadingPasscodes] = useState(true);
  const [users, setUsers] = useState([]);
  const [passcodes, setPasscodes] = useState([]);
  const [error, setError] = useState(null);

  // New Passcode Modal State
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [passcodeForm] = Form.useForm();
  const [savingPasscode, setSavingPasscode] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get('/admin/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching registration users', err);
      setError('Could not retrieve pending users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPasscodes = async () => {
    setLoadingPasscodes(true);
    try {
      const response = await axios.get('/admin/passcodes/');
      setPasscodes(response.data);
    } catch (err) {
      console.error('Error fetching passcodes', err);
      setError('Could not retrieve registration passcodes.');
    } finally {
      setLoadingPasscodes(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchPasscodes();
    }
  }, [user]);

  const handleApproveUser = async (id, name) => {
    try {
      await axios.post(`/admin/users/${id}/approve/`);
      Modal.success({ title: 'User Approved', content: `Owner "${name}" has been approved and can now log in.`, borderRadius: 12 });
      fetchUsers();
    } catch (err) {
      console.error('Error approving user', err);
      Modal.error({ title: 'Error', content: 'Approval failed. Contact database administrator.', borderRadius: 12 });
    }
  };

  const handleRejectUser = async (id, name) => {
    Modal.confirm({
      title: 'Reject User Registration?',
      content: `Are you sure you want to reject and delete the profile of "${name}"?`,
      okText: 'Delete Registration',
      okType: 'danger',
      borderRadius: 12,
      onOk: async () => {
        try {
          await axios.post(`/admin/users/${id}/reject/`);
          fetchUsers();
        } catch (err) {
          console.error('Error rejecting user', err);
        }
      }
    });
  };

  const handleDeleteUser = async (id, name) => {
    Modal.confirm({
      title: 'Delete Owner Profile & Data?',
      content: `Are you sure you want to completely delete owner "${name}"? ALL associated bills, payments, and vehicle logs will be permanently removed. This action is irreversible.`,
      okText: 'Delete Completely',
      okType: 'danger',
      borderRadius: 12,
      onOk: async () => {
        try {
          await axios.delete(`/admin/users/${id}/`);
          Modal.success({
            title: 'Owner Deleted',
            content: `Owner "${name}" and all their associated records have been completely removed.`,
            borderRadius: 12
          });
          fetchUsers();
        } catch (err) {
          console.error('Error deleting user', err);
          Modal.error({
            title: 'Deletion Failed',
            content: err.response?.data?.error || 'Could not delete owner from database.',
            borderRadius: 12
          });
        }
      }
    });
  };

  const handleCreatePasscode = async (values) => {
    setSavingPasscode(true);
    try {
      await axios.post('/admin/passcodes/', {
        passcode: values.passcode,
        is_active: true
      });
      Modal.success({ title: 'Passcode Generated', content: `Passcode "${values.passcode}" is now active.`, borderRadius: 12 });
      setIsPasscodeModalOpen(false);
      passcodeForm.resetFields();
      fetchPasscodes();
    } catch (err) {
      console.error('Error generating passcode', err);
      Modal.error({
        title: 'Failed',
        content: err.response?.data?.passcode || 'Passcode already exists or server error.',
        borderRadius: 12
      });
    } finally {
      setSavingPasscode(false);
    }
  };

  const handleTogglePasscode = async (id, currentActive) => {
    try {
      await axios.patch(`/admin/passcodes/${id}/`, {
        is_active: !currentActive
      });
      Modal.success({
        title: 'Passcode Updated',
        content: `Passcode status set to ${!currentActive ? 'Active' : 'Disabled'} successfully.`,
        borderRadius: 12
      });
      fetchPasscodes();
    } catch (err) {
      console.error('Error toggling passcode', err);
      Modal.error({
        title: 'Update Failed',
        content: 'Could not change passcode status.',
        borderRadius: 12
      });
    }
  };

  const userColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text style={{ fontWeight: 600 }}>{text}</Text>
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: 'District',
      dataIndex: 'district',
      key: 'district'
    },
    {
      title: 'Approval Status',
      dataIndex: 'is_approved',
      key: 'is_approved',
      render: (approved) => (
        approved 
          ? <Tag color="success">APPROVED</Tag> 
          : <Tag color="warning">PENDING APPROVAL</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {!record.is_approved && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleApproveUser(record.id, record.name || record.username)}
              style={{ background: '#2ecc71', borderColor: '#2ecc71' }}
            >
              Approve
            </Button>
          )}
          <Button
            type="primary"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleDeleteUser(record.id, record.name || record.username)}
          >
            {record.is_approved ? 'Delete Owner' : 'Reject'}
          </Button>
        </Space>
      )
    }
  ];

  const passcodeColumns = [
    {
      title: 'Registration Passcode',
      dataIndex: 'passcode',
      key: 'passcode',
      render: (text) => <Text style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px', fontSize: '15px' }}>{text}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => (
        active 
          ? <Tag color="success">ACTIVE / USABLE</Tag> 
          : <Tag color="error">DISABLED</Tag>
      )
    },
    {
      title: 'Date Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => <Text type="secondary">{new Date(text).toLocaleDateString('en-IN')}</Text>
    },
    {
      title: 'Authorized By',
      dataIndex: 'created_by_name',
      key: 'created_by_name'
    },
    {
      title: 'Status Controls',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          type={record.is_active ? 'default' : 'primary'}
          danger={record.is_active}
          onClick={() => handleTogglePasscode(record.id, record.is_active)}
        >
          {record.is_active ? 'Disable' : 'Enable'}
        </Button>
      )
    }
  ];

  if (user?.role !== 'admin') {
    return <Alert message="Unauthorized Access" description="Only the District Banana Head (Super Admin) is permitted to access this panel." type="error" showIcon style={{ borderRadius: '12px' }} />;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ marginBottom: '4px', fontWeight: 800 }}>District Headquarter Admin Panel</Title>
        <Text type="secondary">Review registered billing operators and generate activation passcodes</Text>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '20px', borderRadius: '12px' }} />}

      <Card className="glass-panel" style={{ padding: '5px' }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span><UserOutlined />Manage District Owners</span>} key="1">
            {loadingUsers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Spin tip="Loading district owners..." /></div>
            ) : (
              <Table
                dataSource={users}
                columns={userColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: 'No owners registered in this district.' }}
              />
            )}
          </TabPane>
          <TabPane tab={<span><KeyOutlined />Signup Passcodes</span>} key="2">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Button type="primary" icon={<PlusOutlined />} className="btn-primary" onClick={() => setIsPasscodeModalOpen(true)}>
                Generate Passcode
              </Button>
            </div>
            {loadingPasscodes ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Spin tip="Loading passcodes..." /></div>
            ) : (
              <Table
                dataSource={passcodes}
                columns={passcodeColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* Generate Passcode Modal */}
      <Modal
        title="Generate New Signup Passcode"
        open={isPasscodeModalOpen}
        onCancel={() => setIsPasscodeModalOpen(false)}
        footer={null}
        borderRadius={12}
      >
        <Form
          form={passcodeForm}
          layout="vertical"
          onFinish={handleCreatePasscode}
          size="large"
        >
          <Form.Item
            name="passcode"
            label="Signup Passcode String"
            rules={[
              { required: true, message: 'Please input passcode string!' },
              { min: 4, message: 'Passcode must be at least 4 characters!' }
            ]}
          >
            <Input placeholder="e.g. TRICHY2026, BANANA99" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsPasscodeModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={savingPasscode} className="btn-primary" icon={<SaveOutlined />}>
                Activate Passcode
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPanel;
