
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCalls } from '@/hooks/useCalls';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useCurrentUserAgents } from '@/hooks/useCurrentUserAgents';
import { formatCurrency } from '@/lib/formatters';
import { PhoneCall, User, Bot, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UserAgentDashboard() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const { data: userAgentAssignments, isLoading: isLoadingUserAgents } = useCurrentUserAgents();
  const { calls, isLoading: isLoadingCalls } = useCalls();
  const { balance, isLoading: isLoadingBalance, remainingMinutes, isLowBalance } = useUserBalance();

  console.log('🔍 [UserAgentDashboard] Current user:', user?.id);
  console.log('🔍 [UserAgentDashboard] Current company:', company?.id);
  console.log('🔍 [UserAgentDashboard] User agent assignments:', userAgentAssignments);

  // Find the primary agent for the current authenticated user
  const primaryAgent = userAgentAssignments?.find(assignment => 
    assignment.user_id === user?.id && assignment.is_primary
  );

  // If no primary agent, get the first assigned agent
  const assignedAgent = primaryAgent || userAgentAssignments?.[0];

  console.log('🔍 [UserAgentDashboard] Primary agent found:', primaryAgent);
  console.log('🔍 [UserAgentDashboard] Assigned agent found:', assignedAgent);

  // Get agent-specific metrics for the current user
  const agentCalls = calls.filter(call => 
    assignedAgent && call.agent_id === assignedAgent.agent_id && call.user_id === user?.id
  );

  const totalCallDuration = agentCalls.reduce((total, call) => total + (call.duration_sec || 0), 0);
  const totalCallCost = agentCalls.reduce((total, call) => total + (call.cost_usd || 0), 0);
  const avgCallDuration = agentCalls.length > 0 ? totalCallDuration / agentCalls.length : 0;

  // Show loading state while data is being fetched
  if (isLoadingUserAgents || isLoadingCalls || isLoadingBalance) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Universal welcome screen: Show this if user has no agent assignments
  if (!assignedAgent || !userAgentAssignments || userAgentAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
          <Bot className="w-12 h-12 text-blue-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to Dr Scale AI!</h2>
          <p className="text-gray-600 max-w-md">
            Hello {user?.email}! You don't have an AI agent assigned yet. 
            Contact your administrator to get access to an AI agent that can handle your calls and customer interactions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate('/team')} variant="outline">
            View Team Settings
          </Button>
          <Button onClick={() => navigate('/support')}>
            Contact Support
          </Button>
        </div>
      </div>
    );
  }

  // Universal agent dashboard: Show this for any user with agent assignments
  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  Your assigned agent: {assignedAgent.agent_details?.name || 'AI Agent'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {assignedAgent.is_primary ? 'Primary' : 'Secondary'} AI Assistant for {user?.email}
                </p>
                {assignedAgent.agent_details?.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {assignedAgent.agent_details.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {assignedAgent.agent_details?.status || 'Active'}
              </Badge>
              {assignedAgent.is_primary && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Primary Agent
                </Badge>
              )}
            </div>
          </div>

          {/* Show all assigned agents if user has multiple */}
          {userAgentAssignments && userAgentAssignments.length > 1 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                All your assigned agents ({userAgentAssignments.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {userAgentAssignments.map((assignment) => (
                  <Badge 
                    key={assignment.id} 
                    variant={assignment.is_primary ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {assignment.agent_details?.name || 'Unknown Agent'}
                    {assignment.is_primary && ' (Primary)'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Universal Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <Card className={isLowBalance ? "border-amber-400 bg-amber-50" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Balance</p>
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(balance?.balance || 0)}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{remainingMinutes} minutes remaining
                </p>
              </div>
              <DollarSign className={`h-5 w-5 ${isLowBalance ? 'text-amber-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>

        {/* Total Calls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                <h3 className="text-2xl font-bold mt-1">{agentCalls.length}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  With your agent
                </p>
              </div>
              <PhoneCall className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Duration */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Duration</p>
                <h3 className="text-2xl font-bold mt-1">
                  {Math.round(totalCallDuration / 60)}m
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {Math.round(avgCallDuration)}s per call
                </p>
              </div>
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalCallCost)}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  This month
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls for Current User */}
      {agentCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Recent Calls with {assignedAgent.agent_details?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agentCalls.slice(0, 5).map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <PhoneCall className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{call.to || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(call.timestamp).toLocaleDateString()} at {new Date(call.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{Math.round((call.duration_sec || 0) / 60)}m</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(call.cost_usd || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
            {agentCalls.length > 5 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => navigate('/calls')}>
                  View All Your Calls
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
