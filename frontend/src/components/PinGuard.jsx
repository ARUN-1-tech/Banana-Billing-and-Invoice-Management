import React, { useState } from 'react';
import { Modal, Input, Button, Alert } from 'antd';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const PinGuard = ({ children }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isVerified, setIsVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    const userPin = user?.pin || '1234';
    if (pinInput === userPin) {
      setIsVerified(true);
      setError('');
    } else {
      setError(t('incorrect_pin') || 'Incorrect PIN. Please try again.');
      setPinInput('');
    }
  };

  if (isVerified) {
    return children;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Modal
        title={t('security_lock') || "Security PIN Required"}
        open={true}
        closable={false}
        footer={[
          <Button key="verify" type="primary" onClick={handleVerify} className="btn-primary" size="large">
            {t('verify_pin') || "Verify PIN"}
          </Button>
        ]}
        centered
        width={360}
        bodyStyle={{ padding: '24px 0' }}
        className="glass-panel"
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '16px', fontSize: '14px', opacity: 0.8 }}>
            {t('security_pin_desc') || "Please enter your 4-digit security PIN to access this section."}
          </p>
          <Input.Password
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, ''); // numeric only
              setPinInput(val);
            }}
            placeholder="XXXX"
            style={{ 
              width: '180px', 
              fontSize: '24px', 
              textAlign: 'center', 
              letterSpacing: '12px',
              fontWeight: 'bold',
              borderRadius: '8px',
              padding: '8px'
            }}
            onPressEnter={handleVerify}
            autoFocus
          />
          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              style={{ marginTop: '16px', borderRadius: '8px', textAlign: 'left' }} 
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PinGuard;
