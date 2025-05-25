
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Phone, Clock, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardMetrics() {
  const { metrics, isLoading } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-[60px] mb-1" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No calls recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0:00</div>
            <p className="text-xs text-muted-foreground">No calls to average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">No costs incurred</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getChangeIcon = (change: string) => {
    if (change.startsWith('+')) {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    } else if (change.startsWith('-')) {
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    }
    return null;
  };

  const getChangeColor = (change: string) => {
    if (change.startsWith('+')) {
      return "text-green-600";
    } else if (change.startsWith('-')) {
      return "text-red-600";
    }
    return "text-muted-foreground";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalCalls}</div>
          <div className={`text-xs flex items-center gap-1 ${getChangeColor(metrics.percentChange.calls)}`}>
            {getChangeIcon(metrics.percentChange.calls)}
            {metrics.percentChange.calls} from last week
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalMinutes}</div>
          <div className={`text-xs flex items-center gap-1 ${getChangeColor(metrics.percentChange.minutes)}`}>
            {getChangeIcon(metrics.percentChange.minutes)}
            {metrics.percentChange.minutes} from last week
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avgDuration}</div>
          <div className={`text-xs flex items-center gap-1 ${getChangeColor(metrics.percentChange.duration)}`}>
            {getChangeIcon(metrics.percentChange.duration)}
            {metrics.percentChange.duration} from last week
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalCost}</div>
          <div className={`text-xs flex items-center gap-1 ${getChangeColor(metrics.percentChange.cost)}`}>
            {getChangeIcon(metrics.percentChange.cost)}
            {metrics.percentChange.cost} from last week
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
