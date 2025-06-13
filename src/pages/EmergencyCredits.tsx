import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const EmergencyCredits = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🚨 Emergency Credits - Fetching data...');
        
        // Buscar tablas relacionadas con créditos
        const tables = ['credits', 'user_credits', 'billing', 'usage', 'subscriptions', 'transactions'];
        const results = {};
        
        for (const table of tables) {
          try {
            const { data: tableData, error } = await supabase
              .from(table)
              .select('*')
              .limit(5);
            
            console.log(`🚨 Table ${table}:`, tableData);
            results[table] = { data: tableData, error };
          } catch (err) {
            console.log(`🚨 Table ${table} error:`, err);
            results[table] = { data: null, error: err.message };
          }
        }
        
        setData(results);
        
      } catch (err) {
        console.error('🚨 Error general:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (user?.email !== 'aiagentsdevelopers@gmail.com') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🚨 Emergency Credits - Acceso Denegado</h1>
        <p>Solo aiagentsdevelopers@gmail.com puede acceder</p>
        <p>Usuario actual: {user?.email || 'No logueado'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🚨 Emergency Credits Debug</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
        <h2>✅ Usuario Verificado</h2>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>ID:</strong> {user?.id}</p>
        <p><strong>Fecha:</strong> {new Date().toLocaleString()}</p>
      </div>

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>⏳ Cargando datos de créditos...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ color: '#dc2626' }}>❌ Error:</h3>
          <p style={{ color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {data && !loading && (
        <div>
          {Object.entries(data).map(([tableName, result]) => (
            <div key={tableName} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3>📊 Tabla: {tableName}</h3>
              
              {result.error ? (
                <div style={{ padding: '10px', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                  <p style={{ color: '#dc2626' }}>❌ Error: {result.error}</p>
                </div>
              ) : result.data && result.data.length > 0 ? (
                <div>
                  <p style={{ color: '#059669' }}>✅ {result.data.length} registros encontrados</p>
                  {result.data.map((record, index) => (
                    <div key={index} style={{ padding: '10px', margin: '10px 0', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#3b82f6' }}>Registro {index + 1}</summary>
                        <pre style={{ fontSize: '12px', overflow: 'auto', backgroundColor: '#f9fafb', padding: '10px', marginTop: '5px' }}>
                          {JSON.stringify(record, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280' }}>⚪ Tabla vacía o no existe</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
        <h3>🔧 Instrucciones:</h3>
        <ol>
          <li>Revisa la consola del navegador para logs detallados con 🚨</li>
          <li>Busca tablas que contengan datos (marcadas con ✅)</li>
          <li>Si todas las tablas están vacías, puede que tengas diferentes nombres de tablas</li>
          <li>Si hay datos aquí pero no en la página principal, el problema es de permisos/lógica</li>
        </ol>
      </div>
    </div>
  );
};

export default EmergencyCredits;