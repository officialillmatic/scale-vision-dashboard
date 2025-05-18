
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const DashboardPage = () => {
  const callData = [
    { date: "Mon", calls: 24, minutes: 43 },
    { date: "Tue", calls: 18, minutes: 32 },
    { date: "Wed", calls: 35, minutes: 67 },
    { date: "Thu", calls: 42, minutes: 83 },
    { date: "Fri", calls: 39, minutes: 75 },
    { date: "Sat", calls: 15, minutes: 25 },
    { date: "Sun", calls: 12, minutes: 18 }
  ];
  
  const metricsData = [
    { name: "Phone Calls", value: 528, change: "+24%", color: "#9b87f5" },
    { name: "Total Minutes", value: 1243, change: "+18%", color: "#7E69AB" },
    { name: "Avg. Duration", value: "2:21", change: "-5%", color: "#0EA5E9" },
    { name: "Cost", value: "$124.50", change: "+12%", color: "#10B981" }
  ];

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
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back to your Mr Scale dashboard.
          </p>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricsData.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-baseline">
                  <div className="text-3xl font-bold">{metric.value}</div>
                  <div className={`text-sm ${metric.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                    {metric.change}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs. last 30 days</p>
              </CardContent>
            </Card>
          ))}
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
                  <AreaChart data={callData}>
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
                    data={[
                      { name: "Success", value: 348, color: "#10B981" },
                      { name: "Hangup", value: 103, color: "#F59E0B" },
                      { name: "Voicemail", value: 42, color: "#6366F1" },
                      { name: "No Answer", value: 35, color: "#EF4444" },
                    ]}
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
            <CardDescription>Your latest call and team activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center gap-4 border-b pb-4 last:border-b-0">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    {item % 2 === 0 ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {item % 2 === 0 
                        ? `New call completed (${Math.floor(Math.random() * 5) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')})` 
                        : `Team member activity`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item % 2 === 0
                        ? `Call ID: CALL-${Math.floor(Math.random() * 10000)}`
                        : `User updated settings`}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.floor(Math.random() * 60)} mins ago
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
