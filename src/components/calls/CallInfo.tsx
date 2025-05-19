
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CallData } from "@/services/callService";
import { PhoneCall, Voicemail, HelpCircle } from "lucide-react";

interface CallInfoProps {
  call: CallData;
}

// Helper function to get call type icon
const getCallTypeIcon = (callType: string) => {
  switch (callType) {
    case 'phone_call':
      return <PhoneCall className="h-4 w-4" />;
    case 'voicemail':
      return <Voicemail className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
};

// Helper function to format call type for display
const formatCallType = (callType: string) => {
  switch (callType) {
    case 'phone_call':
      return 'Phone Call';
    case 'voicemail':
      return 'Voicemail';
    case 'other':
      return 'Other';
    default:
      return callType.charAt(0).toUpperCase() + callType.slice(1).replace('_', ' ');
  }
};

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
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Call Type</span>
          <span className="flex items-center gap-1">
            {getCallTypeIcon(call.call_type)}
            {formatCallType(call.call_type)}
          </span>
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
