import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, InputNumber, Button, Table, Select, Tag,
  Row, Col, Statistic, DatePicker, Divider, Typography, Space, Modal, Spin, Checkbox
} from 'antd';
import {
  CarOutlined, UserOutlined, PhoneOutlined, InboxOutlined,
  DashboardOutlined, SaveOutlined, PlusOutlined, InfoCircleOutlined,
  CalendarOutlined, SearchOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const VehicleLog = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  
  // States
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [cargoBananas, setCargoBananas] = useState([]);
  
  // Form live calculation states
  const [formGross, setFormGross] = useState(0.0);
  const [formPieces, setFormPieces] = useState(0);
  const [formRemovable, setFormRemovable] = useState(0.0);
  const [formNet, setFormNet] = useState(0.0);

  // Fetch pending cargo stats
  const fetchPendingCargo = async () => {
    try {
      const res = await axios.get('/vehicles/pending_cargo/');
      const pending = res.data;
      form.setFieldsValue({
        total_pieces: pending.pieces,
        total_gross_weight: pending.gross_weight,
        bananas: pending.bananas
      });
      setFormPieces(pending.pieces);
      setFormGross(pending.gross_weight);
      setCargoBananas(pending.bananas || []);
    } catch (err) {
      console.error('Error fetching pending cargo', err);
    }
  };

  // Fetch rates and history
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ratesRes, dispatchRes] = await Promise.all([
        axios.get('/rates/'),
        axios.get('/vehicles/')
      ]);
      setRates(ratesRes.data);
      setDispatches(dispatchRes.data);
      await fetchPendingCargo();
    } catch (err) {
      console.error('Error fetching logistics data', err);
      Modal.error({
        title: 'Network Error',
        content: 'Could not fetch logistics details from backend database.',
        borderRadius: 12
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update dynamic Net Weight in form
  useEffect(() => {
    const calculatedNet = Math.max(0.0, formGross - (formPieces * formRemovable));
    setFormNet(calculatedNet);
    form.setFieldsValue({ total_net_weight: calculatedNet.toFixed(2) });
  }, [formGross, formPieces, formRemovable]);

  // Form submit handler
  const handleDispatchSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        vehicle_no: values.vehicle_no,
        vehicle_type: values.vehicle_type,
        driver_name: values.driver_name,
        driver_phone: values.driver_phone,
        total_gross_weight: values.total_gross_weight,
        total_pieces: values.total_pieces,
        total_net_weight: parseFloat(formNet),
        bananas: values.bananas.join(', ')
      };

      await axios.post('/vehicles/', payload);
      
      Modal.success({
        title: 'Dispatch Logged Successfully',
        content: `Vehicle ${values.vehicle_no} loaded and registered in database.`,
        borderRadius: 12
      });
      
      form.resetFields();
      setFormRemovable(0.0);
      
      // Re-fetch cargo to reset form values to 0
      await fetchPendingCargo();
      
      // Refresh list
      const updated = await axios.get('/vehicles/');
      setDispatches(updated.data);
    } catch (err) {
      console.error('Error logging vehicle dispatch', err);
      Modal.error({
        title: 'Logging Dispatch Failed',
        content: err.response?.data ? JSON.stringify(err.response.data) : 'Database submission error.',
        borderRadius: 12
      });
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculations for the dashboard
  const today = new Date().toISOString().split('T')[0];
  const dispatchesToday = dispatches.filter(d => d.date === today);
  const totalVehiclesToday = dispatchesToday.length;
  const totalGrossToday = dispatchesToday.reduce((acc, curr) => acc + parseFloat(curr.total_gross_weight), 0.0);
  const totalNetToday = dispatchesToday.reduce((acc, curr) => acc + parseFloat(curr.total_net_weight), 0.0);
  const totalPiecesToday = dispatchesToday.reduce((acc, curr) => acc + curr.total_pieces, 0);

  // Columns for dispatches table
  const columns = [
    {
      title: 'Date/Time',
      key: 'datetime',
      width: 140,
      render: (_, record) => (
        <div>
          <Text style={{ fontWeight: 600, display: 'block' }}>{record.date}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.time}</Text>
        </div>
      )
    },
    {
      title: 'Vehicle Details',
      key: 'vehicle',
      width: 180,
      render: (_, record) => (
        <div>
          <Tag color="gold" style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{record.vehicle_no}</Tag>
          <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Type: {record.vehicle_type}</Text>
        </div>
      )
    },
    {
      title: 'Driver Details',
      key: 'driver',
      width: 180,
      render: (_, record) => (
        <div>
          <Text style={{ fontWeight: 500, display: 'block' }}>{record.driver_name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}><PhoneOutlined /> {record.driver_phone}</Text>
        </div>
      )
    },
    {
      title: 'Cargo Varieties',
      dataIndex: 'bananas',
      key: 'bananas',
      render: (text) => (
        <Space size={[0, 4]} wrap>
          {text.split(', ').map((type, idx) => (
            <Tag key={idx} color="purple">{type}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Pieces',
      dataIndex: 'total_pieces',
      key: 'total_pieces',
      align: 'center',
      width: 90,
      render: (text) => <Text style={{ fontWeight: 600 }}>{text}</Text>
    },
    {
      title: 'Weights (Kg)',
      key: 'weights',
      align: 'right',
      width: 180,
      render: (_, record) => (
        <div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>Gross: </Text>
            <Text style={{ fontWeight: 500 }}>{parseFloat(record.total_gross_weight).toFixed(2)} Kg</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>Net: </Text>
            <Text style={{ color: '#2ecc71', fontWeight: 700 }}>{parseFloat(record.total_net_weight).toFixed(2)} Kg</Text>
          </div>
        </div>
      )
    }
  ];

  // Filtering list locally based on unified search bar text
  const filteredDispatches = dispatches.filter(d => {
    const query = searchText.toLowerCase();
    return (
      d.vehicle_no.toLowerCase().includes(query) ||
      d.driver_name.toLowerCase().includes(query) ||
      d.vehicle_type.toLowerCase().includes(query) ||
      d.bananas.toLowerCase().includes(query) ||
      d.date.includes(query)
    );
  });

  return (
    <div style={{ padding: '4px' }}>
      {/* Top Header */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card className="glass-panel" style={{ padding: '4px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(246, 185, 59, 0.15)', borderRadius: '12px' }}>
                <CarOutlined style={{ fontSize: '28px', color: '#f6b93b' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Logistics & Cargo Loading Dispatch Terminal</Title>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                  Log driver cargo, track banana variety loads, and perform automated box tare weight calculations.
                </Paragraph>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Daily Metrics Dashboard Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" style={{ textAlign: 'center' }}>
            <Statistic
              title="Dispatches Today"
              value={totalVehiclesToday}
              prefix={<CarOutlined style={{ color: '#f6b93b' }} />}
              valueStyle={{ fontWeight: 800, color: '#f6b93b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" style={{ textAlign: 'center' }}>
            <Statistic
              title="Total Pieces Loaded"
              value={totalPiecesToday}
              prefix={<InboxOutlined style={{ color: '#8c7ae6' }} />}
              valueStyle={{ fontWeight: 800, color: '#8c7ae6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" style={{ textAlign: 'center' }}>
            <Statistic
              title="Total Gross Weight"
              value={totalGrossToday}
              precision={2}
              suffix="Kg"
              valueStyle={{ fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" style={{ textAlign: 'center', border: '1px solid rgba(46, 204, 113, 0.4)' }}>
            <Statistic
              title="Total Net Weight (Shipped)"
              value={totalNetToday}
              precision={2}
              suffix="Kg"
              valueStyle={{ fontWeight: 800, color: '#2ecc71' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Left Side: Create Dispatch Log */}
        <Col xs={24} lg={9}>
          <Card className="glass-panel" title={<span style={{ fontWeight: 700 }}>Log New Dispatch Cargo</span>}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleDispatchSubmit}
              initialValues={{
                removable_weight_per_piece: 0.0,
                total_pieces: 0,
                total_gross_weight: 0.0
              }}
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="vehicle_no"
                    label="Vehicle Plate Number"
                    rules={[{ required: true, message: 'Specify vehicle plate number!' }]}
                  >
                    <Input placeholder="e.g. TN-45-X-9876" style={{ textTransform: 'uppercase' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="vehicle_type"
                    label="Vehicle Type / Brand"
                    rules={[{ required: true, message: 'Specify vehicle type!' }]}
                  >
                    <Select placeholder="Select Type">
                      <Option value="Lorry">Lorry / Truck</Option>
                      <Option value="Tata Ace">Tata Ace</Option>
                      <Option value="Mahindra Bolero">Mahindra Bolero</Option>
                      <Option value="Mini Pickup">Mini Pickup</Option>
                      <Option value="Tractor">Tractor</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="driver_name"
                    label="Driver Full Name"
                    rules={[{ required: true, message: 'Driver name is required!' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Enter driver name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="driver_phone"
                    label="Driver Contact Phone"
                    rules={[
                      { required: true, message: 'Contact phone is required!' },
                      { pattern: /^\d{10}$/, message: 'Must be a 10 digit number!' }
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="10 digit number" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="bananas"
                label="Select Banana Varieties Loaded"
                rules={[{ required: true, message: 'Select at least 1 variety!' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select one or more banana varieties"
                  style={{ width: '100%' }}
                  allowClear
                >
                  {Array.from(new Set([
                    ...rates.map(r => r.banana_type),
                    ...cargoBananas
                  ])).map(b => (
                    <Option key={b} value={b}>{b}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Divider style={{ margin: '12px 0' }} />
              <Title level={5} style={{ marginBottom: '12px', fontWeight: 600 }}>Weight Calculations Engine</Title>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="total_pieces"
                    label="Pieces (Qty)"
                    rules={[{ required: true, message: 'Specify pieces count!' }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      onChange={(val) => setFormPieces(val || 0)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="removable_weight_per_piece"
                    label="Removable/Piece (Kg)"
                  >
                    <InputNumber
                      min={0.0}
                      step={0.1}
                      style={{ width: '100%' }}
                      onChange={(val) => setFormRemovable(val || 0.0)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="total_gross_weight"
                    label="Total Gross Weight (Kg)"
                    rules={[{ required: true, message: 'Gross weight is required!' }]}
                  >
                    <InputNumber
                      min={0.0}
                      step={0.1}
                      style={{ width: '100%' }}
                      onChange={(val) => setFormGross(val || 0.0)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="total_net_weight"
                    label="Calculated Net Cargo (Kg)"
                  >
                    <Input
                      disabled
                      style={{ width: '100%', fontWeight: 'bold', color: '#2ecc71' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Button
                type="primary"
                htmlType="submit"
                className="btn-primary"
                icon={<SaveOutlined />}
                block
                loading={loading}
                style={{ marginTop: '8px' }}
              >
                Log Dispatch Record
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right Side: Shipping History Log */}
        <Col xs={24} lg={15}>
          <Card
            className="glass-panel"
            title={<span style={{ fontWeight: 700 }}>Dispatched Logistics Registry</span>}
            extra={
              <Input
                placeholder="Search plate no, driver, variety..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 220 }}
                allowClear
              />
            }
          >
            <Table
              dataSource={filteredDispatches}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 6 }}
              loading={loading}
              size="small"
              bordered
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default VehicleLog;
