import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, InputNumber, Modal, Space, Typography, Spin, Alert, Row, Col, Timeline } from 'antd';
import { PlusOutlined, EditOutlined, HistoryOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const Rates = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm] = Form.useForm();
  const [editingRate, setEditingRate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRatesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/rates/');
      setRates(response.data);
      
      const historyResponse = await axios.get('/rates/history/');
      setHistory(historyResponse.data);
    } catch (err) {
      console.error('Error fetching rates data', err);
      setError('Could not load rates data from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatesData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingRate(null);
    modalForm.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingRate(record);
    modalForm.setFieldsValue({
      banana_type: record.banana_type,
      rate: record.rate
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingRate) {
        // Edit Rate
        await axios.patch(`/rates/${editingRate.id}/`, values);
        Modal.success({ title: 'Success', content: 'Banana rate updated successfully!', borderRadius: 12 });
      } else {
        // Add Rate
        await axios.post('/rates/', values);
        Modal.success({ title: 'Success', content: 'New banana type and rate registered!', borderRadius: 12 });
      }
      setIsModalOpen(false);
      fetchRatesData();
    } catch (err) {
      console.error('Error saving rate', err);
      Modal.error({
        title: 'Error Saving Rate',
        content: err.response?.data?.banana_type || 'Server communication error.',
        borderRadius: 12
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Banana Variety Type',
      dataIndex: 'banana_type',
      key: 'banana_type',
      render: (text) => <Text style={{ fontWeight: 600, fontSize: '15px' }}>{text}</Text>
    },
    {
      title: 'Current Rate (per Kg)',
      dataIndex: 'rate',
      key: 'rate',
      render: (val) => <Text style={{ color: '#2ecc71', fontWeight: 700, fontSize: '15px' }}>₹{parseFloat(val).toFixed(2)}</Text>
    },
    {
      title: 'Last Synchronized Time',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text) => <Text type="secondary">{new Date(text).toLocaleString('en-IN')}</Text>
    }
  ];

  if (isAdmin) {
    columns.push({
      title: 'Action Controls',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Button icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)}>
          Edit Rate
        </Button>
      )
    });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Loading variety pricing sheets..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Title level={2} style={{ marginBottom: '4px', fontWeight: 800 }}>Banana Rate Management</Title>
          <Text type="secondary">Prices are synced district-wide. Billing owners operate on current values.</Text>
        </div>
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="btn-primary"
            onClick={handleOpenAddModal}
          >
            Add Banana Type
          </Button>
        )}
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '20px', borderRadius: '12px' }} />}

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card className="glass-panel" title="Current Active Market Rates">
            <Table
              dataSource={rates}
              columns={columns}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </Col>
        
        {/* Rate History Logs */}
        <Col xs={24} md={8}>
          <Card className="glass-panel" title="Price Adjustments History Log" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {history.length === 0 ? (
              <Text type="secondary">No rate change logs present.</Text>
            ) : (
              <Timeline mode="left" style={{ marginTop: '10px' }}>
                {history.slice(0, 15).map((h, idx) => (
                  <Timeline.Item key={idx} color={idx === 0 ? 'green' : 'blue'}>
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: '13px' }}>{h.banana_type}</Text>
                      <Text style={{ color: '#2ecc71', fontWeight: 600 }}>₹{parseFloat(h.rate).toFixed(2)} / kg</Text>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {new Date(h.changed_at).toLocaleString('en-IN')}
                      </Text>
                    </Space>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Card>
        </Col>
      </Row>

      {/* Add / Edit Rate Modal */}
      <Modal
        title={editingRate ? 'Edit Banana Rate' : 'Register New Banana Type'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        borderRadius={12}
      >
        <Form
          form={modalForm}
          layout="vertical"
          onFinish={handleModalSubmit}
          size="large"
        >
          <Form.Item
            name="banana_type"
            label="Banana Type Name"
            rules={[{ required: true, message: 'Type name is required!' }]}
          >
            <Input placeholder="e.g. Nendran, Poovan, Red Banana" disabled={!!editingRate} />
          </Form.Item>

          <Form.Item
            name="rate"
            label="Rate Per Kg (Rs.)"
            rules={[{ required: true, message: 'Rate is required!' }]}
          >
            <InputNumber
              min={0.01}
              step={0.5}
              style={{ width: '100%' }}
              prefix="₹"
            />
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting} className="btn-primary" icon={<SaveOutlined />}>
                Save Rate Details
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Rates;
