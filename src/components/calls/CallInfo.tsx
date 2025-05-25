
import React from 'react';
import { formatDuration, formatCurrency } from '@/lib/formatters';
import { CallStatusIcon } from './icons/CallStatusIcon';
import { CallData } from '@/services/callService';
import { Badge } from '@/components/ui/badge';
import { Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CallInfoProps {
  duration: number;
  cost: number;
  status: string;
  timestamp: Date;
  fromNumber: string;
  toNumber: string;
  agent?: { name: string; rate_per_minute?: number };
}

// New interface that accepts a full call object
interface CallInfoWithCallObjectProps {
  call: CallData;
}

export const CallInfo: React.FC<CallInfoProps | CallInfoWithCallObjectProps> = (props) => {
  // Determine if we're using the call object or individual props
  const isCallObject = 'call' in props;
  
  // Extract values from either the call object or the individual props
  const duration = isCallObject ? props.call.duration_sec : props.duration;
  const cost = isCallObject ? props.call.cost_usd : props.cost;
  const status = isCallObject ? props.call.call_status : props.status;
  const timestamp = isCallObject ? (props.call.start_time || props.call.timestamp) : props.timestamp;
  const fromNumber = isCallObject ? (props.call.from_number || props.call.from) : props.fromNumber;
  const toNumber = isCallObject ? (props.call.to_number || props.call.to) : props.toNumber;
  
  const formattedDate = new Date(timestamp).toLocaleString();
  const durationMin = duration / 60;
  
  // Calculate the rate per minute (if available)
  let ratePerMinute = 0.02; // Default rate
  let agentName = "System Agent";
  
  if (isCallObject && props.call.agent) {
    ratePerMinute = props.call.agent.rate_per_minute || ratePerMinute;
    agentName = props.call.agent.name;
  } else if (!isCallObject && props.agent) {
    ratePerMinute = props.agent.rate_per_minute || ratePerMinute;
    agentName = props.agent.name;
  }

  // Get additional Retell data if using call object
  const sentimentScore = isCallObject ? props.call.sentiment_score : null;
  const disposition = isCallObject ? props.call.disposition : null;
  const recordingUrl = isCallObject ? props.call.recording_url : null;
  const transcriptUrl = isCallObject ? props.call.transcript_url : null;
  const latencyMs = isCallObject ? props.call.latency_ms : null;
  const callId = isCallObject ? props.call.call_id : null;
  const disconnectionReason = isCallObject ? props.call.disconnection_reason : null;

  const getSentimentColor = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 0.7) return "default";
    if (score >= 0.3) return "outline";
    return "destructive";
  };

  const getSentimentLabel = (score: number | null) => {
    if (score === null) return "Unknown";
    if (score >= 0.7) return "Positive";
    if (score >= 0.3) return "Neutral";
    return "Negative";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CallStatusIcon status={status} size={5} />
        <span className="font-semibold capitalize">{status}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {callId && (
          <>
            <div className="text-muted-foreground">Call ID</div>
            <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
              {callId}
            </div>
          </>
        )}
        
        <div className="text-muted-foreground">Date & Time</div>
        <div>{formattedDate}</div>
        
        <div className="text-muted-foreground">Duration</div>
        <div>{formatDuration(duration)}</div>
        
        <div className="text-muted-foreground">Cost</div>
        <div>{formatCurrency(cost)}</div>
        
        <div className="text-muted-foreground">Rate</div>
        <div>{formatCurrency(ratePerMinute)}/min</div>
        
        <div className="text-muted-foreground">Agent</div>
        <div>{agentName}</div>
        
        <div className="text-muted-foreground">AI Number</div>
        <div className="font-mono">{fromNumber}</div>
        
        <div className="text-muted-foreground">Customer Number</div>
        <div className="font-mono">{toNumber}</div>

        {latencyMs !== null && latencyMs > 0 && (
          <>
            <div className="text-muted-foreground">End-to-End Latency</div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{latencyMs}ms</span>
              <Badge variant={latencyMs < 100 ? "default" : latencyMs < 300 ? "outline" : "destructive"}>
                {latencyMs < 100 ? "Excellent" : latencyMs < 300 ? "Good" : "Slow"}
              </Badge>
            </div>
          </>
        )}

        {disposition && (
          <>
            <div className="text-muted-foreground">Disposition</div>
            <div>
              <Badge variant="outline">{disposition}</Badge>
            </div>
          </>
        )}

        {disconnectionReason && (
          <>
            <div className="text-muted-foreground">End Reason</div>
            <div>
              <Badge variant="outline">{disconnectionReason}</Badge>
            </div>
          </>
        )}

        {sentimentScore !== null && (
          <>
            <div className="text-muted-foreground">Sentiment</div>
            <div className="flex items-center gap-2">
              <Badge variant={getSentimentColor(sentimentScore)}>
                {getSentimentLabel(sentimentScore)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {(sentimentScore * 100).toFixed(0)}%
              </span>
            </div>
          </>
        )}

        {recordingUrl && (
          <>
            <div className="text-muted-foreground">Recording</div>
            <div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(recordingUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Play Recording
              </Button>
            </div>
          </>
        )}

        {transcriptUrl && (
          <>
            <div className="text-muted-foreground">Transcript Download</div>
            <div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(transcriptUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
