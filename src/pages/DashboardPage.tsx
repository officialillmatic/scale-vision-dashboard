
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { format } from 'date-fns';

const DashboardPage = () => {
  const { metrics, dailyCallData, callOutcomes, recentCalls, isLoading } = useDashboardData();
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 shadow rounded text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-brand-purple">{`Calls: ${payload[0].value}`}</p>
          <p className="text-brand-deep-purple">{`Minutes: ${payload[1].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back to your Mr Scale dashboard.
          </p>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Phone Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-baseline">
                <div className="text-3xl font-bold">{isLoading ? "..." : metrics.totalCalls}</div>
                <div className={`text-sm ${metrics.percentChange.calls.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                  {metrics.percentChange.calls}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs. last 30 days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-baseline">
                <div className="text-3xl font-bold">{isLoading ? "..." : Math.round(metrics.totalMinutes)}</div>
                <div className={`text-sm ${metrics.percentChange.minutes.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                  {metrics.percentChange.minutes}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs. last 30 days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-baseline">
                <div className="text-3xl font-bold">{isLoading ? "..." : metrics.avgDuration}</div>
                <div className={`text-sm ${metrics.percentChange.duration.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                  {metrics.percentChange.duration}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs. last 30 days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-baseline">
                <div className="text-3xl font-bold">{isLoading ? "..." : metrics.totalCost}</div>
                <div className={`text-sm ${metrics.percentChange.cost.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                  {metrics.percentChange.cost}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs. last 30 days</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Volume</CardTitle>
              <CardDescription>Number of calls over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyCallData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#9b87f5" 
                      fill="#9b87f5" 
                      fillOpacity={0.2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="minutes" 
                      stroke="#7E69AB" 
                      fill="#7E69AB" 
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call Outcomes</CardTitle>
              <CardDescription>Distribution of call results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={callOutcomes}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      name="Count"
                      fill="#9b87f5"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest call activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
                </div>
              ) : recentCalls.length > 0 ? (
                recentCalls.map((call) => (
                  <div key={call.id} className="flex items-center gap-4 border-b pb-4 last:border-b-0">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        Call to {call.to} ({Math.floor(call.duration_sec / 60)}:{(call.duration_sec % 60).toString().padStart(2, '0')})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Call ID: {call.call_id}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(call.timestamp, 'MMM d, h:mm a')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No recent calls found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
