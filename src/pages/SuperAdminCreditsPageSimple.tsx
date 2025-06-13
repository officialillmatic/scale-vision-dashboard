// SuperAdminCreditsPageSimple.tsx - Versión de debug
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, CreditCard, DollarSign, Loader2, AlertCircle, Database } from 'lucide-react';

const SuperAdminCreditsPageSimple = () => {
  const { user } = useAuth();
  const [creditsData, setCreditsData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [companiesData, setCompaniesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Verificación simple de admin
  const isAdmin = user?.email === 'aiagentsdevelopers@gmail.com';
  
  useEffect(() => {
    const fetchCreditsData = async () => {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        console.log('🔧 Fetching credits data...');
        
        // Intentar múltiples tablas que podrían contener datos de créditos
        const tables = [
          'credits',
          'user_credits', 
          'company_credits',
          'billing',
          'usage',
          'transactions',
          'subscriptions'
        ];
        
        const results = {};
        
        for (const table of tables) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .limit(10); // Limitar para no sobrecargar
            
            console.log(`🔧 Table "${table}":`, { data, error });
            results[table] = { data, error };
          } catch (err) {
            console.log(`🔧 Table "${table}" not found or error:`, err);
            results[table] = { data: null, error: err.message };
          }
        }
        
        // Obtener companies
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('*');
          
        console.log('🔧 Companies:', { companies, companiesError });
        
        // Obtener profiles con información adicional
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
          
        console.log('🔧 Profiles:', { profiles, profilesError });
        
        setCreditsData(results);
        setCompaniesData(companies);
        setUsageData(profiles);
        
        // Log summary
        console.log('🔧 Credits Data Summary:');
        Object.entries(results).forEach(([table, result]) => {
          console.log(`  - ${table}: ${result.data?.length || 0} records`);
        });
        
      } catch (err) {
        console.error('🔧 Error fetching credits data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCreditsData();
  }, [isAdmin]);
  
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only aiagentsdevelopers@gmail.com can access this page</p>
          <p className="text-sm text-gray-400 mt-1">Current user: {user?.email}</p>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Credits Debug Page 💳</h1>
          <Badge variant="destructive" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            DEBUG MODE
          </Badge>
        </div>
        
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current User Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>ID:</strong> {user?.id}</p>
              <p><strong>Is Admin:</strong> {isAdmin ? '✅ Yes' : '❌ No'}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading credits data...</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Error State */}
        {error && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Error Loading Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}
        
        {/* Credits Tables Data */}
        {!loading && creditsData && (
          <div className="grid gap-4">
            {Object.entries(creditsData).map(([tableName, result]) => (
              <Card key={tableName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Table: {tableName} ({result.data?.length || 0} records)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.error ? (
                    <div className="text-red-600 text-sm">
                      <p><strong>Error:</strong> {result.error}</p>
                    </div>
                  ) : result.data && result.data.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-auto">
                      {result.data.map((record, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded border">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(record, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>No data found in {tableName} table</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Companies Data */}
        {!loading && companiesData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Companies ({companiesData?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companiesData && companiesData.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-auto">
                  {companiesData.map((company, index) => (
                    <div key={company.id || index} className="p-3 bg-gray-50 rounded border">
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <p><strong>Name:</strong> {company.name || 'N/A'}</p>
                        <p><strong>Owner:</strong> {company.owner_id || 'N/A'}</p>
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600">Show raw data</summary>
                        <pre className="mt-2 bg-white p-2 rounded overflow-auto">
                          {JSON.stringify(company, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No companies found</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Debug Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Debug Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <p className="mb-2">Check the browser console for detailed logs starting with 🔧</p>
            <p className="text-sm">This page searches for credits data in these tables:</p>
            <ul className="text-sm mt-1 space-y-1 ml-4">
              <li>• credits</li>
              <li>• user_credits</li>
              <li>• company_credits</li>
              <li>• billing</li>
              <li>• usage</li>
              <li>• transactions</li>
              <li>• subscriptions</li>
              <li>• companies</li>
              <li>• profiles</li>
            </ul>
            <p className="text-sm mt-2">If all tables show "No data found", the issue might be:</p>
            <ul className="text-sm mt-1 space-y-1 ml-4">
              <li>• Database permissions</li>
              <li>• Empty tables</li>
              <li>• Different table names</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminCreditsPageSimple;
