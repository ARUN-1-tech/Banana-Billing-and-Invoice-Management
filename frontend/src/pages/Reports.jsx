import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Alert, Typography, Divider, Tabs } from 'antd';
import {
  CalendarOutlined, BarChartOutlined, LineChartOutlined,
  DashboardOutlined, FallOutlined, RiseOutlined, InboxOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/reports/');
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching analytics reports', err);
        setError('Could not connect to reports aggregation server.');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Computing billing analytics..." />
      </div>
    );
  }

  if (error || !stats) {
    return <Alert message={error || 'No reports data found.'} type="error" showIcon style={{ borderRadius: '12px' }} />;
  }

  const d = stats.daily;
  const w = stats.weekly;
  const m = stats.monthly;

  // Chart scaling
  const weeklyChart = w.chart_data || [];
  const maxWeeklyRevenue = Math.max(...weeklyChart.map(x => x.revenue), 100);
  const maxWeeklyWeight = Math.max(...weeklyChart.map(x => x.weight), 10);

  const monthlyChart = m.chart_data || [];
  const maxMonthlyRevenue = Math.max(...monthlyChart.map(x => x.revenue), 100);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ marginBottom: '4px', fontWeight: 800 }}>Analytics & Reports Dashboard</Title>
        <Text type="secondary">Real-time daily, weekly, and monthly calculations and weighing logs</Text>
      </div>

      <Tabs defaultActiveKey="1" size="large" className="glass-panel" style={{ padding: '16px' }}>
        {/* DAILY REPORTS */}
        <TabPane tab={<span><CalendarOutlined />Daily Summary</span>} key="1">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(246, 185, 59, 0.2)' }}>
                <Statistic title="Total Bills Generated" value={d.total_bills} suffix="Invoices" valueStyle={{ fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
                <Statistic title="Total Revenue Collected" value={d.total_revenue} precision={2} prefix="₹" valueStyle={{ color: '#2ecc71', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(140, 122, 230, 0.2)' }}>
                <Statistic title="Total Banana Net Weight" value={d.total_net_weight} precision={2} suffix="Kg" valueStyle={{ color: '#8c7ae6', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
                <Statistic title="Today's Pending Payments" value={d.pending_payments} precision={2} prefix="₹" valueStyle={{ color: d.pending_payments > 0 ? '#e74c3c' : 'inherit', fontWeight: 700 }} />
              </Card>
            </Col>
          </Row>

          <Divider />
          <Title level={4} style={{ marginBottom: '16px', fontWeight: 700 }}>Today's Performance Insights</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card style={{ padding: '10px' }}>
                <Text strong>Average Revenue Per Bill: </Text>
                <Text style={{ fontSize: '18px', fontWeight: 700, color: '#f6b93b', marginLeft: '12px' }}>
                  ₹{(d.total_bills > 0 ? d.total_revenue / d.total_bills : 0.0).toFixed(2)}
                </Text>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
                  Calculated based on today's settled transactions
                </div>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card style={{ padding: '10px' }}>
                <Text strong>Average Net Weight Per Bill: </Text>
                <Text style={{ fontSize: '18px', fontWeight: 700, color: '#8c7ae6', marginLeft: '12px' }}>
                  {(d.total_bills > 0 ? d.total_net_weight / d.total_bills : 0.0).toFixed(2)} Kg
                </Text>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
                  Average weighing tonnage per customer transaction today
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* WEEKLY REPORTS */}
        <TabPane tab={<span><BarChartOutlined />Weekly Metrics</span>} key="2">
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title="Weekly Revenue" value={w.revenue} precision={2} prefix="₹" valueStyle={{ color: '#2ecc71', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title="Weekly Weight Dispatched" value={w.weight} precision={2} suffix="Kg" valueStyle={{ color: '#8c7ae6', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title="Top Banana Variety" value={w.top_banana_type} valueStyle={{ color: '#f6b93b', fontWeight: 700 }} />
              </Card>
            </Col>
          </Row>

          <Divider />
          <Title level={4} style={{ marginBottom: '16px', fontWeight: 700 }}>Weekly Volume Trend vs Revenue</Title>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '240px', padding: '20px', background: 'rgba(0,0,0,0.01)', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.05)' }}>
            {weeklyChart.map((dayData, idx) => {
              const revHeight = `${(dayData.revenue / maxWeeklyRevenue) * 80 + 5}%`;
              const weightHeight = `${(dayData.weight / maxWeeklyWeight) * 80 + 5}%`;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'center', height: '160px', alignItems: 'flex-end' }}>
                    {/* Revenue Bar */}
                    <div
                      style={{
                        width: '25%',
                        height: dayData.revenue > 0 ? revHeight : '4px',
                        background: 'rgba(46, 204, 113, 0.85)',
                        borderRadius: '4px 4px 0 0',
                      }}
                      title={`Revenue: ₹${dayData.revenue}`}
                    />
                    {/* Weight Bar */}
                    <div
                      style={{
                        width: '25%',
                        height: dayData.weight > 0 ? weightHeight : '4px',
                        background: 'rgba(140, 122, 230, 0.85)',
                        borderRadius: '4px 4px 0 0',
                      }}
                      title={`Weight: ${dayData.weight} Kg`}
                    />
                  </div>
                  <Text style={{ fontSize: '11px', fontWeight: 600 }}>{dayData.day}</Text>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
            <Text><span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'rgba(46, 204, 113, 0.85)', marginRight: '6px', borderRadius: '2px' }} />Revenue (Rs)</Text>
            <Text><span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'rgba(140, 122, 230, 0.85)', marginRight: '6px', borderRadius: '2px' }} />Weight (Kg)</Text>
          </div>
        </TabPane>

        {/* MONTHLY REPORTS */}
        <TabPane tab={<span><LineChartOutlined />Monthly Analytics</span>} key="3">
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title="Monthly Revenue" value={m.revenue} precision={2} prefix="₹" valueStyle={{ color: '#2ecc71', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title="Monthly Invoices Issued" value={m.bills} valueStyle={{ fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Statistic title="Unique Customers Served" value={m.customers} valueStyle={{ color: '#8c7ae6', fontWeight: 700 }} />
              </Card>
            </Col>
          </Row>

          <Divider />
          <Title level={4} style={{ marginBottom: '16px', fontWeight: 700 }}>6-Month Revenue History Graph</Title>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '240px', padding: '20px', background: 'rgba(0,0,0,0.01)', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.05)' }}>
            {monthlyChart.map((monthData, idx) => {
              const heightPercent = `${(monthData.revenue / maxMonthlyRevenue) * 80 + 5}%`;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>₹{monthData.revenue.toFixed(0)}</div>
                  <div
                    style={{
                      width: '35%',
                      height: monthData.revenue > 0 ? heightPercent : '4px',
                      background: 'linear-gradient(to top, rgba(140, 122, 230, 0.8), rgba(246, 185, 59, 0.8))',
                      borderRadius: '6px 6px 0 0',
                    }}
                  />
                  <Text style={{ fontSize: '11px', fontWeight: 600 }}>{monthData.month}</Text>
                </div>
              );
            })}
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Reports;
