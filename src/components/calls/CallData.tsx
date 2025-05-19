
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CallData } from "@/services/callService";

interface CallDataViewProps {
  call: CallData;
}

export function CallDataView({ call }: CallDataViewProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Call Data</CardTitle>
        <CardDescription>Raw metrics and data points</CardDescription>
      </CardHeader>
      <CardContent>
        {call ? (
          <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap custom-scrollbar">
            {JSON.stringify({
              id: call.id,
              call_id: call.call_id,
              timestamp: call.timestamp.toISOString(),
              duration_seconds: call.duration_sec,
              cost_usd: call.cost_usd,
              call_status: call.call_status,
              sentiment: call.sentiment,
              disconnection_reason: call.disconnection_reason,
              from: call.from,
              to: call.to,
              audio_url: call.audio_url
            }, null, 2)}
          </pre>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            No call data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
