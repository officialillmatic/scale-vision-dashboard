// EmergencyTeam.tsx - Actualizado para usar tablas reales
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
        console.log('🚨 Emergency Team - Fetching from REAL tables...');
        
        // Usar las tablas reales, no las vistas
        const { data: userProfiles, error: userProfilesError } = await supabase
          .from('user_profiles')  // Tabla real
          .select('*');
          
        const { data: companies, error: companiesError } = await supabase
          .from('companies')  // Tabla real
          .select('*');

        const { data: users, error: usersError } = await supabase
          .from('users')  // Tabla real
          .select('*');

        const { data: userCredits, error: userCreditsError } = await supabase
          .from('user_credits')  // Tabla real
          .select('*');
        
        console.log('🚨 User Profiles:', userProfiles, userProfilesError);
        console.log('🚨 Companies:', companies, companiesError);
        console.log('🚨 Users:', users, usersError);
        console.log('🚨 User Credits:', userCredits, userCreditsError);
        
        setData({ 
          userProfiles, 
          companies, 
          users, 
          userCredits,
          errors: { userProfilesError, companiesError, usersError, userCreditsError }
        });
        
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
      <h1>🚨 Emergency Team Debug (Tablas Reales)</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
        <h2>✅ Usuario Verificado</h2>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>ID:</strong> {user?.id}</p>
        <p><strong>Fecha:</strong> {new Date().toLocaleString()}</p>
      </div>

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>⏳ Cargando datos de tablas reales...</p>
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
          {/* User Profiles */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
            <h3>👥 User Profiles ({data.userProfiles?.length || 0})</h3>
            {data.errors.userProfilesError && (
              <p style={{ color: '#dc2626' }}>❌ Error: {data.errors.userProfilesError.message}</p>
            )}
            {data.userProfiles && data.userProfiles.length > 0 ? (
              <div>
                {data.userProfiles.slice(0, 5).map((profile, index) => (
                  <div key={index} style={{ padding: '10px', margin: '10px 0', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    <p><strong>Email:</strong> {profile.email || 'N/A'}</p>
                    <p><strong>Name:</strong> {profile.full_name || profile.name || 'N/A'}</p>
                    <p><strong>Role:</strong> {profile.role || 'N/A'}</p>
                    <p><strong>ID:</strong> {profile.id}</p>
                  </div>
                ))}
                {data.userProfiles.length > 5 && <p>... y {data.userProfiles.length - 5} más</p>}
              </div>
            ) : (
              <p>No se encontraron user_profiles</p>
            )}
          </div>

          {/* Companies */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
            <h3>🏢 Companies ({data.companies?.length || 0})</h3>
            {data.errors.companiesError && (
              <p style={{ color: '#dc2626' }}>❌ Error: {data.errors.companiesError.message}</p>
            )}
            {data.companies && data.companies.length > 0 ? (
              <div>
                {data.companies.slice(0, 5).map((company, index) => (
                  <div key={index} style={{ padding: '10px', margin: '10px 0', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    <p><strong>Name:</strong> {company.name || 'N/A'}</p>
                    <p><strong>Owner ID:</strong> {company.owner_id || 'N/A'}</p>
                    <p><strong>ID:</strong> {company.id}</p>
                  </div>
                ))}
                {data.companies.length > 5 && <p>... y {data.companies.length - 5} más</p>}
              </div>
            ) : (
              <p>No se encontraron companies</p>
            )}
          </div>

          {/* Users */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fefce8', borderRadius: '8px', border: '1px solid #fde047' }}>
            <h3>👤 Users ({data.users?.length || 0})</h3>
            {data.errors.usersError && (
              <p style={{ color: '#dc2626' }}>❌ Error: {data.errors.usersError.message}</p>
            )}
            {data.users && data.users.length > 0 ? (
              <div>
                {data.users.slice(0, 3).map((userRecord, index) => (
                  <div key={index} style={{ padding: '10px', margin: '10px 0', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    <p><strong>Email:</strong> {userRecord.email || 'N/A'}</p>
                    <p><strong>ID:</strong> {userRecord.id}</p>
                  </div>
                ))}
                {data.users.length > 3 && <p>... y {data.users.length - 3} más</p>}
              </div>
            ) : (
              <p>No se encontraron users</p>
            )}
          </div>

          {/* User Credits */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fdf2f8', borderRadius: '8px', border: '1px solid #f9a8d4' }}>
            <h3>💳 User Credits ({data.userCredits?.length || 0})</h3>
            {data.errors.userCreditsError && (
              <p style={{ color: '#dc2626' }}>❌ Error: {data.errors.userCreditsError.message}</p>
            )}
            {data.userCredits && data.userCredits.length > 0 ? (
              <div>
                {data.userCredits.slice(0, 3).map((credit, index) => (
                  <div key={index} style={{ padding: '10px', margin: '10px 0', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    <p><strong>User ID:</strong> {credit.user_id || 'N/A'}</p>
                    <p><strong>Credits:</strong> {credit.credits || 'N/A'}</p>
                    <p><strong>ID:</strong> {credit.id}</p>
                  </div>
                ))}
                {data.userCredits.length > 3 && <p>... y {data.userCredits.length - 3} más</p>}
              </div>
            ) : (
              <p>No se encontraron user_credits</p>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
        <h3>🔧 Estado:</h3>
        <ol>
          <li>✅ Usando tablas reales: user_profiles, companies, users, user_credits</li>
          <li>🔍 Revisa la consola para logs con 🚨</li>
          <li>📊 Si ves datos arriba, RLS ha sido deshabilitado correctamente</li>
          <li>🎯 Si hay datos aquí, las páginas principales también deberían funcionar</li>
        </ol>
      </div>
    </div>
  );
};

export default EmergencyTeam;