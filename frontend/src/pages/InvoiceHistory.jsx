import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, Select, Button, Space, DatePicker, Tag, Typography, Spin, Alert, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined, FileTextOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const InvoiceHistory = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Build query string params
      const params = {};
      if (filters.invoice_no) params.invoice_no = filters.invoice_no;
      if (filters.customer) params.customer = filters.customer;
      if (filters.banana_type) params.banana_type = filters.banana_type;
      if (filters.payment_status) params.payment_status = filters.payment_status;
      if (filters.date) {
        params.date = filters.date.format('YYYY-MM-DD');
      }

      const response = await axios.get('/invoices/', { params });
      setInvoices(response.data);
    } catch (err) {
      console.error('Error fetching invoices', err);
      setError('Could not retrieve invoices. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSearch = (values) => {
    fetchInvoices(values);
  };

  const handleReset = () => {
    form.resetFields();
    fetchInvoices();
  };

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'date',
      key: 'date',
      render: (date, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontWeight: 600 }}>{date}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.time}</Text>
        </Space>
      ),
      sorter: (a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time),
    },
    {
      title: 'Invoice No',
      dataIndex: 'invoice_no',
      key: 'invoice_no',
      render: (text) => <Text style={{ fontWeight: 700, color: '#f6b93b' }}>{text}</Text>,
    },
    {
      title: 'Customer Name',
      dataIndex: ['customer_details', 'name'],
      key: 'customer_name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || record.customer}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.customer_details?.place}</Text>
        </Space>
      ),
    },
    {
      title: 'Banana Type',
      dataIndex: ['customer_details', 'banana_type'],
      key: 'banana_type',
      render: (text) => <Tag color="blue">{text || 'N/A'}</Tag>,
    },
    {
      title: 'Net Weight',
      dataIndex: 'net_weight',
      key: 'net_weight',
      render: (text) => <Text strong>{parseFloat(text).toFixed(2)} Kg</Text>,
    },
    {
      title: 'Final Amount',
      dataIndex: 'final_amount',
      key: 'final_amount',
      render: (text) => <Text style={{ fontWeight: 700, color: '#2ecc71' }}>₹{parseFloat(text).toFixed(2)}</Text>,
    },
    {
      title: 'Payment Status',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => {
        let color = 'default';
        if (status === 'settled') color = 'success';
        if (status === 'partially_settled') color = 'warning';
        if (status === 'not_settled') color = 'error';
        return <Tag color={color}>{status.toUpperCase().replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/invoice-details/${record.id}`)}
        >
          View Bill
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ marginBottom: '4px', fontWeight: 800 }}>Billing History</Title>
        <Text type="secondary">View and manage all generated banana invoices and payments</Text>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '20px', borderRadius: '12px' }} />}

      {/* Single Search Bar with all filters */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
        <Input
          size="large"
          placeholder="Search by invoice #, customer name, banana variety, status, date..."
          prefix={<SearchOutlined style={{ opacity: 0.5 }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          className="glass-panel"
          style={{ width: '100%', maxWidth: '600px', borderRadius: '12px', padding: '10px 15px' }}
        />
      </div>

      {/* Invoices List Table */}
      <Card className="glass-panel">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Retrieving billing history ledger..." />
          </div>
        ) : (
          <Table
            dataSource={invoices.filter(item => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase().trim();
              const invoiceNo = (item.invoice_no || '').toLowerCase();
              const customerName = (item.customer_details?.name || '').toLowerCase();
              const customerPlace = (item.customer_details?.place || '').toLowerCase();
              const statusVal = (item.payment_status || '').toLowerCase();
              const dateVal = (item.date || '').toLowerCase();
              const bananaVal = (item.customer_details?.banana_type || '').toLowerCase();
              const itemsBanana = (item.weight_entries || []).map(we => (we.banana_type || '').toLowerCase()).join(' ');

              return invoiceNo.includes(q) || 
                     customerName.includes(q) || 
                     customerPlace.includes(q) || 
                     statusVal.includes(q) || 
                     dateVal.includes(q) ||
                     bananaVal.includes(q) ||
                     itemsBanana.includes(q);
            })}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, position: ['bottomCenter'] }}
            onRow={(record) => ({
              onClick: () => navigate(`/invoice-details/${record.id}`),
              style: { cursor: 'pointer' }
            })}
          />
        )}
      </Card>
    </div>
  );
};

export default InvoiceHistory;
