
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CallData } from "@/services/callService";

interface CallInfoProps {
  call: CallData;
}

export function CallInfo({ call }: CallInfoProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Call Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date & Time</span>
          <span>{format(call.timestamp, "MMM dd, yyyy HH:mm:ss")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Campaign</span>
          <span>Sales Outreach</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">From → To</span>
          <span>{call.from} → {call.to}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Duration</span>
          <span>{Math.floor(call.duration_sec / 60)}:{(call.duration_sec % 60).toString().padStart(2, '0')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cost</span>
          <span>${call.cost_usd.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Call ID</span>
          <span>{call.call_id}</span>
        </div>
      </CardContent>
    </Card>
  );
}
