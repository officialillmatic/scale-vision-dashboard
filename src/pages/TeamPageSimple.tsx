// TeamPageSimple.tsx - Versión de debug
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Users, Bot, Loader2, AlertCircle } from 'lucide-react';

const TeamPageSimple = () => {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState(null);
  const [agentsData, setAgentsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Verificación simple de admin
  const isAdmin = user?.email === 'aiagentsdevelopers@gmail.com';
  
  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        console.log('🔧 Fetching team data...');
        
        // Obtener usuarios/miembros del equipo
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('*');
          
        console.log('🔧 Users query result:', { users, usersError });
        
        // Obtener agentes (si existe la tabla)
        const { data: agents, error: agentsError } = await supabase
          .from('user_agents')
          .select('*');
          
        console.log('🔧 Agents query result:', { agents, agentsError });
        
        // También intentar obtener todas las tablas disponibles
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('*');
          
        console.log('🔧 Companies query result:', { companies, companiesError });
        
        setTeamData(users);
        setAgentsData(agents);
        
        // Log detallado de lo que encontramos
        console.log('🔧 Summary:');
        console.log('  - Users found:', users?.length || 0);
        console.log('  - Agents found:', agents?.length || 0);
        console.log('  - Companies found:', companies?.length || 0);
        
      } catch (err) {
        console.error('🔧 Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
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
          <h1 className="text-3xl font-bold">Team Debug Page 🔧</h1>
          <Badge variant="destructive" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            DEBUG MODE
          </Badge>
        </div>
        
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
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
                <span>Loading team data...</span>
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
        
        {/* Team Members Data */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({teamData?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamData && teamData.length > 0 ? (
                <div className="space-y-3">
                  {teamData.map((member, index) => (
                    <div key={member.id || index} className="p-3 bg-gray-50 rounded border">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><strong>Email:</strong> {member.email || 'N/A'}</p>
                        <p><strong>Name:</strong> {member.full_name || member.name || 'N/A'}</p>
                        <p><strong>Role:</strong> {member.role || 'N/A'}</p>
                        <p><strong>ID:</strong> {member.id}</p>
                        <div className="col-span-2">
                          <p><strong>Raw Data:</strong></p>
                          <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(member, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No team members found</p>
                  <p className="text-sm mt-1">This could mean:</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• The profiles table is empty</li>
                    <li>• Permission issues with the database</li>
                    <li>• Wrong table name</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Agents Data */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Agents ({agentsData?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentsData && agentsData.length > 0 ? (
                <div className="space-y-3">
                  {agentsData.map((agent, index) => (
                    <div key={agent.id || index} className="p-3 bg-gray-50 rounded border">
                      <div className="text-sm">
                        <p><strong>Agent:</strong> {agent.name || agent.agent_name || 'N/A'}</p>
                        <p><strong>User:</strong> {agent.user_id || 'N/A'}</p>
                        <div className="mt-2">
                          <p><strong>Raw Data:</strong></p>
                          <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(agent, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No agents found</p>
                  <p className="text-sm mt-1">This could mean:</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• The user_agents table is empty</li>
                    <li>• Permission issues with the database</li>
                    <li>• Wrong table name</li>
                  </ul>
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
            <p className="text-sm">This page tries to fetch data from:</p>
            <ul className="text-sm mt-1 space-y-1 ml-4">
              <li>• profiles table (for team members)</li>
              <li>• user_agents table (for agents)</li>
              <li>• companies table (for company data)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeamPageSimple;
