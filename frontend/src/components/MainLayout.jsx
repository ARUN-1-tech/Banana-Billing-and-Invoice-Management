import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Tooltip, Drawer, Space } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MenuUnfoldOutlined, MenuFoldOutlined, DashboardOutlined,
  FileAddOutlined, HistoryOutlined, LineChartOutlined,
  UserOutlined, SettingOutlined, BulbOutlined,
  LogoutOutlined, KeyOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children, isDarkMode, toggleDarkMode }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Listen to window size changes for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuToggle = () => {
    if (isMobile) {
      setDrawerVisible(true);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: <Link to="/dashboard">Dashboard</Link>,
        },
        {
          key: '/rates',
          icon: <AppstoreOutlined />,
          label: <Link to="/rates">Banana Rates</Link>,
        },
        {
          key: '/admin-panel',
          icon: <SettingOutlined />,
          label: <Link to="/admin-panel">Admin Panel</Link>,
        },
        {
          key: '/profile',
          icon: <UserOutlined />,
          label: <Link to="/profile">My Profile</Link>,
        },
      ];
    } else {
      // Billing Owner
      return [
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: <Link to="/dashboard">Dashboard</Link>,
        },
        {
          key: '/create-invoice',
          icon: <FileAddOutlined />,
          label: <Link to="/create-invoice">Create Invoice</Link>,
        },
        {
          key: '/rates',
          icon: <AppstoreOutlined />,
          label: <Link to="/rates">Banana Rates</Link>,
        },
        {
          key: '/history',
          icon: <HistoryOutlined />,
          label: <Link to="/history">Billing History</Link>,
        },
        {
          key: '/reports',
          icon: <LineChartOutlined />,
          label: <Link to="/reports">Analytics & Reports</Link>,
        },
        {
          key: '/profile',
          icon: <UserOutlined />,
          label: <Link to="/profile">Business Profile</Link>,
        },
      ];
    }
  };

  const selectedKey = location.pathname;

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Background Animated Blobs */}
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          breakpoint="lg"
          collapsedWidth="80"
          onBreakpoint={(broken) => {
            setCollapsed(broken);
          }}
          className="no-print"
          style={{
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 10,
          }}
        >
          <div style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '0 24px',
            fontWeight: 800,
            fontSize: '18px',
            color: '#f6b93b',
            letterSpacing: '1px'
          }}>
            {collapsed ? '🍌' : '🍌 BANANA BILL'}
          </div>
          <Menu
            theme={isDarkMode ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[selectedKey]}
            items={getMenuItems()}
            style={{ borderRight: 0 }}
          />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          title={<span style={{ color: '#f6b93b', fontWeight: 800, letterSpacing: '1px' }}>🍌 BANANA BILL</span>}
          placement="left"
          closable={true}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={260}
          bodyStyle={{ padding: 0 }}
          headerStyle={{
            background: isDarkMode ? 'rgba(20, 20, 20, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.4)',
          }}
          className="no-print mobile-drawer-nav"
        >
          <Menu
            theme={isDarkMode ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[selectedKey]}
            items={getMenuItems()}
            onClick={() => setDrawerVisible(false)}
            style={{ borderRight: 0 }}
          />
        </Drawer>
      )}

      <Layout style={{ background: 'transparent' }}>
        <Header
          className="no-print"
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDarkMode ? 'rgba(20, 20, 20, 0.55)' : 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.4)',
            position: 'sticky',
            top: 0,
            zIndex: 9,
            height: '64px',
            lineHeight: '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button
              type="text"
              icon={isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={handleMenuToggle}
              style={{ fontSize: '16px', width: 40, height: 40 }}
            />
            <div 
              className="header-clock"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                opacity: 0.7,
                display: 'inline-block'
              }}
            >
              {currentTime.toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'medium',
                hour12: true
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="user-details-header" style={{ textAlign: 'right', lineHeight: 'normal' }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {user?.name || user?.username}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>
                {user?.business_name || (user?.role === 'admin' ? 'District Head' : 'Banana Trader')}
              </div>
            </div>

            <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <Button
                type="text"
                shape="circle"
                icon={<BulbOutlined style={{ color: isDarkMode ? '#f6b93b' : 'inherit' }} />}
                onClick={toggleDarkMode}
              />
            </Tooltip>

            <Tooltip title="Log Out">
              <Button
                type="text"
                shape="circle"
                icon={<LogoutOutlined style={{ color: '#e74c3c' }} />}
                onClick={handleLogout}
              />
            </Tooltip>
          </div>
        </Header>

        <Content
          style={{
            margin: '24px',
            minHeight: '280px',
            overflow: 'initial',
          }}
        >
          <div className="fade-in-slide">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
