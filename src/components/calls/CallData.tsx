
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CallData } from "@/services/callService";
import { useAuth } from "@/contexts/AuthContext";

interface CallDataViewProps {
  call: CallData;
}

export function CallDataView({ call }: CallDataViewProps) {
  const { user } = useAuth();
  const isAdmin = user?.email?.includes('admin') || false; // Simple admin check, replace with your actual admin check

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Call Data</CardTitle>
        <CardDescription>Raw metrics and data points</CardDescription>
      </CardHeader>
      <CardContent>
        {call ? (
          <>
            {/* Show latency information above the JSON */}
            {call.latency_ms !== null && (
              <div className="mb-3 p-3 bg-muted rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Call Latency</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    call.latency_ms < 100 
                      ? 'bg-green-100 text-green-800' 
                      : call.latency_ms < 300 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {call.latency_ms} ms
                  </span>
                </div>
              </div>
            )}

            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap custom-scrollbar">
              {JSON.stringify({
                id: call.id,
                call_id: call.call_id,
                timestamp: call.timestamp.toISOString(),
                duration_seconds: call.duration_sec,
                cost_usd: call.cost_usd,
                call_status: call.call_status,
                call_type: call.call_type,
                sentiment: call.sentiment,
                disconnection_reason: call.disconnection_reason,
                from: call.from,
                to: call.to,
                audio_url: call.audio_url,
                ...(isAdmin && { 
                  latency_ms: call.latency_ms,
                  user_id: call.user_id 
                }) // Only show these fields for admins
              }, null, 2)}
            </pre>
          </>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            No call data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
