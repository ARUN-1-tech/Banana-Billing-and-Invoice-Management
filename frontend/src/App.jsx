import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceHistory from './pages/InvoiceHistory';
import InvoiceDetails from './pages/InvoiceDetails';
import Profile from './pages/Profile';
import Rates from './pages/Rates';
import AdminPanel from './pages/AdminPanel';
import Reports from './pages/Reports';
import VehicleLog from './pages/VehicleLog';

// Private Route Guard Wrapper
const PrivateRoute = ({ children, isDarkMode, toggleDarkMode, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: isDarkMode ? '#0f1115' : '#f7f9fc' }}>
        <Spin size="large" tip="Securing trading terminal session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MainLayout isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}>
      {children}
    </MainLayout>
  );
};

const AppContent = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Private Pages wrapped in layout */}
      <Route path="/dashboard" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}>
          <Dashboard />
        </PrivateRoute>
      } />
      <Route path="/create-invoice" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} allowedRoles={['owner']}>
          <CreateInvoice />
        </PrivateRoute>
      } />
      {/* Step workflow redirect aliases for clean fallback */}
      <Route path="/weighing-process" element={<Navigate to="/create-invoice" replace />} />
      <Route path="/calculation-summary" element={<Navigate to="/create-invoice" replace />} />
      <Route path="/invoice-preview" element={<Navigate to="/create-invoice" replace />} />
      <Route path="/payments" element={<Navigate to="/create-invoice" replace />} />
      
      <Route path="/history" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} allowedRoles={['owner']}>
          <InvoiceHistory />
        </PrivateRoute>
      } />
      <Route path="/invoice-details/:id" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} allowedRoles={['owner']}>
          <InvoiceDetails />
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}>
          <Profile />
        </PrivateRoute>
      } />
      <Route path="/rates" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}>
          <Rates />
        </PrivateRoute>
      } />
      <Route path="/admin-panel" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} allowedRoles={['admin']}>
          <AdminPanel />
        </PrivateRoute>
      } />
      <Route path="/reports" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} allowedRoles={['owner']}>
          <Reports />
        </PrivateRoute>
      } />
      <Route path="/vehicles" element={
        <PrivateRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} allowedRoles={['owner']}>
          <VehicleLog />
        </PrivateRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('banana_dark_mode') === 'true'
  );

  // Sync dark-mode classes with body for custom glass styling
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('banana_dark_mode', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('banana_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#f6b93b', // Vibrant Banana Amber
          fontFamily: 'Outfit, sans-serif',
          borderRadius: 12,
        },
        components: {
          Card: {
            headerBg: 'transparent',
          }
        }
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AppContent isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
