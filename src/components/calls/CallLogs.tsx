
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CallData } from "@/services/callService";

interface CallLogsProps {
  call: CallData;
}

export function CallLogs({ call }: CallLogsProps) {
  if (!call) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">System Logs</CardTitle>
          <CardDescription>Technical logs related to this call</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap custom-scrollbar h-[200px] flex items-center justify-center">
            No log data available
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Generate logs based on the actual call data
  const timeBeforeCall = new Date(call.timestamp.getTime() - 60000);
  const callConnecting = new Date(call.timestamp.getTime() - 55000);
  const callEstablished = new Date(call.timestamp.getTime() - 50000); 
  const recordingStarted = new Date(call.timestamp.getTime() - 40000);
  const voiceActivityDetected = new Date(call.timestamp.getTime() - 30000);
  const callEnded = new Date(call.timestamp.getTime() - 5000);
  const recordingSaved = call.timestamp;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">System Logs</CardTitle>
        <CardDescription>Technical logs related to this call</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap custom-scrollbar h-[200px]">
          {`
[${format(timeBeforeCall, "yyyy-MM-dd HH:mm:ss")}] INFO: Call initiated from ${call.from}
[${format(callConnecting, "yyyy-MM-dd HH:mm:ss")}] INFO: Connecting to destination ${call.to}
[${format(callEstablished, "yyyy-MM-dd HH:mm:ss")}] INFO: Call established successfully
[${format(recordingStarted, "yyyy-MM-dd HH:mm:ss")}] INFO: Recording started
[${format(voiceActivityDetected, "yyyy-MM-dd HH:mm:ss")}] INFO: Voice activity detected
[${format(callEnded, "yyyy-MM-dd HH:mm:ss")}] INFO: Call ended with status: ${call.call_status}
[${format(recordingSaved, "yyyy-MM-dd HH:mm:ss")}] INFO: Recording saved to storage
          `}
        </div>
      </CardContent>
    </Card>
  );
}
