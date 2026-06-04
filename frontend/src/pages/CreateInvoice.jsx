import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Steps, Form, Input, Button, Row, Col, Divider, Select, Table, InputNumber, Space, Statistic, Tag, Modal, Typography, Spin 
} from 'antd';
import {
  UserOutlined, PhoneOutlined, GlobalOutlined, FieldTimeOutlined,
  PlusOutlined, DeleteOutlined, CalculatorOutlined, CheckOutlined,
  PrinterOutlined, DownloadOutlined, SaveOutlined, DashboardOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const CreateInvoice = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  
  // App States
  const [rates, setRates] = useState([]);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [initialPieceCount, setInitialPieceCount] = useState(10);
  
  // Grouped variety weighing tables
  const [weighingTables, setWeighingTables] = useState([
    {
      id: Date.now(),
      banana_type: undefined,
      rate: undefined,
      billing_method: 'weight',
      removable_weight_per_piece: 0.0,
      entries: [
        { key: 1, serial_no: 1, piece_count: 10, weight: null }
      ]
    }
  ]);
  
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paidAmount, setPaidAmount] = useState(0.0);
  const [paymentStatus, setPaymentStatus] = useState('not_settled');
  
  // Calculation variables
  const [totalPieces, setTotalPieces] = useState(0);
  const [totalGrossWeight, setTotalGrossWeight] = useState(0.0);
  const [totalRemovableWeight, setTotalRemovableWeight] = useState(0.0);
  const [netWeight, setNetWeight] = useState(0.0);
  const [finalAmount, setFinalAmount] = useState(0.0);
  const [balanceAmount, setBalanceAmount] = useState(0.0);

  // Saved result state
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);

  const invoicePrintRef = useRef(null);

  // Initial loads: Banana rates & current date/time
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await axios.get('/rates/');
        setRates(response.data);
      } catch (err) {
        console.error('Error fetching rates', err);
      }
    };
    fetchRates();

    // Auto set date and time
    const today = new Date();
    form.setFieldsValue({
      date: today.toISOString().split('T')[0],
      time: today.toTimeString().split(' ')[0]
    });
  }, []);

  // Sync Calculations
  useEffect(() => {
    let pieces = 0;
    let gross = 0.0;
    let totalRemov = 0.0;
    let net = 0.0;
    let totalAmt = 0.0;

    weighingTables.forEach(t_val => {
      let tablePieces = 0;
      let tableGross = 0.0;
      
      t_val.entries.forEach(e => {
        tablePieces += (e.piece_count || 0);
        tableGross += (e.weight ? parseFloat(e.weight) : 0.0);
      });

      if (t_val.billing_method === 'piece') {
        const tableSubtotal = tablePieces * (t_val.rate || 0.0);
        pieces += tablePieces;
        totalAmt += tableSubtotal;
      } else {
        const tableRemov = tablePieces * (t_val.removable_weight_per_piece || 0.0);
        const tableNet = Math.max(0.0, tableGross - tableRemov);
        const tableSubtotal = tableNet * (t_val.rate || 0.0);

        pieces += tablePieces;
        gross += tableGross;
        totalRemov += tableRemov;
        net += tableNet;
        totalAmt += tableSubtotal;
      }
    });

    setTotalPieces(pieces);
    setTotalGrossWeight(gross);
    setTotalRemovableWeight(totalRemov);
    setNetWeight(net);
    setFinalAmount(totalAmt);

    // Balance
    const bal = Math.max(0.0, totalAmt - paidAmount);
    setBalanceAmount(bal);

    // Auto set status based on balance
    if (bal <= 0 && totalAmt > 0) {
      setPaymentStatus('settled');
    } else if (paidAmount > 0 && bal > 0) {
      setPaymentStatus('partially_settled');
    } else {
      setPaymentStatus('not_settled');
    }
  }, [weighingTables, paidAmount]);

  const uniqueBananaTypes = Array.from(new Set(weighingTables.map(t_val => t_val.banana_type ? t_val.banana_type + (t_val.billing_method === 'piece' ? ' (Piece)' : '') : '').filter(Boolean))).join(', ');

  // Step 1 Finish
  const handleCustomerSubmit = (values) => {
    setCustomerInfo(values);
    setCurrentStep(1);
  };

  // Add a new variety table
  const addWeighingTable = () => {
    setWeighingTables([
      ...weighingTables,
      {
        id: Date.now(),
        banana_type: undefined,
        rate: undefined,
        billing_method: 'weight',
        removable_weight_per_piece: 0.0,
        entries: [
          { key: 1, serial_no: 1, piece_count: 10, weight: null }
        ]
      }
    ]);
  };

  // Delete a variety table
  const removeWeighingTable = (tableId) => {
    setWeighingTables(weighingTables.filter(t_val => t_val.id !== tableId));
  };

  // Add a row to a specific table
  const addRowToTable = (tableId) => {
    const targetTable = weighingTables.find(t_val => t_val.id === tableId);
    if (!targetTable) return;

    // VALIDATION: If weight billing method, check if any active row's weight is 0 or empty
    if (targetTable.billing_method === 'weight') {
      const hasEmptyOrZeroWeight = targetTable.entries.some(e => e.weight === null || e.weight === undefined || parseFloat(e.weight) === 0);
      if (hasEmptyOrZeroWeight) {
        Modal.error({
          title: t('logic_error_title'),
          content: t('zero_weight_error'),
          borderRadius: 12
        });
        return;
      }
    }

    const nextKey = targetTable.entries.length > 0 
      ? Math.max(...targetTable.entries.map(e => e.key)) + 1 
      : 1;
    const nextSerial = targetTable.entries.length + 1;

    const newRow = { key: nextKey, serial_no: nextSerial, piece_count: 10, weight: null };

    setWeighingTables(weighingTables.map(t_val => {
      if (t_val.id === tableId) {
        return {
          ...t_val,
          entries: [...t_val.entries, newRow]
        };
      }
      return t_val;
    }));
  };

  // Delete a row from a specific table
  const deleteRowFromTable = (tableId, rowKey) => {
    setWeighingTables(weighingTables.map(t_val => {
      if (t_val.id === tableId) {
        const filtered = t_val.entries.filter(e => e.key !== rowKey);
        // Re-calculate serial numbers
        const updated = filtered.map((e, idx) => ({
          ...e,
          serial_no: idx + 1
        }));
        return {
          ...t_val,
          entries: updated
        };
      }
      return t_val;
    }));
  };

  // Update field value in row
  const updateRowField = (tableId, rowKey, field, value) => {
    setWeighingTables(weighingTables.map(t_val => {
      if (t_val.id === tableId) {
        const updatedEntries = t_val.entries.map(e => {
          if (e.key === rowKey) {
            return { ...e, [field]: value };
          }
          return e;
        });
        return {
          ...t_val,
          entries: updatedEntries
        };
      }
      return t_val;
    }));
  };

  // Step 2 Proceed
  const handleWeighingSubmit = () => {
    // 1. Verify all sections have a selected Banana Variety
    const missingVariety = weighingTables.some(t_val => !t_val.banana_type);
    if (missingVariety) {
      Modal.error({
        title: t('logic_error_title'),
        content: 'Please select a Banana Variety type for all variety segments.',
        borderRadius: 12
      });
      return;
    }

    // 2. Verify all sections have a valid rate set
    const missingRate = weighingTables.some(t_val => t_val.rate === undefined || t_val.rate === null || t_val.rate < 0);
    if (missingRate) {
      Modal.error({
        title: t('logic_error_title'),
        content: 'Please configure a valid rate for all banana variety tables.',
        borderRadius: 12
      });
      return;
    }

    // 3. Row level validations (weight/pieces should be > 0 and not empty)
    for (const t_val of weighingTables) {
      if (t_val.billing_method === 'weight') {
        const invalidWeight = t_val.entries.some(e => e.weight === null || e.weight === undefined || parseFloat(e.weight) <= 0);
        if (invalidWeight) {
          Modal.error({
            title: t('logic_error_title'),
            content: `${t('invalid_weight_msg')} (${t_val.banana_type})`,
            borderRadius: 12
          });
          return;
        }
      }

      const invalidPieces = t_val.entries.some(e => e.piece_count === null || e.piece_count === undefined || parseInt(e.piece_count) <= 0);
      if (invalidPieces) {
        Modal.error({
          title: t('logic_error_title'),
          content: `${t('invalid_pieces_msg')} (${t_val.banana_type})`,
          borderRadius: 12
        });
        return;
      }
    }

    setCurrentStep(2);
  };

  // Step 4 Settle & Save API Action
  const handleSaveInvoice = async () => {
    setSaving(true);
    try {
      // 1. Create/Ensure Customer on Backend
      const custResponse = await axios.post('/customers/', {
        name: customerInfo.customer_name,
        phone: customerInfo.customer_phone,
        place: customerInfo.customer_place
      });
      const customerId = custResponse.data.id;

      // 2. Format weight entries payload
      const formattedEntries = [];
      weighingTables.forEach(t_val => {
        t_val.entries.forEach(e => {
          formattedEntries.push({
            banana_type: t_val.banana_type,
            billing_method: t_val.billing_method,
            rate: t_val.rate,
            serial_no: e.serial_no,
            piece_count: e.piece_count,
            weight: t_val.billing_method === 'piece' ? 0.0 : e.weight
          });
        });
      });

      // 3. Save invoice complete record
      const invoicePayload = {
        customer: customerId,
        date: form.getFieldValue('date'),
        time: form.getFieldValue('time'),
        removable_weight_per_piece: weighingTables[0]?.removable_weight_per_piece || 0.0,
        total_pieces: totalPieces,
        total_gross_weight: totalGrossWeight,
        total_removable_weight: totalRemovableWeight,
        net_weight: netWeight,
        final_amount: finalAmount,
        weight_entries: formattedEntries,
        payment_mode: paymentMode,
        paid_amount: paidAmount
      };

      const invResponse = await axios.post('/invoices/', invoicePayload);
      setSavedInvoice(invResponse.data);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      setCurrentStep(4);
    } catch (err) {
      console.error('Error saving invoice', err);
      Modal.error({
        title: 'Invoice Save Failure',
        content: err.response?.data?.error || 'Database connection error.',
        borderRadius: 12
      });
    } finally {
      setSaving(false);
    }
  };

  // PDF Download Action
  const downloadPDF = async () => {
    const element = invoicePrintRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice_${savedInvoice?.invoice_no}.pdf`);
    } catch (err) {
      console.error('Error rendering PDF', err);
    }
  };

  // Print invoice helper
  const printInvoice = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* STEPS TRAIL CARD */}
      <Card className="glass-panel" style={{ marginBottom: '24px', padding: '12px 0' }}>
        <Steps
          current={currentStep}
          responsive
          style={{ padding: '0 20px' }}
          items={[
            { title: t('step_customer') },
            { title: t('step_weighing') },
            { title: t('step_calculations') },
            { title: t('step_payments') },
            { title: t('step_invoice') }
          ]}
        />
      </Card>

      {/* STEP 1: CUSTOMER DETAILS */}
      {currentStep === 0 && (
        <Card className="glass-panel" title={`${t('step_customer')}`}>
          <Form
            form={form}
            layout="vertical"
            size="large"
            onFinish={handleCustomerSubmit}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_name"
                  label={t('customer_name')}
                  rules={[{ required: true, message: 'Customer Name is required!' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder={t('customer_name_placeholder')} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_phone"
                  label={t('customer_phone')}
                  rules={[{ required: true, message: 'Phone number is required!' }]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder={t('customer_phone_placeholder')} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  name="customer_place"
                  label={t('customer_place')}
                  rules={[{ required: true, message: 'Customer native place is required!' }]}
                >
                  <Input prefix={<GlobalOutlined />} placeholder={t('customer_place_placeholder')} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="date" label={t('date_auto')}>
                  <Input prefix={<FieldTimeOutlined />} disabled />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="time" label={t('time_auto')}>
                  <Input prefix={<FieldTimeOutlined />} disabled />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" htmlType="submit" className="btn-primary" icon={<CalculatorOutlined />}>
                {t('proceed_weighing')}
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* STEP 2: GROUPED WEIGHING TABLES */}
      {currentStep === 1 && (
        <Form layout="vertical">


          {/* Grouped variety tables */}
          {weighingTables.map((table, tIdx) => {
            const rowColumns = [
              {
                title: t('sno'),
                dataIndex: 'serial_no',
                key: 'serial_no',
                width: 70,
                render: (text) => <Text style={{ fontWeight: 600 }}>{text}</Text>
              },
              {
                title: table.billing_method === 'piece' ? t('pieces_qty') : t('pieces_bunches'),
                dataIndex: 'piece_count',
                key: 'piece_count',
                render: (text, record) => (
                  <InputNumber
                    min={1}
                    value={text}
                    onChange={(val) => updateRowField(table.id, record.key, 'piece_count', val || 1)}
                    style={{ width: '100%' }}
                  />
                )
              },
              ...(table.billing_method === 'weight' ? [
                {
                  title: t('weight_kg'),
                  dataIndex: 'weight',
                  key: 'weight',
                  render: (text, record) => (
                    <InputNumber
                      min={0.0}
                      step={0.1}
                      placeholder="0.0"
                      value={text === 0 ? null : text}
                      onChange={(val) => updateRowField(table.id, record.key, 'weight', val)}
                      style={{ width: '100%' }}
                    />
                  )
                }
              ] : []),
              {
                title: t('action'),
                key: 'action',
                width: 80,
                render: (_, record) => (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => deleteRowFromTable(table.id, record.key)}
                    disabled={table.entries.length === 1}
                  />
                )
              }
            ];

            const showRemovableWeight = table.billing_method === 'weight';

            return (
              <Card
                key={table.id}
                className="glass-panel"
                style={{ marginBottom: '24px' }}
                title={
                  <span style={{ fontWeight: 700 }}>
                    {t('variety_type')} - #{tIdx + 1}
                  </span>
                }
                extra={
                  weighingTables.length > 1 && (
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeWeighingTable(table.id)}>
                      Remove Section
                    </Button>
                  )
                }
              >
                {/* Table configs header */}
                <Row gutter={16} style={{ marginBottom: '16px' }}>
                  <Col xs={24} md={showRemovableWeight ? 6 : 8}>
                    <Form.Item label={t('variety_type')} required>
                      <Select
                        placeholder="Select variety"
                        value={table.banana_type}
                        onChange={(val) => {
                          setWeighingTables(weighingTables.map(t_val => 
                            t_val.id === table.id ? { ...t_val, banana_type: val, rate: undefined } : t_val
                          ));
                        }}
                        style={{ width: '100%' }}
                      >
                        {rates.map(r => (
                          <Option key={r.id} value={r.banana_type}>{r.banana_type}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={showRemovableWeight ? 6 : 8}>
                    <Form.Item label={t('billing_unit')} required>
                      <Select
                        value={table.billing_method}
                        onChange={(val) => {
                          setWeighingTables(weighingTables.map(t_val => 
                            t_val.id === table.id ? { ...t_val, billing_method: val } : t_val
                          ));
                        }}
                        style={{ width: '100%' }}
                      >
                        <Option value="weight">Per Kg (By Weight)</Option>
                        <Option value="piece">Per Piece (By Qty)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={showRemovableWeight ? 6 : 8}>
                    <Form.Item label={`${t('rate_per')} ${table.billing_method === 'piece' ? 'Piece' : 'Kg'} (Rs.)`} required>
                      <InputNumber
                        min={0.0}
                        placeholder="0.00"
                        value={table.rate}
                        onChange={(val) => {
                          setWeighingTables(weighingTables.map(t_val => 
                            t_val.id === table.id ? { ...t_val, rate: val } : t_val
                          ));
                        }}
                        style={{ width: '100%' }}
                        prefix="₹"
                      />
                    </Form.Item>
                  </Col>
                  {showRemovableWeight && (
                    <Col xs={24} md={6}>
                      <Form.Item label={t('removable_wt')}>
                        <InputNumber
                          min={0.0}
                          step={0.1}
                          value={table.removable_weight_per_piece}
                          onChange={(val) => {
                            setWeighingTables(weighingTables.map(t_val => 
                              t_val.id === table.id ? { ...t_val, removable_weight_per_piece: val || 0.0 } : t_val
                            ));
                          }}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  )}
                </Row>

                <Table
                  dataSource={table.entries}
                  columns={rowColumns}
                  pagination={false}
                  bordered
                  size="small"
                  style={{ marginBottom: '12px' }}
                />

                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => addRowToTable(table.id)}
                >
                  {t('add_row')}
                </Button>
              </Card>
            );
          })}

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={addWeighingTable}
            style={{ marginBottom: '24px', height: '48px', borderStyle: 'solid', borderWidth: '2px', borderColor: '#f6b93b', color: '#f6b93b' }}
          >
            {t('add_variety')}
          </Button>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)}>
              {t('back')}
            </Button>
            <Button type="primary" onClick={handleWeighingSubmit} className="btn-primary" icon={<CalculatorOutlined />}>
              {t('proceed_calc')}
            </Button>
          </div>
        </Form>
      )}

      {/* STEP 3: CALCULATIONS SUMMARY */}
      {currentStep === 2 && (
        <Card
          className="glass-panel"
          title={`${t('step_calculations')}`}
          extra={<Text type="secondary">{customerInfo?.customer_name} | {uniqueBananaTypes}</Text>}
        >
          {/* Variety subtotal breakdown list */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ fontWeight: 700, marginBottom: '12px' }}>{t('breakdown_title')}</Title>
            {weighingTables.map((t_val, idx) => {
              let pcs = 0;
              let gross = 0.0;
              t_val.entries.forEach(e => {
                pcs += (e.piece_count || 0);
                gross += (e.weight ? parseFloat(e.weight) : 0.0);
              });

              if (t_val.billing_method === 'piece') {
                const subtotal = pcs * (parseFloat(t_val.rate) || 0.0);
                return (
                  <div key={t_val.id} style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(140, 122, 230, 0.06)', borderRadius: '10px', border: '1px solid rgba(140, 122, 230, 0.15)' }}>
                    <Row align="middle" justify="space-between">
                      <Col span={8}>
                        <Text strong style={{ fontSize: '15px', color: '#8c7ae6' }}>{t_val.banana_type} (Piece)</Text>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>Rate: ₹{t_val.rate}/Piece</div>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: '12px' }}>
                          <Text type="secondary">{t('total_pieces')}:</Text> <Text strong>{pcs} Pieces</Text>
                        </div>
                      </Col>
                      <Col span={4} style={{ textAlign: 'right' }}>
                        <Text type="secondary">{t('subtotal')}:</Text>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#e5a92c' }}>₹{subtotal.toFixed(2)}</div>
                      </Col>
                    </Row>
                  </div>
                );
              }

              const remov = pcs * t_val.removable_weight_per_piece;
              const net = Math.max(0.0, gross - remov);
              const subtotal = net * (parseFloat(t_val.rate) || 0.0);

              return (
                <div key={t_val.id} style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(140, 122, 230, 0.06)', borderRadius: '10px', border: '1px solid rgba(140, 122, 230, 0.15)' }}>
                  <Row align="middle" justify="space-between">
                    <Col span={5}>
                      <Text strong style={{ fontSize: '15px', color: '#8c7ae6' }}>{t_val.banana_type || 'Variety'}</Text>
                      <div style={{ fontSize: '11px', opacity: 0.6 }}>Rate: ₹{t_val.rate}/Kg</div>
                    </Col>
                    <Col span={14}>
                      <Row gutter={8} style={{ fontSize: '12px' }}>
                        <Col span={5}>
                          <Text type="secondary">{t('pieces_qty').split(' ')[0]}:</Text> <Text strong>{pcs}</Text>
                        </Col>
                        <Col span={6}>
                          <Text type="secondary">{t('gross_weight').split(' ')[0]}:</Text> <Text strong>{gross.toFixed(2)} Kg</Text>
                        </Col>
                        <Col span={7}>
                          <Text type="secondary">{t('removable_weight').split(' ')[0]}:</Text> <Text strong>{remov.toFixed(2)} Kg</Text>
                        </Col>
                        <Col span={6}>
                          <Text type="secondary">{t('net_weight').split(' ')[0]}:</Text> <Text strong>{net.toFixed(2)} Kg</Text>
                        </Col>
                      </Row>
                    </Col>
                    <Col span={5} style={{ textAlign: 'right' }}>
                      <Text type="secondary">{t('subtotal')}:</Text>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#e5a92c' }}>₹{subtotal.toFixed(2)}</div>
                    </Col>
                  </Row>
                </div>
              );
            })}
          </div>

          <Title level={4} style={{ marginBottom: '16px', fontWeight: 700 }}>Calculation Summary Card</Title>
          
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={12} sm={8}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title={t('total_pieces')} value={totalPieces} suffix="Qty" />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title={t('total_gross')} value={totalGrossWeight} suffix="Kg" />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title={t('total_removable')} value={totalRemovableWeight} precision={2} suffix="Kg" />
              </Card>
            </Col>
            <Col xs={12} sm={12}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(46, 204, 113, 0.4)' }}>
                <Statistic title={t('net_weight')} value={netWeight} precision={2} suffix="Kg" valueStyle={{ color: '#2ecc71', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={12} sm={12}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(246, 185, 59, 0.4)' }}>
                <Statistic title={t('final_amount')} value={finalAmount} precision={2} prefix="₹" valueStyle={{ color: '#f6b93b', fontWeight: 700 }} />
              </Card>
            </Col>
          </Row>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(1)}>
              {t('back')}
            </Button>
            <Button type="primary" onClick={() => setCurrentStep(3)} className="btn-primary" icon={<CalculatorOutlined />}>
              {t('proceed_payments')}
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: PAYMENTS & SAVE */}
      {currentStep === 3 && (
        <Card
          className="glass-panel"
          title={`${t('step_payments')}`}
          extra={<Text type="secondary">{t('final_amount')}: ₹{finalAmount.toFixed(2)}</Text>}
        >
          <Form layout="vertical" size="large">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={t('payment_mode')}>
                  <Select value={paymentMode} onChange={(val) => setPaymentMode(val)} style={{ width: '100%' }}>
                    <Option value="cash">Cash</Option>
                    <Option value="upi">UPI</Option>
                    <Option value="bank_transfer">Bank Transfer</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={t('paid_amount')}>
                  <InputNumber
                    min={0.0}
                    max={finalAmount}
                    value={paidAmount}
                    onChange={(val) => setPaidAmount(val || 0.0)}
                    style={{ width: '100%' }}
                    prefix="₹"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col xs={12}>
                <Statistic title={t('balance_due')} value={balanceAmount} precision={2} prefix="₹" valueStyle={{ color: balanceAmount > 0 ? '#e74c3c' : '#2ecc71', fontWeight: 700 }} />
              </Col>
              <Col xs={12}>
                <Text style={{ display: 'block', marginBottom: '8px', opacity: 0.6 }}>{t('ledger_status')}</Text>
                {paymentStatus === 'settled' && <Tag color="success" style={{ fontSize: '14px', padding: '6px 12px' }}>{t('settled')}</Tag>}
                {paymentStatus === 'partially_settled' && <Tag color="warning" style={{ fontSize: '14px', padding: '6px 12px' }}>{t('partially_settled')}</Tag>}
                {paymentStatus === 'not_settled' && <Tag color="error" style={{ fontSize: '14px', padding: '6px 12px' }}>{t('not_settled')}</Tag>}
              </Col>
            </Row>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(2)}>
                {t('back')}
              </Button>
              <Button
                type="primary"
                onClick={handleSaveInvoice}
                loading={saving}
                className="btn-purple"
                icon={<SaveOutlined />}
              >
                {t('issue_bill')}
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* STEP 5: SAVE SUCCESS & DOWNLOAD / PRINT */}
      {currentStep === 4 && (
        <div className="fade-in-slide">
          <Card className="glass-panel" style={{ marginBottom: '24px', textAlign: 'center', background: 'rgba(46, 204, 113, 0.05)' }}>
            <CheckCircleOutlined style={{ fontSize: '56px', color: '#2ecc71', marginBottom: '16px' }} />
            <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Invoice Generated Successfully!</Title>
            <Paragraph type="secondary" style={{ marginTop: '8px' }}>
              Invoice Number: <Text strong>{savedInvoice?.invoice_no}</Text> has been written to database.
            </Paragraph>
            <Space style={{ marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button type="primary" onClick={printInvoice} icon={<PrinterOutlined />} className="btn-primary">
                Print Invoice
              </Button>
              <Button type="primary" onClick={downloadPDF} icon={<DownloadOutlined />} className="btn-purple">
                Download PDF
              </Button>
              <Button onClick={() => navigate('/dashboard')} icon={<DashboardOutlined />}>
                Go to Dashboard
              </Button>
            </Space>
          </Card>

          {/* PRINTABLE BILL SHEET LAYOUT */}
          <div className="printable-bill" ref={invoicePrintRef}>
            <div className="bill-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f6b93b', paddingBottom: '20px', marginBottom: '20px' }}>
              <div>
                <Title level={2} style={{ margin: 0, color: '#f6b93b', fontWeight: 800 }}>BANANA BILLING INVOICE</Title>
                <Text style={{ fontWeight: 600, fontSize: '14px', color: '#555' }}>Invoice No: {savedInvoice?.invoice_no}</Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Title level={4} style={{ margin: 0, color: '#333' }}>{user?.business_name || 'Banana Commission Agent'}</Title>
                <Text style={{ display: 'block' }}>Owner: {user?.name}</Text>
                <Text style={{ display: 'block' }}>Phone: {user?.phone}</Text>
                <Text style={{ display: 'block' }}>Place: {user?.native_place}, {user?.district}</Text>
              </div>
            </div>

            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={12}>
                <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <Text strong style={{ textTransform: 'uppercase', fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>Customer Details</Text>
                  <Text strong style={{ display: 'block', fontSize: '16px' }}>{customerInfo?.customer_name}</Text>
                  <Text style={{ display: 'block' }}>Phone: {customerInfo?.customer_phone}</Text>
                  <Text style={{ display: 'block' }}>Place: {customerInfo?.customer_place}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} className="bill-header-right" style={{ textAlign: 'right' }}>
                <div style={{ padding: '12px' }}>
                  <Text style={{ display: 'block' }}><Text strong>Banana Varieties:</Text> {uniqueBananaTypes}</Text>
                  <Text style={{ display: 'block' }}><Text strong>Date:</Text> {savedInvoice?.date}</Text>
                  <Text style={{ display: 'block' }}><Text strong>Time:</Text> {savedInvoice?.time}</Text>
                </div>
              </Col>
            </Row>

            {/* Weighing Tables Grouped by Variety */}
            {weighingTables.map((t, idx) => {
              let tablePieces = 0;
              let tableGross = 0.0;
              t.entries.forEach(e => {
                tablePieces += (e.piece_count || 0);
                tableGross += (e.weight ? parseFloat(e.weight) : 0.0);
              });
              
              const isPiece = t.billing_method === 'piece';

              if (isPiece) {
                const tableSubtotal = tablePieces * (parseFloat(t.rate) || 0.0);
                return (
                  <div key={t.id} style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#fafafa', padding: '6px 12px', border: '1px solid #ddd', borderBottom: 'none', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                      Variety Segment #{idx + 1}: {t.banana_type} (₹{(parseFloat(t.rate) || 0.0).toFixed(2)}/Piece)
                    </div>
                    <div className="bill-table-wrapper">
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
                            <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ddd', fontSize: '12px' }}>S.No</th>
                            <th style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ddd', fontSize: '12px' }}>Quantity (Pieces)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.entries.map((e, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '6px 10px', border: '1px solid #ddd', fontSize: '12px' }}>{e.serial_no}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ddd', fontSize: '12px' }}>{e.piece_count}</td>
                            </tr>
                          ))}
                          <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
                            <td style={{ padding: '6px 10px', border: '1px solid #ddd', fontSize: '12px' }}>Totals</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ddd', fontSize: '12px' }}>
                              Pieces: {tablePieces} | Subtotal: ₹{tableSubtotal.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              const tableRemov = tablePieces * t.removable_weight_per_piece;
              const tableNet = Math.max(0.0, tableGross - tableRemov);
              const tableSubtotal = tableNet * (parseFloat(t.rate) || 0.0);

              return (
                <div key={t.id} style={{ marginBottom: '20px' }}>
                  <div style={{ background: '#fafafa', padding: '6px 12px', border: '1px solid #ddd', borderBottom: 'none', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                    Variety Segment #{idx + 1}: {t.banana_type} (₹{(parseFloat(t.rate) || 0.0).toFixed(2)}/Kg)
                  </div>
                  <div className="bill-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ddd', fontSize: '12px' }}>S.No</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ddd', fontSize: '12px' }}>Pieces</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #ddd', fontSize: '12px' }}>Gross Weight (Kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.entries.map((e, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '6px 10px', border: '1px solid #ddd', fontSize: '12px' }}>{e.serial_no}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ddd', fontSize: '12px' }}>{e.piece_count}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #ddd', fontSize: '12px' }}>{e.weight ? parseFloat(e.weight).toFixed(2) : '0.00'}</td>
                          </tr>
                        ))}
                        <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
                          <td style={{ padding: '6px 10px', border: '1px solid #ddd', fontSize: '12px' }}>Totals</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ddd', fontSize: '12px' }}>{tablePieces}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #ddd', fontSize: '12px' }}>
                            Gross: {tableGross.toFixed(2)} | Net: {tableNet.toFixed(2)} | Subtotal: ₹{tableSubtotal.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Billing Engine Summary inside Invoice */}
            <Row gutter={16} style={{ marginTop: '30px' }}>
              <Col xs={24} md={12} style={{ marginBottom: '16px' }}>
                <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <Text strong style={{ textTransform: 'uppercase', fontSize: '11px', color: '#888', display: 'block', marginBottom: '6px' }}>Payment Mode & Settlement</Text>
                  <Text style={{ display: 'block' }}><Text strong>Payment Mode:</Text> {paymentMode.toUpperCase()}</Text>
                  <Text style={{ display: 'block' }}><Text strong>Amount Paid:</Text> ₹{paidAmount.toFixed(2)}</Text>
                  <Text style={{ display: 'block' }}><Text strong>Outstanding Due:</Text> ₹{balanceAmount.toFixed(2)}</Text>
                  <Text style={{ display: 'block', marginTop: '6px' }}>
                    <Text strong>Status: </Text>
                    <span style={{ fontWeight: 700, color: paymentStatus === 'settled' ? '#2e7d32' : paymentStatus === 'partially_settled' ? '#f57c00' : '#d32f2f' }}>
                      {paymentStatus.toUpperCase().replace('_', ' ')}
                    </span>
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="bill-summary-col" style={{ float: 'right', width: '280px', maxWidth: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Text>Total Pieces:</Text>
                    <Text strong>{totalPieces}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Text>Total Gross Weight:</Text>
                    <Text strong>{totalGrossWeight.toFixed(2)} Kg</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Text>Total Removable:</Text>
                    <Text strong>{totalRemovableWeight.toFixed(2)} Kg</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px solid #ddd', paddingTop: '4px' }}>
                    <Text strong>Net Weight:</Text>
                    <Text strong>{netWeight.toFixed(2)} Kg</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #333', paddingTop: '6px', marginTop: '4px' }}>
                    <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Final Amount:</Title>
                    <Title level={4} style={{ margin: 0, color: '#f6b93b', fontWeight: 800 }}>₹{finalAmount.toFixed(2)}</Title>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Signature Section */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '50px' }}>
              <div style={{ textAlign: 'center', width: '200px' }}>
                {user?.signature ? (
                  user.signature.startsWith('data:image') ? (
                    <img src={user.signature} alt="Owner Signature" style={{ maxHeight: '60px', maxWidth: '160px', marginBottom: '4px' }} />
                  ) : (
                    <div style={{ fontFamily: 'Dancing Script, cursive', fontSize: '20px', fontStyle: 'italic', color: '#555', marginBottom: '4px' }}>
                      {user.signature}
                    </div>
                  )
                ) : (
                  <div style={{ height: '50px', borderBottom: '1px dashed #aaa', marginBottom: '4px' }}></div>
                )}
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontWeight: 600, fontSize: '13px' }}>
                  Authorized Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateInvoice;
