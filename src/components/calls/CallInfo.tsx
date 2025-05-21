
import React from 'react';
import { formatDuration, formatCurrency } from '@/lib/formatters';
import { CallStatusIcon } from './icons/CallStatusIcon';
import { CallData } from '@/services/callService';

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
  const timestamp = isCallObject ? props.call.timestamp : props.timestamp;
  const fromNumber = isCallObject ? props.call.from : props.fromNumber;
  const toNumber = isCallObject ? props.call.to : props.toNumber;
  
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CallStatusIcon status={status} size={5} />
        <span className="font-semibold capitalize">{status}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
        
        <div className="text-muted-foreground">From</div>
        <div className="font-mono">{fromNumber}</div>
        
        <div className="text-muted-foreground">To</div>
        <div className="font-mono">{toNumber}</div>
      </div>
    </div>
  );
}
