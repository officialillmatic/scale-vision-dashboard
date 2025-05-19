
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function CallStats() {
  const { metrics, callOutcomes, isLoading } = useDashboardData();

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-12 gap-4 mb-6">
        <Card className="xl:col-span-3">
          <CardContent className="pt-6 flex justify-center items-center h-[124px]">
            <LoadingSpinner size="md" />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardContent className="pt-6 flex justify-center items-center h-[124px]">
            <LoadingSpinner size="md" />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardContent className="pt-6 flex justify-center items-center h-[124px]">
            <LoadingSpinner size="md" />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardContent className="pt-6 flex justify-center items-center h-[124px]">
            <LoadingSpinner size="md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-12 gap-4 mb-6">
      <Card className="xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.totalCalls}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className={metrics.percentChange.calls.startsWith('+') ? "text-green-500" : "text-red-500"}>
              {metrics.percentChange.calls}
            </span> from last period
          </p>
        </CardContent>
      </Card>
      
      <Card className="xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.totalMinutes}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className={metrics.percentChange.minutes.startsWith('+') ? "text-green-500" : "text-red-500"}>
              {metrics.percentChange.minutes}
            </span> from last period
          </p>
        </CardContent>
      </Card>
      
      <Card className="xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.totalCost}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className={metrics.percentChange.cost.startsWith('+') ? "text-green-500" : "text-red-500"}>
              {metrics.percentChange.cost}
            </span> from last period
          </p>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-1 xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Call Outcomes</CardTitle>
        </CardHeader>
        <CardContent className="h-[120px]">
          {callOutcomes.some(outcome => outcome.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={callOutcomes}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={45}
                  dataKey="value"
                >
                  {callOutcomes.map((entry, index) => (
                    <Cell key={`cell-outcome-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
