import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Button, Space, Divider, Form, InputNumber, Select, Modal, Spin, Alert } from 'antd';
import { PrinterOutlined, DownloadOutlined, ArrowLeftOutlined, CreditCardOutlined, SaveOutlined, ShareAltOutlined, PhoneOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  
  // Payment recording state
  const [paymentForm] = Form.useForm();
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);

  const invoicePrintRef = useRef(null);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/invoices/${id}/`);
      setInvoice(response.data);
    } catch (err) {
      console.error('Error fetching invoice details', err);
      setError('Could not retrieve invoice details from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const handleUpdatePayment = async (values) => {
    setUpdatingPayment(true);
    try {
      const response = await axios.post(`/invoices/${id}/update_payment/`, {
        paid_amount: values.paid_amount,
        payment_mode: values.payment_mode
      });
      setInvoice(response.data);
      setIsPaymentModalVisible(false);
      paymentForm.resetFields();
      Modal.success({
        title: 'Payment Registered',
        content: 'Payment recorded and balance recalculated successfully!',
        borderRadius: 12
      });
    } catch (err) {
      console.error('Error recording payment', err);
      Modal.error({
        title: 'Payment Update Failed',
        content: err.response?.data?.error || 'Database connection error.',
        borderRadius: 12
      });
    } finally {
      setUpdatingPayment(false);
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
      const imgWidth = 210; // A4 size width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice_${invoice?.invoice_no}.pdf`);
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
      const filename = `Invoice_${invoice?.invoice_no || 'BANANA'}.pdf`;
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${invoice?.invoice_no}`,
          text: `Please find attached the banana purchase invoice from ${invoice.owner_details?.business_name || 'Banana Commission Agent'}.`,
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
    const customer = invoice?.customer_details;
    const owner = invoice?.owner_details;
    const phone = customer?.phone || '';
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    
    const entries = invoice?.weight_entries || [];
    const bananaTypes = Array.from(new Set(entries.map(e => e.banana_type).filter(Boolean))).join(', ');
    const finalAmt = parseFloat(invoice?.final_amount || 0);
    const netWt = parseFloat(invoice?.net_weight || 0);
    
    const textMessage = `Hello *${customer?.name}*,\n\nHere is your banana billing invoice summary from *${owner?.business_name || 'Banana Agent'}*:\n\n📄 *Invoice No:* ${invoice?.invoice_no}\n📅 *Date:* ${invoice?.date}\n🍌 *Varieties:* ${bananaTypes}\n🔢 *Total Pieces:* ${invoice?.total_pieces} Qty\n⚖️ *Net Weight:* ${netWt.toFixed(2)} Kg\n💰 *Final Amount:* ₹${finalAmt.toFixed(2)}\n💸 *Balance Due:* ₹${outstandingBalance.toFixed(2)}\n💳 *Status:* ${invoice?.payment_status.toUpperCase().replace('_', ' ')}\n\nThank you for your business!`;
    
    const encodedText = encodeURIComponent(textMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    setIsShareModalVisible(false);
  };

  const copyReceiptToClipboard = () => {
    const customer = invoice?.customer_details;
    const owner = invoice?.owner_details;
    const entries = invoice?.weight_entries || [];
    const bananaTypes = Array.from(new Set(entries.map(e => e.banana_type).filter(Boolean))).join(', ');
    const finalAmt = parseFloat(invoice?.final_amount || 0);
    const netWt = parseFloat(invoice?.net_weight || 0);
    
    const textMessage = `Hello ${customer?.name},\n\nHere is your banana billing invoice summary from ${owner?.business_name || 'Banana Agent'}:\n\nInvoice No: ${invoice?.invoice_no}\nDate: ${invoice?.date}\nVarieties: ${bananaTypes}\nTotal Pieces: ${invoice?.total_pieces} Qty\nNet Weight: ${netWt.toFixed(2)} Kg\nFinal Amount: ₹${finalAmt.toFixed(2)}\nBalance Due: ₹${outstandingBalance.toFixed(2)}\nStatus: ${invoice?.payment_status.toUpperCase().replace('_', ' ')}\n\nThank you for your business!`;
    
    navigator.clipboard.writeText(textMessage);
    Modal.success({
      title: 'Receipt Copied',
      content: 'Billing receipt text copied to clipboard successfully!',
      borderRadius: 12
    });
    setIsShareModalVisible(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Retrieving invoice details sheet..." />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/history')} style={{ marginBottom: '16px' }}>Back to History</Button>
        <Alert message={error || 'Invoice not found'} type="error" showIcon style={{ borderRadius: '12px' }} />
      </div>
    );
  }

  const weighingEntries = invoice.weight_entries || [];
  const uniqueBananaTypes = Array.from(new Set(weighingEntries.map(e => e.banana_type).filter(Boolean))).join(', ');

  const groupedEntries = weighingEntries.reduce((acc, curr) => {
    const type = curr.banana_type || 'Unknown Variety';
    if (!acc[type]) {
      acc[type] = {
        banana_type: type,
        rate: parseFloat(curr.rate || 0.0),
        entries: []
      };
    }
    acc[type].entries.push(curr);
    return acc;
  }, {});

  const groupedList = Object.values(groupedEntries);
  
  // Calculate remaining balance dynamically from the details
  const finalAmount = parseFloat(invoice.final_amount);
  const totalPaid = (invoice.payments || []).reduce((acc, curr) => acc + parseFloat(curr.paid_amount || 0.0), 0.0);
  const outstandingBalance = Math.max(0.0, finalAmount - totalPaid);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/history')}>
          Back to History
        </Button>
        
        <Space style={{ flexWrap: 'wrap' }}>
          {outstandingBalance > 0 && (
            <Button
              type="primary"
              icon={<CreditCardOutlined />}
              onClick={() => setIsPaymentModalVisible(true)}
              className="btn-purple"
            >
              Collect Payment (Due: ₹{outstandingBalance.toFixed(2)})
            </Button>
          )}
          <Button icon={<PrinterOutlined />} onClick={printInvoice}>
            Print
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} className="btn-primary" onClick={downloadPDF}>
            Download PDF
          </Button>
          <Button type="primary" icon={<ShareAltOutlined />} style={{ background: '#2ecc71', borderColor: '#2ecc71', color: '#fff', borderRadius: '10px' }} onClick={shareInvoice} loading={sharing}>
            Share
          </Button>
        </Space>
      </div>

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
          <Paragraph>Select how you want to share this bill with <strong>{invoice.customer_details?.name}</strong>:</Paragraph>
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
                    const file = new File([pdf.output('blob')], `Invoice_${invoice?.invoice_no}.pdf`, { type: 'application/pdf' });
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
      <div style={{ background: '#fff', color: '#000', padding: '30px', borderRadius: '12px', border: '1px solid #ddd' }} ref={invoicePrintRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f6b93b', paddingBottom: '20px', marginBottom: '20px' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#f6b93b', fontWeight: 800 }}>BANANA BILLING INVOICE</Title>
            <Text style={{ fontWeight: 600, fontSize: '14px', color: '#555' }}>Invoice No: {invoice.invoice_no}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Title level={4} style={{ margin: 0, color: '#333' }}>{invoice.owner_details?.business_name || 'Banana Commission Agent'}</Title>
            <Text style={{ display: 'block' }}>Owner: {invoice.owner_details?.name || invoice.owner_details?.username}</Text>
            <Text style={{ display: 'block' }}>Phone: {invoice.owner_details?.phone}</Text>
            <Text style={{ display: 'block' }}>Place: {invoice.owner_details?.native_place}, {invoice.owner_details?.district}</Text>
          </div>
        </div>

        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={12}>
            <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
              <Text strong style={{ textTransform: 'uppercase', fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>Customer Details</Text>
              <Text strong style={{ display: 'block', fontSize: '16px' }}>{invoice.customer_details?.name}</Text>
              <Text style={{ display: 'block' }}>Phone: {invoice.customer_details?.phone}</Text>
              <Text style={{ display: 'block' }}>Place: {invoice.customer_details?.place}</Text>
            </div>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <div style={{ padding: '12px' }}>
              <Text style={{ display: 'block' }}><Text strong>Banana Type(s):</Text> {uniqueBananaTypes || invoice.customer_details?.banana_type || 'N/A'}</Text>
              <Text style={{ display: 'block' }}><Text strong>Date:</Text> {invoice.date}</Text>
              <Text style={{ display: 'block' }}><Text strong>Time:</Text> {invoice.time}</Text>
            </div>
          </Col>
        </Row>

        {/* Weighing Tables Grouped by Variety */}
        {groupedList.map((t, idx) => {
          let tablePieces = 0;
          let tableGross = 0.0;
          t.entries.forEach(e => {
            tablePieces += (parseInt(e.piece_count) || 0);
            tableGross += (e.weight ? parseFloat(e.weight) : 0.0);
          });

          const isPiece = t.entries.every(e => parseFloat(e.weight || 0.0) === 0.0) || t.banana_type.includes('(Piece)');

          if (isPiece) {
            const tableSubtotal = tablePieces * t.rate;
            return (
              <div key={idx} style={{ marginBottom: '20px' }}>
                <div style={{ background: '#fafafa', padding: '6px 12px', border: '1px solid #ddd', borderBottom: 'none', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                  Variety Segment #{idx + 1}: {t.banana_type} (₹{t.rate.toFixed(2)}/Piece)
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
                      <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ddd', fontSize: '12px' }}>{tablePieces}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #ddd', fontSize: '12px' }}>
                        Subtotal: ₹{tableSubtotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          }

          const tableRemov = tablePieces * parseFloat(invoice.removable_weight_per_piece || 0.0);
          const tableNet = Math.max(0.0, tableGross - tableRemov);
          const tableSubtotal = tableNet * t.rate;

          return (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <div style={{ background: '#fafafa', padding: '6px 12px', border: '1px solid #ddd', borderBottom: 'none', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                Variety Segment #{idx + 1}: {t.banana_type} (₹{t.rate.toFixed(2)}/Kg)
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

        {/* Calculations and payment lists */}
        <Row gutter={16} style={{ marginBottom: '30px' }}>
          <Col span={12}>
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '12px' }}>
              <Text strong style={{ textTransform: 'uppercase', fontSize: '11px', color: '#888', display: 'block', marginBottom: '6px' }}>Payment Ledger Settings</Text>
              <Text style={{ display: 'block' }}><Text strong>Total Cost:</Text> ₹{finalAmount.toFixed(2)}</Text>
              <Text style={{ display: 'block' }}><Text strong>Total Collected:</Text> ₹{totalPaid.toFixed(2)}</Text>
              <Text style={{ display: 'block' }}><Text strong>Outstanding Due:</Text> ₹{outstandingBalance.toFixed(2)}</Text>
              <Text style={{ display: 'block', marginTop: '6px' }}>
                <Text strong>Status: </Text>
                <span style={{ fontWeight: 700, color: invoice.payment_status === 'settled' ? '#2e7d32' : invoice.payment_status === 'partially_settled' ? '#f57c00' : '#d32f2f' }}>
                  {invoice.payment_status.toUpperCase().replace('_', ' ')}
                </span>
              </Text>
            </div>

            {/* Payment Audit list */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div style={{ padding: '4px 10px' }}>
                <Text strong style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Transaction History Log</Text>
                {invoice.payments.map((p, idx) => (
                  <div key={idx} style={{ fontSize: '12px', borderBottom: '1px dashed #eee', padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{new Date(p.created_at).toLocaleDateString('en-IN')} ({p.payment_mode.toUpperCase()})</span>
                    <span style={{ fontWeight: 600 }}>+ ₹{parseFloat(p.paid_amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </Col>
          <Col span={12}>
            <div style={{ float: 'right', width: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text>Total Pieces:</Text>
                <Text strong>{invoice.total_pieces}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text>Gross Weight:</Text>
                <Text strong>{parseFloat(invoice.gross_weight).toFixed(2)} Kg</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text>Removable/Piece:</Text>
                <Text strong>{parseFloat(invoice.removable_weight_per_piece).toFixed(3)} Kg</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text>Total Removable:</Text>
                <Text strong>{parseFloat(invoice.total_removable_weight).toFixed(2)} Kg</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px solid #ddd', paddingTop: '4px' }}>
                <Text strong>Net Weight:</Text>
                <Text strong>{parseFloat(invoice.net_weight).toFixed(2)} Kg</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #333', paddingTop: '6px', marginTop: '4px' }}>
                <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Final Amount:</Title>
                <Title level={4} style={{ margin: 0, color: '#f6b93b', fontWeight: 800 }}>₹{finalAmount.toFixed(2)}</Title>
              </div>
            </div>
          </Col>
        </Row>

        {/* Signature display */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '50px' }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            {invoice.owner_details?.signature ? (
              invoice.owner_details.signature.startsWith('data:image') ? (
                <img src={invoice.owner_details.signature} alt="Owner Signature" style={{ maxHeight: '60px', maxWidth: '160px', marginBottom: '4px' }} />
              ) : (
                <div style={{ fontFamily: 'Dancing Script, cursive', fontSize: '20px', fontStyle: 'italic', color: '#555', marginBottom: '4px' }}>
                  {invoice.owner_details.signature}
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

      {/* Collect incremental payment modal */}
      <Modal
        title="Collect Outstanding Balance Payment"
        open={isPaymentModalVisible}
        onCancel={() => setIsPaymentModalVisible(false)}
        footer={null}
        borderRadius={12}
        className="no-print"
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleUpdatePayment}
          initialValues={{ payment_mode: 'cash', paid_amount: outstandingBalance }}
        >
          <Form.Item label="Outstanding Due">
            <Title level={4} style={{ margin: 0, color: '#e74c3c' }}>₹{outstandingBalance.toFixed(2)}</Title>
          </Form.Item>

          <Form.Item
            name="paid_amount"
            label="Amount Paid Now (Rs.)"
            rules={[
              { required: true, message: 'Please specify payment amount!' },
              { type: 'number', max: outstandingBalance, message: 'Amount cannot exceed outstanding balance!' }
            ]}
          >
            <InputNumber
              min={0.01}
              step={0.1}
              style={{ width: '100%' }}
              prefix="₹"
            />
          </Form.Item>

          <Form.Item
            name="payment_mode"
            label="Payment Mode"
            rules={[{ required: true }]}
          >
            <Select style={{ width: '100%' }}>
              <Option value="cash">Cash</Option>
              <Option value="upi">UPI</Option>
              <Option value="bank_transfer">Bank Transfer</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsPaymentModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={updatingPayment} className="btn-primary" icon={<SaveOutlined />}>
                Record Payment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceDetails;
