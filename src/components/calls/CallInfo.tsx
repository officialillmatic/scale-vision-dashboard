
import React from 'react';
import { formatDuration, formatCurrency } from '@/lib/formatters';
import { CallStatusIcon } from './icons/CallStatusIcon';
import { CallData } from '@/services/callService';
import { Badge } from '@/components/ui/badge';

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

        {disposition && (
          <>
            <div className="text-muted-foreground">Disposition</div>
            <div>
              <Badge variant="outline">{disposition}</Badge>
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
              <a 
                href={recordingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Play Recording
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
