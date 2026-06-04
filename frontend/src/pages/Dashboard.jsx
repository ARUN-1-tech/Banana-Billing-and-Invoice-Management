import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Typography, Tag, Spin, Alert } from 'antd';
import {
  FileAddOutlined, HistoryOutlined, FallOutlined, RiseOutlined,
  UserOutlined, BarChartOutlined, ArrowRightOutlined,
  FileTextOutlined, AccountBookOutlined, KeyOutlined, SettingOutlined
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [rates, setRates] = useState([]);
  const [error, setError] = useState(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch reports (acts as admin stats or owner stats dynamically based on role)
        const repRes = await axios.get('/reports/');
        setStats(repRes.data);
        
        // Fetch current rates
        const rateRes = await axios.get('/rates/');
        setRates(rateRes.data);
      } catch (err) {
        console.error('Error loading dashboard data', err);
        setError('Failed to load dashboard metrics. Verify database connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  const rateColumns = [
    {
      title: t('variety_type'),
      dataIndex: 'banana_type',
      key: 'banana_type',
      render: (text) => <Text style={{ fontWeight: 600 }}>{text}</Text>,
    },
    {
      title: t('banana_rates'),
      dataIndex: 'rate',
      key: 'rate',
      render: (text) => <Text style={{ color: '#2ecc71', fontWeight: 600 }}>₹{text} / Kg</Text>,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Harvesting dashboard insights..." />
      </div>
    );
  }

  // Admin Dashboard Render Path
  if (isAdmin) {
    const adminStats = stats?.stats || {
      approved_owners: 0,
      pending_owners: 0,
      active_passcodes: 0,
      total_passcodes: 0
    };

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <Title level={2} style={{ marginBottom: '4px', fontWeight: 800 }}>
              District Headquarter Admin Home
            </Title>
            <Text type="secondary">
              Managing District: <Text strong style={{ color: '#f6b93b' }}>{user?.district}</Text>
            </Text>
          </div>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            size="large"
            className="btn-primary"
            onClick={() => navigate('/admin-panel')}
          >
            Open Admin Panel
          </Button>
        </div>

        {error && <Alert message={error} type="warning" showIcon style={{ marginBottom: '20px', borderRadius: '12px' }} />}

        {/* Admin KPI cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card className="glass-panel" style={{ height: '100%' }}>
              <Statistic
                title="Approved Billing Owners"
                value={adminStats.approved_owners}
                prefix={<UserOutlined style={{ marginRight: '8px', color: '#2ecc71' }} />}
                valueStyle={{ color: '#2ecc71', fontWeight: 700 }}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
                Active terminals in {user?.district}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="glass-panel" style={{ height: '100%' }}>
              <Statistic
                title="Pending Approvals"
                value={adminStats.pending_owners}
                prefix={<UserOutlined style={{ marginRight: '8px', color: '#e74c3c' }} />}
                valueStyle={{ color: adminStats.pending_owners > 0 ? '#e74c3c' : 'inherit', fontWeight: 700 }}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
                Traders awaiting activation
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="glass-panel" style={{ height: '100%' }}>
              <Statistic
                title="Active Signup Passcodes"
                value={adminStats.active_passcodes}
                prefix={<KeyOutlined style={{ marginRight: '8px', color: '#f6b93b' }} />}
                valueStyle={{ color: '#f6b93b', fontWeight: 700 }}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
                Usable tokens for new signups
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="glass-panel" style={{ height: '100%' }}>
              <Statistic
                title="Total Passcodes Created"
                value={adminStats.total_passcodes}
                prefix={<KeyOutlined style={{ marginRight: '8px', color: '#8c7ae6' }} />}
                valueStyle={{ fontWeight: 700 }}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
                Historic passcode registration audit
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              className="glass-panel"
              title="District Market Banana Rates"
              extra={<Link to="/rates" style={{ color: '#f6b93b', fontWeight: 600 }}>Manage Rates <ArrowRightOutlined /></Link>}
              style={{ height: '100%' }}
            >
              <Table
                dataSource={rates}
                columns={rateColumns}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'No rates set. Add rates to allow billing operations.' }}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              className="glass-panel"
              title="Admin Quick Access Actions"
              style={{ height: '100%' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Button
                    block
                    icon={<UserOutlined />}
                    style={{
                      height: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '12px',
                      border: '1px solid rgba(46, 204, 113, 0.25)',
                      background: 'rgba(46, 204, 113, 0.05)',
                    }}
                    onClick={() => navigate('/admin-panel')}
                  >
                    <Text style={{ fontWeight: 600 }}>Approve Owners</Text>
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    icon={<KeyOutlined />}
                    style={{
                      height: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '12px',
                      border: '1px solid rgba(246, 185, 59, 0.25)',
                      background: 'rgba(246, 185, 59, 0.05)',
                    }}
                    onClick={() => navigate('/admin-panel')}
                  >
                    <Text style={{ fontWeight: 600 }}>Manage Passcodes</Text>
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    icon={<FileTextOutlined />}
                    style={{
                      height: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '12px',
                      border: '1px solid rgba(140, 122, 230, 0.25)',
                      background: 'rgba(140, 122, 230, 0.05)',
                    }}
                    onClick={() => navigate('/rates')}
                  >
                    <Text style={{ fontWeight: 600 }}>Manage Rates</Text>
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    icon={<AccountBookOutlined />}
                    style={{
                      height: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '12px',
                      border: '1px solid rgba(231, 76, 60, 0.25)',
                      background: 'rgba(231, 76, 60, 0.05)',
                    }}
                    onClick={() => navigate('/profile')}
                  >
                    <Text style={{ fontWeight: 600 }}>My Profile</Text>
                  </Button>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // Owner Dashboard Render Path (Invoicing, billing history, charts, customer metrics)
  const d = stats?.daily || {
    total_bills: 0,
    total_revenue: 0.0,
    total_net_weight: 0.0,
    pending_payments: 0.0,
    total_customers: 0,
  };

  const weeklyChart = stats?.weekly?.chart_data || [];
  const maxWeeklyVal = Math.max(...weeklyChart.map(x => x.revenue), 100);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: '4px', fontWeight: 800 }}>
            {t('welcome')}, {user?.name || user?.username}!
          </Title>
          <Text type="secondary">
            {user?.business_name || 'Banana Billing Station'} - {user?.district} District
          </Text>
        </div>
        <Button
          type="primary"
          icon={<FileAddOutlined />}
          size="large"
          className="btn-primary"
          onClick={() => navigate('/create-invoice')}
        >
          {t('create_invoice')}
        </Button>
      </div>

      {error && <Alert message={error} type="warning" showIcon style={{ marginBottom: '20px', borderRadius: '12px' }} />}

      {/* Main KPI cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" style={{ height: '100%' }}>
            <Statistic
              title={t('todays_revenue')}
              value={d.total_revenue}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#2ecc71', fontWeight: 700 }}
            />
            <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
              Total collections recorded today
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" style={{ height: '100%' }}>
            <Statistic
              title={t('bills_today')}
              value={d.total_bills}
              prefix={<FileTextOutlined style={{ marginRight: '8px', color: '#f6b93b' }} />}
              valueStyle={{ fontWeight: 700 }}
            />
            <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
              From weighing terminal activities
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" style={{ height: '100%' }}>
            <Statistic
              title={t('customers_visited')}
              value={d.total_customers}
              prefix={<UserOutlined style={{ marginRight: '8px', color: '#8c7ae6' }} />}
              valueStyle={{ fontWeight: 700 }}
            />
            <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
              Unique banana traders/growers
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" style={{ height: '100%' }}>
            <Statistic
              title={t('pending_payments')}
              value={d.pending_payments}
              precision={2}
              prefix="₹"
              valueStyle={{ color: d.pending_payments > 0 ? '#e74c3c' : 'inherit', fontWeight: 700 }}
            />
            <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
              Balances left to settle
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Navigation Panels and Rates */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={12}>
          <Card
            className="glass-panel"
            title={t('todays_rates')}
            style={{ height: '100%' }}
          >
            <Table
              dataSource={rates}
              columns={rateColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'No rates set. Contact District Banana Head.' }}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            className="glass-panel"
            title={t('quick_utilities')}
            style={{ height: '100%' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Button
                  block
                  icon={<FileAddOutlined />}
                  style={{
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '12px',
                    border: '1px solid rgba(246, 185, 59, 0.25)',
                    background: 'rgba(246, 185, 59, 0.05)',
                  }}
                  onClick={() => navigate('/create-invoice')}
                >
                  <Text style={{ fontWeight: 600 }}>{t('create_invoice')}</Text>
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  icon={<HistoryOutlined />}
                  style={{
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '12px',
                    border: '1px solid rgba(140, 122, 230, 0.25)',
                    background: 'rgba(140, 122, 230, 0.05)',
                  }}
                  onClick={() => navigate('/history')}
                >
                  <Text style={{ fontWeight: 600 }}>{t('billing_history')}</Text>
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  icon={<BarChartOutlined />}
                  style={{
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '12px',
                    border: '1px solid rgba(46, 204, 113, 0.25)',
                    background: 'rgba(46, 204, 113, 0.05)',
                  }}
                  onClick={() => navigate('/reports')}
                >
                  <Text style={{ fontWeight: 600 }}>{t('reports')}</Text>
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  icon={<AccountBookOutlined />}
                  style={{
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '12px',
                    border: '1px solid rgba(231, 76, 60, 0.25)',
                    background: 'rgba(231, 76, 60, 0.05)',
                  }}
                  onClick={() => navigate('/profile')}
                >
                  <Text style={{ fontWeight: 600 }}>{t('business_profile')}</Text>
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Chart Section */}
      <Row>
        <Col span={24}>
          <Card className="glass-panel" title="Weekly Revenue Trends (Last 7 Days)">
            {weeklyChart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Not enough transaction data to graph trends.</Text>
              </div>
            ) : (
              <div>
                {/* SVG Graph representation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '200px', padding: '10px 20px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.05)' }}>
                  {weeklyChart.map((dayData, idx) => {
                    const heightPercent = `${(dayData.revenue / maxWeeklyVal) * 80 + 5}%`;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#2e7d32' }}>
                          ₹{dayData.revenue}
                        </div>
                        <div
                          style={{
                            width: '40%',
                            minWidth: '20px',
                            height: dayData.revenue > 0 ? heightPercent : '4px',
                            background: 'linear-gradient(to top, rgba(46, 204, 113, 0.8), rgba(246, 185, 59, 0.8))',
                            borderRadius: '6px 6px 0 0',
                            transition: 'all 0.5s ease',
                          }}
                        />
                        <div style={{ fontSize: '12px', fontWeight: 500, opacity: 0.7 }}>
                          {dayData.day}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
