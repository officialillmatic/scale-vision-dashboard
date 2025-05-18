
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export function CallStats() {
  const stats = {
    total: 528,
    minutes: 1243,
    cost: 124.50,
    outcomes: [
      { name: "Successful", value: 348, color: "#10B981" },
      { name: "Hangup", value: 103, color: "#F59E0B" },
      { name: "Voicemail", value: 42, color: "#6366F1" },
      { name: "No Answer", value: 35, color: "#EF4444" }
    ],
    sentiment: [
      { name: "Positive", value: 214, color: "#10B981" },
      { name: "Neutral", value: 267, color: "#6B7280" },
      { name: "Negative", value: 47, color: "#EF4444" }
    ]
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 shadow rounded text-sm">
          <p>{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-12 gap-4 mb-6">
      <Card className="xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </CardContent>
      </Card>
      
      <Card className="xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.minutes}</div>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </CardContent>
      </Card>
      
      <Card className="xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">${stats.cost.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-1 xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
        </CardHeader>
        <CardContent className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.sentiment}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={45}
                dataKey="value"
              >
                {stats.sentiment.map((entry, index) => (
                  <Cell key={`cell-sentiment-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
