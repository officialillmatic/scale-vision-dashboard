
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
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">System Logs</CardTitle>
        <CardDescription>Technical logs related to this call</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap custom-scrollbar h-[200px]">
          {`
[${format(new Date(call.timestamp.getTime() - 60000), "yyyy-MM-dd HH:mm:ss")}] INFO: Call initiated from ${call.from}
[${format(new Date(call.timestamp.getTime() - 55000), "yyyy-MM-dd HH:mm:ss")}] INFO: Connecting to destination ${call.to}
[${format(new Date(call.timestamp.getTime() - 50000), "yyyy-MM-dd HH:mm:ss")}] INFO: Call established successfully
[${format(new Date(call.timestamp.getTime() - 40000), "yyyy-MM-dd HH:mm:ss")}] INFO: Recording started
[${format(new Date(call.timestamp.getTime() - 30000), "yyyy-MM-dd HH:mm:ss")}] INFO: Voice activity detected
[${format(new Date(call.timestamp.getTime() - 5000), "yyyy-MM-dd HH:mm:ss")}] INFO: Call ended with status: ${call.call_status}
[${format(new Date(call.timestamp), "yyyy-MM-dd HH:mm:ss")}] INFO: Recording saved to storage
          `}
        </div>
      </CardContent>
    </Card>
  );
}
