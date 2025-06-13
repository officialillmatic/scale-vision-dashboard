import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { cn } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AgentAssignment {
  id: string;
  agent_id: string;
  user_id: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
}

interface CallCount {
  date: string;
  count: number;
}

const fetchAgentAssignments = async (userId: string) => {
  const { data, error } = await supabase
    .from('agent_assignments')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching agent assignments:', error);
    throw error;
  }

  return data;
};

const fetchGlobalAgents = async (companyId: string) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('company_id', companyId);

  if (error) {
    console.error('Error fetching global agents:', error);
    throw error;
  }

  return data;
};

const fetchCallCounts = async (agentIds: string[]) => {
  if (!agentIds || agentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('call_analytics_daily')
    .select('date, count')
    .in('agent_id', agentIds)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching call counts:', error);
    throw error;
  }

  return data;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const DashboardPage: React.FC = () => {
  const { user, company, isCompanyLoading } = useAuth();
  const { can } = useRole();
  const { isSuperAdmin } = useSuperAdmin();

  const userId = user?.id || '';
  const companyId = company?.id || '';

  const { data: agentAssignments, isLoading: isAssignmentsLoading, error: assignmentsError } = useQuery(
    ['agentAssignments', userId],
    () => fetchAgentAssignments(userId),
    { enabled: !!userId }
  );

  const { data: globalAgents, isLoading: isGlobalAgentsLoading, error: globalAgentsError } = useQuery(
    ['globalAgents', companyId],
    () => fetchGlobalAgents(companyId),
    { enabled: !!companyId && isSuperAdmin }
  );

  const agentIds = agentAssignments?.map(assignment => assignment.agent_id) || [];

  const { data: callCounts, isLoading: isCallCountsLoading, error: callCountsError } = useQuery(
    ['callCounts', agentIds],
    () => {
      let effectiveAgentIds: string[] = [];

      if (agentAssignments && agentAssignments.length > 0) {
        effectiveAgentIds = agentAssignments.map(assignment => assignment.agent_id);
      } else {
        effectiveAgentIds = globalAgents?.map(agent => agent.id) || [];
      }

      return fetchCallCounts(effectiveAgentIds);
    },
    { enabled: !!userId && !!companyId }
  );

  if (isCompanyLoading) {
    return <DashboardLayout isLoading={true} />;
  }

  if (!can.viewDashboard) {
    return (
      <DashboardLayout>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view the dashboard. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const chartData = {
    labels: callCounts?.map(item => formatDate(item.date)) || [],
    datasets: [
      {
        label: 'Daily Calls',
        data: callCounts?.map(item => item.count) || [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
        text: 'Daily Call Analytics',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Call Count',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Welcome to your AI Call Analytics Dashboard</p>
          </div>
          <Button asChild>
            <Link to="/analytics">
              Go to Analytics <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">{callCounts?.reduce((sum, item) => sum + item.count, 0) || 0}</div>
              <p className="text-sm text-gray-500">Lifetime calls analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{agentAssignments?.length || 0}</div>
              <p className="text-sm text-gray-500">Agents currently assigned to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">
                {callCounts?.length ? (callCounts.reduce((sum, item) => sum + item.count, 0) / callCounts.length).toFixed(1) : 0}
              </div>
              <p className="text-sm text-gray-500">Average calls per day</p>
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Call Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isCallCountsLoading ? (
              <div className="text-center py-12">Loading call data...</div>
            ) : callCountsError ? (
              <div className="text-center py-12 text-red-500">Error loading call data.</div>
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </CardContent>
        </Card>

        <div className="text-center text-gray-500">
          <p>
            Data is updated daily. More detailed analytics are available in the <Link to="/analytics" className="text-blue-600">Analytics</Link> section.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
