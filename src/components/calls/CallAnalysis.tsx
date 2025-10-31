
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallData } from "@/services/callService";
import { CallStatusIcon } from "./icons/CallStatusIcon";
import { SentimentIcon } from "./icons/SentimentIcon";
import { DisconnectionIcon } from "./icons/DisconnectionIcon";

interface CallAnalysisProps {
  call: CallData;
}

export function CallAnalysis({ call }: CallAnalysisProps) {
  const getStatusText = (status: string) => {
    switch(status) {
      case "completed": return "Call Successful";
      case "user_hangup": return "User Hung Up";
      case "dial_no_answer": return "No Answer";
      case "voicemail": return "Voicemail Detected";
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Conversation Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CallStatusIcon status={call.call_status} />
            <span>Call Status</span>
          </div>
          <Badge className={call.call_status === "completed" ? "bg-green-500" : "bg-red-500"}>
            {getStatusText(call.call_status)}
          </Badge>
        </div>
        
        {call.sentiment && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SentimentIcon sentiment={call.sentiment} />
              <span>User Sentiment</span>
            </div>
            <Badge variant="outline">
              {call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1)}
            </Badge>
          </div>
        )}
        
        {call.disconnection_reason && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DisconnectionIcon />
              <span>Disconnection</span>
            </div>
            <Badge variant="outline">
              {call.disconnection_reason}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
