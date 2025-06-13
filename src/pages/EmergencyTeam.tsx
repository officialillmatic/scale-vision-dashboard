import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const EmergencyTeam = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🚨 Emergency Team - Fetching data...');
        
        // Obtener datos básicos
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
          
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('*');
        
        console.log('🚨 Profiles:', profiles);
        console.log('🚨 Companies:', companies);
        
        setData({ profiles, companies });
        
      } catch (err) {
        console.error('🚨 Error:', err);
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
        <h1>🚨 Emergency Team - Acceso Denegado</h1>
        <p>Solo aiagentsdevelopers@gmail.com puede acceder</p>
        <p>Usuario actual: {user?.email || 'No logueado'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🚨 Emergency Team Debug</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
        <h2>✅ Usuario Verificado</h2>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>ID:</strong> {user?.id}</p>
        <p><strong>Fecha:</strong> {new Date().toLocaleString()}</p>
      </div>

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>⏳ Cargando datos...</p>
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
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
            <h3>👥 Profiles ({data.profiles?.length || 0})</h3>
            {data.profiles && data.profiles.length > 0 ? (
              <div>
                {data.profiles.map((profile, index) => (
                  <div key={index} style={{ padding: '10px', margin: '10px 0', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    <p><strong>Email:</strong> {profile.email || 'N/A'}</p>
                    <p><strong>Name:</strong> {profile.full_name || profile.name || 'N/A'}</p>
                    <p><strong>Role:</strong> {profile.role || 'N/A'}</p>
                    <p><strong>ID:</strong> {profile.id}</p>
                    <details style={{ marginTop: '5px' }}>
                      <summary style={{ cursor: 'pointer', color: '#3b82f6' }}>Ver datos completos</summary>
                      <pre style={{ fontSize: '12px', overflow: 'auto', backgroundColor: '#f9fafb', padding: '10px', marginTop: '5px' }}>
                        {JSON.stringify(profile, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <p>No se encontraron profiles</p>
            )}
          </div>

          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
            <h3>🏢 Companies ({data.companies?.length || 0})</h3>
            {data.companies && data.companies.length > 0 ? (
              <div>
                {data.companies.map((company, index) => (
                  <div key={index} style={{ padding: '10px', margin: '10px 0', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    <p><strong>Name:</strong> {company.name || 'N/A'}</p>
                    <p><strong>Owner ID:</strong> {company.owner_id || 'N/A'}</p>
                    <p><strong>ID:</strong> {company.id}</p>
                    <details style={{ marginTop: '5px' }}>
                      <summary style={{ cursor: 'pointer', color: '#3b82f6' }}>Ver datos completos</summary>
                      <pre style={{ fontSize: '12px', overflow: 'auto', backgroundColor: '#f9fafb', padding: '10px', marginTop: '5px' }}>
                        {JSON.stringify(company, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <p>No se encontraron companies</p>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
        <h3>🔧 Instrucciones:</h3>
        <ol>
          <li>Revisa la consola del navegador para logs detallados con 🚨</li>
          <li>Verifica si aparecen datos en las secciones de arriba</li>
          <li>Si no hay datos, el problema puede ser permisos de base de datos</li>
          <li>Si hay datos aquí pero no en la página principal, el problema es de lógica de permisos</li>
        </ol>
      </div>
    </div>
  );
};

export default EmergencyTeam;
