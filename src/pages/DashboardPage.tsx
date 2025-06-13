import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Phone, 
  Users, 
  Settings, 
  CreditCard, 
  Clock, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  PhoneCall,
  Headphones,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EnvWarning } from '@/components/common/EnvWarning';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters';

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [agentData, setAgentData] = useState<any[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [showEnvWarning, setShowEnvWarning] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch credit balance
      await fetchCreditBalance();
      
      // Fetch call history
      await fetchCallHistory();
      
      // Fetch agent data
      await fetchAgentData();
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditBalance = async () => {
    try {
      setCreditsLoading(true);
      const { data, error } = await supabase
        .from('user_credits')
        .select('current_balance')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching credit balance:', error);
        setCreditBalance(null);
      } else {
        setCreditBalance(data?.current_balance || 0);
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      setCreditBalance(null);
    } finally {
      setCreditsLoading(false);
    }
  };

  const fetchCallHistory = async () => {
    try {
      setCallsLoading(true);
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching call history:', error);
        setCallHistory([]);
      } else {
        setCallHistory(data || []);
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
      setCallHistory([]);
    } finally {
      setCallsLoading(false);
    }
  };

  const fetchAgentData = async () => {
    try {
      setAgentsLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('id, retell_agent_id')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error fetching agent data:', error);
        setAgentData([]);
      } else {
        setAgentData(data || []);
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
      setAgentData([]);
    } finally {
      setAgentsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Environment Warning */}
        {showEnvWarning && <EnvWarning />}
        
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.user_metadata?.name || user?.email || 'User'}
          </h1>
          <p className="text-gray-600 mt-1">
            Here's an overview of your account and recent activity
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to="/calls-simple">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <PhoneCall className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Make a Call</h3>
                  <p className="text-sm text-gray-600">Start a new conversation</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/settings">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Settings</h3>
                  <p className="text-sm text-gray-600">Configure your account</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/support">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <Headphones className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Support</h3>
                  <p className="text-sm text-gray-600">Get help with your account</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credit Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Credit Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creditsLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Loading balance...</span>
                  </div>
                ) : creditBalance !== null ? (
                  <div className="space-y-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{formatCurrency(creditBalance)}</span>
                      <span className="text-gray-500 ml-2">available credits</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/settings">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Manage Credits
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-yellow-600 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <span>Unable to load credit balance</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Calls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {callsLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Loading calls...</span>
                  </div>
                ) : callHistory.length > 0 ? (
                  <div className="space-y-3">
                    {callHistory.map((call) => (
                      <div key={call.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="font-medium">
                              {call.agent_name || 'Unknown Agent'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {formatDate(call.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatDuration(call.duration_seconds)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(call.cost || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button asChild variant="outline" className="w-full mt-2">
                      <Link to="/calls-simple">
                        View All Calls
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Phone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No calls yet</h3>
                    <p className="text-gray-500 mb-4">Make your first call to get started</p>
                    <Button asChild>
                      <Link to="/calls-simple">
                        <Phone className="h-4 w-4 mr-2" />
                        Make a Call
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Email</span>
                    <Badge variant="outline" className="font-normal">
                      {user?.email}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Account Type</span>
                    <Badge>Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agents */}
            <div className="space-y-6">
              {agentsLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Loading agents...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                agentData && agentData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Available Agents ({agentData.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {agentData.map((agent) => (
                          <div key={agent.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Agent ID: {agent.retell_agent_id}</p>
                            </div>
                            <Badge variant="outline">Active</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}

              {!agentsLoading && (!agentData || agentData.length === 0) && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No agents configured</h3>
                    <p className="text-gray-500 mb-4">Create your first agent to get started</p>
                    <Button asChild>
                      <Link to="/settings">
                        <Users className="h-4 w-4 mr-2" />
                        Configure Agents
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/profile">
                      <Users className="h-4 w-4 mr-2" />
                      Profile Settings
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/analytics">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/support">
                      <Headphones className="h-4 w-4 mr-2" />
                      Get Support
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
