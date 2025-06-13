import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SuperAdminCreditsPageSimple = () => {
  const { user } = useAuth();
  
  if (user?.email !== 'aiagentsdevelopers@gmail.com') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>❌ Acceso Denegado</h1>
        <p>Solo aiagentsdevelopers@gmail.com puede acceder</p>
        <p>Usuario actual: {user?.email || 'No logueado'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>💳 Credits Debug - Ultra Simple</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <h2>✅ Acceso Confirmado</h2>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>ID:</strong> {user?.id}</p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
        <h3>📊 Datos de Usuario:</h3>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default SuperAdminCreditsPageSimple;