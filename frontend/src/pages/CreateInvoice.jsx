import React, { useState, useEffect, useRef } from 'react';
import {
  Steps, Form, Input, Button, Card, Table, InputNumber, Select,
  Row, Col, Statistic, Alert, Space, Divider, Typography, Tag, Modal, Spin
} from 'antd';
import {
  UserOutlined, GlobalOutlined, PhoneOutlined, FieldTimeOutlined,
  PlusOutlined, DeleteOutlined, CalculatorOutlined, CheckCircleOutlined,
  PrinterOutlined, DownloadOutlined, SaveOutlined, DashboardOutlined, ShareAltOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const CreateInvoice = () => {
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
      rate: 0.0,
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
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);

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

    weighingTables.forEach(t => {
      let tablePieces = 0;
      let tableGross = 0.0;
      
      t.entries.forEach(e => {
        tablePieces += (e.piece_count || 0);
        tableGross += (e.weight ? parseFloat(e.weight) : 0.0);
      });

      if (t.billing_method === 'piece') {
        const tableSubtotal = tablePieces * (t.rate || 0.0);
        pieces += tablePieces;
        totalAmt += tableSubtotal;
      } else {
        const tableRemov = tablePieces * (t.removable_weight_per_piece || 0.0);
        const tableNet = Math.max(0.0, tableGross - tableRemov);
        const tableSubtotal = tableNet * (t.rate || 0.0);

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

  const uniqueBananaTypes = Array.from(new Set(weighingTables.map(t => t.banana_type ? t.banana_type + (t.billing_method === 'piece' ? ' (Piece)' : '') : '').filter(Boolean))).join(', ');

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
        id: Date.now() + Math.random(),
        banana_type: undefined,
        rate: 0.0,
        billing_method: 'weight',
        removable_weight_per_piece: 0.0,
        entries: [
          { key: 1, serial_no: 1, piece_count: initialPieceCount, weight: null }
        ]
      }
    ]);
  };

  // Remove a variety table
  const removeWeighingTable = (tableId) => {
    if (weighingTables.length === 1) return;
    setWeighingTables(weighingTables.filter(t => t.id !== tableId));
  };

  // Row update actions
  const updateRowField = (tableId, rowKey, field, value) => {
    setWeighingTables(weighingTables.map(t => {
      if (t.id === tableId) {
        const updatedEntries = t.entries.map(e => 
          e.key === rowKey ? { ...e, [field]: value } : e
        );
        return { ...t, entries: updatedEntries };
      }
      return t;
    }));
  };

  // Add row to table
  const addRowToTable = (tableId) => {
    setWeighingTables(weighingTables.map(t => {
      if (t.id === tableId) {
        const nextKey = t.entries.length > 0 ? Math.max(...t.entries.map(e => e.key)) + 1 : 1;
        const nextSNo = t.entries.length + 1;
        const defaultPieceCount = t.entries.length > 0 ? (t.entries[0].piece_count || initialPieceCount) : initialPieceCount;
        return {
          ...t,
          entries: [
            ...t.entries,
            { key: nextKey, serial_no: nextSNo, piece_count: defaultPieceCount, weight: null }
          ]
        };
      }
      return t;
    }));
  };

  // Delete row from table
  const deleteRowFromTable = (tableId, rowKey) => {
    setWeighingTables(weighingTables.map(t => {
      if (t.id === tableId) {
        if (t.entries.length === 1) return t;
        const filtered = t.entries.filter(e => e.key !== rowKey);
        const reindexed = filtered.map((e, idx) => ({
          ...e,
          key: idx + 1,
          serial_no: idx + 1
        }));
        return { ...t, entries: reindexed };
      }
      return t;
    }));
  };

  // Submit weighing tables
  const handleWeighingSubmit = () => {
    const missingVariety = weighingTables.some(t => !t.banana_type);
    if (missingVariety) {
      Modal.warning({
        title: 'Selection Required',
        content: 'Please specify the Banana Type variety for all active weighing tables.',
        borderRadius: 12
      });
      return;
    }
    setCurrentStep(2);
  };

  // Save full invoice to backend
  const handleSaveInvoice = async () => {
    setSaving(true);
    try {
      // 1. Create or Find Customer
      const custResponse = await axios.post('/customers/', {
        name: customerInfo.customer_name,
        place: customerInfo.customer_place,
        phone: customerInfo.customer_phone,
        banana_type: uniqueBananaTypes
      });
      const customerId = custResponse.data.id;

      // Prepare weight entries flat list
      let serialIndex = 1;
      const flatEntries = weighingTables.flatMap(t => 
        t.entries.map(e => ({
          serial_no: serialIndex++,
          banana_type: t.banana_type + (t.billing_method === 'piece' ? ' (Piece)' : ''),
          rate: t.rate || 0.0,
          piece_count: e.piece_count,
          weight: t.billing_method === 'piece' ? 0.0 : (e.weight || 0.0)
        }))
      );

      // 2. Prepare payload
      const invoicePayload = {
        customer: customerId,
        total_pieces: totalPieces,
        gross_weight: totalGrossWeight,
        removable_weight_per_piece: weighingTables[0]?.removable_weight_per_piece || 0.0, // fallback
        total_removable_weight: totalRemovableWeight,
        net_weight: netWeight,
        rate: null,
        final_amount: finalAmount,
        payment_status: paymentStatus,
        weight_entries: flatEntries,
        payments: [
          {
            payment_mode: paymentMode,
            paid_amount: paidAmount,
            balance_amount: balanceAmount,
            status: paymentStatus
          }
        ]
      };

      // 3. Save Invoice
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
        title: 'Error Saving Invoice',
        content: err.response?.data ? JSON.stringify(err.response.data) : 'Network error. Could not write to PostgreSQL.',
        borderRadius: 12
      });
    } finally {
      setSaving(false);
    }
  };

  // PDF Export
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
      pdf.save(`Invoice_${savedInvoice?.invoice_no || 'BANANA'}.pdf`);
    } catch (err) {
      console.error('Error rendering PDF', err);
    }
  };

  // Print Invoice
  const printInvoice = () => {
    window.print();
  };

  // Share invoice (uses native navigator.share if possible, falls back to custom options)
  const shareInvoice = async () => {
    const element = invoicePrintRef.current;
    if (!element) return;
    
    setSharing(true);
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
      
      const pdfBlob = pdf.output('blob');
      const filename = `Invoice_${savedInvoice?.invoice_no || 'BANANA'}.pdf`;
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${savedInvoice?.invoice_no}`,
          text: `Please find attached the banana purchase invoice from ${user?.business_name || 'Banana Commission Agent'}.`,
        });
      } else {
        // Fallback: Open sharing options Modal
        setIsShareModalVisible(true);
      }
    } catch (err) {
      console.error('Error in Web Share API', err);
      // Fallback: Open sharing options Modal
      setIsShareModalVisible(true);
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsAppShare = () => {
    const phone = customerInfo?.customer_phone || '';
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    
    const textMessage = `Hello *${customerInfo?.customer_name}*,\n\nHere is your banana billing invoice summary from *${user?.business_name || 'Banana Agent'}*:\n\n📄 *Invoice No:* ${savedInvoice?.invoice_no}\n📅 *Date:* ${savedInvoice?.date}\n🍌 *Varieties:* ${uniqueBananaTypes}\n🔢 *Total Pieces:* ${totalPieces} Qty\n⚖️ *Net Weight:* ${netWeight.toFixed(2)} Kg\n💰 *Final Amount:* ₹${finalAmount.toFixed(2)}\n💸 *Balance Due:* ₹${balanceAmount.toFixed(2)}\n💳 *Status:* ${paymentStatus.toUpperCase().replace('_', ' ')}\n\nThank you for your business!`;
    
    const encodedText = encodeURIComponent(textMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    setIsShareModalVisible(false);
  };

  const copyReceiptToClipboard = () => {
    const textMessage = `Hello ${customerInfo?.customer_name},\n\nHere is your banana billing invoice summary from ${user?.business_name || 'Banana Agent'}:\n\nInvoice No: ${savedInvoice?.invoice_no}\nDate: ${savedInvoice?.date}\nVarieties: ${uniqueBananaTypes}\nTotal Pieces: ${totalPieces} Qty\nNet Weight: ${netWeight.toFixed(2)} Kg\nFinal Amount: ₹${finalAmount.toFixed(2)}\nBalance Due: ₹${balanceAmount.toFixed(2)}\nStatus: ${paymentStatus.toUpperCase().replace('_', ' ')}\n\nThank you for your business!`;
    
    navigator.clipboard.writeText(textMessage);
    Modal.success({
      title: 'Receipt Copied',
      content: 'Billing receipt text copied to clipboard successfully!',
      borderRadius: 12
    });
    setIsShareModalVisible(false);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <Card className="glass-panel" style={{ marginBottom: '24px', padding: '10px 0' }}>
        <Steps
          current={currentStep}
          responsive
          style={{ padding: '0 20px' }}
          items={[
            { title: 'Customer Details' },
            { title: 'Weighing Terminals' },
            { title: 'Calculations' },
            { title: 'Payments' },
            { title: 'Issued Invoice' }
          ]}
        />
      </Card>

      {/* STEP 1: CUSTOMER DETAILS */}
      {currentStep === 0 && (
        <Card className="glass-panel" title="Step 1: Enter Customer Credentials">
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
                  label="Customer Name"
                  rules={[{ required: true, message: 'Customer Name is required!' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Enter name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_phone"
                  label="Customer Phone Number"
                  rules={[{ required: true, message: 'Phone number is required!' }]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="Enter phone" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  name="customer_place"
                  label="Customer Place / Address"
                  rules={[{ required: true, message: 'Customer native place is required!' }]}
                >
                  <Input prefix={<GlobalOutlined />} placeholder="Enter native place" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="date" label="Date (Auto Generated)">
                  <Input prefix={<FieldTimeOutlined />} disabled />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="time" label="Time (Auto Generated)">
                  <Input prefix={<FieldTimeOutlined />} disabled />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" htmlType="submit" className="btn-primary" icon={<CalculatorOutlined />}>
                Proceed to Weighing
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
                title: 'S.No',
                dataIndex: 'serial_no',
                key: 'serial_no',
                width: 70,
                render: (text) => <Text style={{ fontWeight: 600 }}>{text}</Text>
              },
              {
                title: table.billing_method === 'piece' ? 'Banana Pieces (Qty)' : 'Piece Count / Bunches',
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
                  title: 'Weight (Kg)',
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
                title: 'Action',
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
                    Banana Variety weighing Section #{tIdx + 1}
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
                    <Form.Item label="Banana Variety Type" required>
                      <Select
                        placeholder="Select variety"
                        value={table.banana_type}
                        onChange={(val) => {
                          const matched = rates.find(r => r.banana_type === val);
                          const rateVal = matched ? parseFloat(matched.rate) : 0.0;
                          setWeighingTables(weighingTables.map(t => 
                            t.id === table.id ? { ...t, banana_type: val, rate: rateVal } : t
                          ));
                        }}
                        style={{ width: '100%' }}
                      >
                        {rates.map(r => (
                          <Option key={r.id} value={r.banana_type}>{r.banana_type} (Rs.{r.rate}/kg)</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={showRemovableWeight ? 6 : 8}>
                    <Form.Item label="Billing Unit" required>
                      <Select
                        value={table.billing_method}
                        onChange={(val) => {
                          setWeighingTables(weighingTables.map(t => 
                            t.id === table.id ? { ...t, billing_method: val } : t
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
                    <Form.Item label={`Rate per ${table.billing_method === 'piece' ? 'Piece' : 'Kg'} (Rs.)`} required>
                      <InputNumber
                        min={0.0}
                        value={table.rate}
                        onChange={(val) => {
                          setWeighingTables(weighingTables.map(t => 
                            t.id === table.id ? { ...t, rate: val || 0.0 } : t
                          ));
                        }}
                        style={{ width: '100%' }}
                        prefix="₹"
                      />
                    </Form.Item>
                  </Col>
                  {showRemovableWeight && (
                    <Col xs={24} md={6}>
                      <Form.Item label="Removable weight per Piece (Kg)">
                        <InputNumber
                          min={0.0}
                          step={0.1}
                          value={table.removable_weight_per_piece}
                          onChange={(val) => {
                            setWeighingTables(weighingTables.map(t => 
                              t.id === table.id ? { ...t, removable_weight_per_piece: val || 0.0 } : t
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
                  Add Row to this variety table
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
            Add another banana variety table (+ Group)
          </Button>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)}>
              Back
            </Button>
            <Button type="primary" onClick={handleWeighingSubmit} className="btn-primary" icon={<CalculatorOutlined />}>
              Process Calculations
            </Button>
          </div>
        </Form>
      )}

      {/* STEP 3: CALCULATIONS SUMMARY */}
      {currentStep === 2 && (
        <Card
          className="glass-panel"
          title="Step 3: Calculation & Weight Removals"
          extra={<Text type="secondary">{customerInfo?.customer_name} | {uniqueBananaTypes}</Text>}
        >
          {/* Variety subtotal breakdown list */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ fontWeight: 700, marginBottom: '12px' }}>Deductions & Rates breakdown per variety</Title>
            {weighingTables.map((t, idx) => {
              let pcs = 0;
              let gross = 0.0;
              t.entries.forEach(e => {
                pcs += (e.piece_count || 0);
                gross += (e.weight ? parseFloat(e.weight) : 0.0);
              });

              if (t.billing_method === 'piece') {
                const subtotal = pcs * (parseFloat(t.rate) || 0.0);
                return (
                  <div key={t.id} style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(140, 122, 230, 0.06)', borderRadius: '10px', border: '1px solid rgba(140, 122, 230, 0.15)' }}>
                    <Row align="middle" justify="space-between">
                      <Col span={8}>
                        <Text strong style={{ fontSize: '15px', color: '#8c7ae6' }}>{t.banana_type} (Piece)</Text>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>Rate: ₹{t.rate}/Piece</div>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: '12px' }}>
                          <Text type="secondary">Total Quantity:</Text> <Text strong>{pcs} Pieces</Text>
                        </div>
                      </Col>
                      <Col span={4} style={{ textAlign: 'right' }}>
                        <Text type="secondary">Subtotal:</Text>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#e5a92c' }}>₹{subtotal.toFixed(2)}</div>
                      </Col>
                    </Row>
                  </div>
                );
              }

              const remov = pcs * t.removable_weight_per_piece;
              const net = Math.max(0.0, gross - remov);
              const subtotal = net * (parseFloat(t.rate) || 0.0);

              return (
                <div key={t.id} style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(140, 122, 230, 0.06)', borderRadius: '10px', border: '1px solid rgba(140, 122, 230, 0.15)' }}>
                  <Row align="middle" justify="space-between">
                    <Col span={6}>
                      <Text strong style={{ fontSize: '15px', color: '#8c7ae6' }}>{t.banana_type || 'Variety'}</Text>
                      <div style={{ fontSize: '11px', opacity: 0.6 }}>Rate: ₹{t.rate}/Kg</div>
                    </Col>
                    <Col span={14}>
                      <Row gutter={8} style={{ fontSize: '12px' }}>
                        <Col span={6}>
                          <Text type="secondary">Pieces:</Text> <Text strong>{pcs}</Text>
                        </Col>
                        <Col span={9}>
                          <Text type="secondary">Gross Weight:</Text> <Text strong>{gross.toFixed(2)} Kg</Text>
                        </Col>
                        <Col span={9}>
                          <Text type="secondary">Removable Weight:</Text> <Text strong>{remov.toFixed(2)} Kg</Text>
                        </Col>
                      </Row>
                    </Col>
                    <Col span={4} style={{ textAlign: 'right' }}>
                      <Text type="secondary">Subtotal:</Text>
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
                <Statistic title="Total Pieces" value={totalPieces} suffix="Qty" />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title="Total Gross Weight" value={totalGrossWeight} suffix="Kg" />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title="Total Removable" value={totalRemovableWeight} precision={2} suffix="Kg" />
              </Card>
            </Col>
            <Col xs={12} sm={12}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(46, 204, 113, 0.4)' }}>
                <Statistic title="Net Weight" value={netWeight} precision={2} suffix="Kg" valueStyle={{ color: '#2ecc71', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={12} sm={12}>
              <Card size="small" style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(246, 185, 59, 0.4)' }}>
                <Statistic title="Final Amount" value={finalAmount} precision={2} prefix="₹" valueStyle={{ color: '#f6b93b', fontWeight: 700 }} />
              </Card>
            </Col>
          </Row>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button type="primary" onClick={() => setCurrentStep(3)} className="btn-primary" icon={<CalculatorOutlined />}>
              Proceed to Payments
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: PAYMENTS & SAVE */}
      {currentStep === 3 && (
        <Card
          className="glass-panel"
          title="Step 4: Settle Ledger & Payment Status"
          extra={<Text type="secondary">Total Bill: ₹{finalAmount.toFixed(2)}</Text>}
        >
          <Form layout="vertical" size="large">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Payment Mode">
                  <Select value={paymentMode} onChange={(val) => setPaymentMode(val)} style={{ width: '100%' }}>
                    <Option value="cash">Cash</Option>
                    <Option value="upi">UPI</Option>
                    <Option value="bank_transfer">Bank Transfer</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Paid Amount (Rs.)">
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
                <Statistic title="Balance Amount Due" value={balanceAmount} precision={2} prefix="₹" valueStyle={{ color: balanceAmount > 0 ? '#e74c3c' : '#2ecc71', fontWeight: 700 }} />
              </Col>
              <Col xs={12}>
                <Text style={{ display: 'block', marginBottom: '8px', opacity: 0.6 }}>Payment Ledger Status</Text>
                {paymentStatus === 'settled' && <Tag color="success" style={{ fontSize: '14px', padding: '6px 12px' }}>SETTLED</Tag>}
                {paymentStatus === 'partially_settled' && <Tag color="warning" style={{ fontSize: '14px', padding: '6px 12px' }}>PARTIALLY SETTLED</Tag>}
                {paymentStatus === 'not_settled' && <Tag color="error" style={{ fontSize: '14px', padding: '6px 12px' }}>NOT SETTLED</Tag>}
              </Col>
            </Row>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button
                type="primary"
                onClick={handleSaveInvoice}
                loading={saving}
                className="btn-purple"
                icon={<SaveOutlined />}
              >
                Save Invoice & Generate Bill
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
              <Button type="primary" onClick={shareInvoice} loading={sharing} icon={<ShareAltOutlined />} style={{ background: '#2ecc71', borderColor: '#2ecc71', color: '#fff', borderRadius: '10px' }}>
                Share Invoice
              </Button>
              <Button onClick={() => navigate('/dashboard')} icon={<DashboardOutlined />}>
                Go to Dashboard
              </Button>
            </Space>
          </Card>

          {/* Share Options Modal */}
          <Modal
            title={<span style={{ fontWeight: 700 }}>Share Bill Options</span>}
            open={isShareModalVisible}
            onCancel={() => setIsShareModalVisible(false)}
            footer={null}
            borderRadius={12}
            width={400}
            className="no-print"
          >
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <Paragraph>Select how you want to share the bill with <strong>{customerInfo?.customer_name}</strong>:</Paragraph>
              <Space direction="vertical" style={{ width: '100%', marginTop: '10px' }} size="middle">
                <Button 
                  type="primary" 
                  block 
                  icon={<ShareAltOutlined />} 
                  onClick={async () => {
                    setIsShareModalVisible(false);
                    const element = invoicePrintRef.current;
                    if (element) {
                      try {
                        const canvas = await html2canvas(element, { scale: 1.5, useCORS: true });
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const imgWidth = 210;
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;
                        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
                        const file = new File([pdf.output('blob')], `Invoice_${savedInvoice?.invoice_no}.pdf`, { type: 'application/pdf' });
                        if (navigator.share) {
                          await navigator.share({ files: [file] });
                        } else {
                          Modal.info({ title: 'Not Supported', content: 'Native PDF sharing is not supported by your browser.' });
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  style={{ height: '45px', background: '#3498db', borderColor: '#3498db' }}
                  disabled={!navigator.share}
                >
                  Share PDF File via Apps
                </Button>
                <Button 
                  type="primary" 
                  block 
                  icon={<PhoneOutlined />} 
                  onClick={handleWhatsAppShare}
                  style={{ height: '45px', background: '#2ecc71', borderColor: '#2ecc71' }}
                >
                  Send Bill to Customer Phone (WhatsApp)
                </Button>
                <Button 
                  block 
                  onClick={copyReceiptToClipboard}
                  style={{ height: '45px' }}
                >
                  Copy Text Bill Summary to Clipboard
                </Button>
              </Space>
            </div>
          </Modal>

          {/* PRINTABLE BILL SHEET LAYOUT */}
          <div style={{ background: '#fff', color: '#000', padding: '30px', borderRadius: '12px', border: '1px solid #ddd', maxWidth: '850px', margin: '0 auto' }} ref={invoicePrintRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f6b93b', paddingBottom: '20px', marginBottom: '20px' }}>
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
              <Col span={12}>
                <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <Text strong style={{ textTransform: 'uppercase', fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>Customer Details</Text>
                  <Text strong style={{ display: 'block', fontSize: '16px' }}>{customerInfo?.customer_name}</Text>
                  <Text style={{ display: 'block' }}>Phone: {customerInfo?.customer_phone}</Text>
                  <Text style={{ display: 'block' }}>Place: {customerInfo?.customer_place}</Text>
                </div>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
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
              );
            })}

            {/* Billing Engine Summary inside Invoice */}
            <Row gutter={16} style={{ marginTop: '30px' }}>
              <Col span={12}>
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
              <Col span={12}>
                <div style={{ float: 'right', width: '280px' }}>
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
