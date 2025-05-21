
import React from 'react';
import { formatDuration, formatCurrency } from '@/lib/formatters';
import { CallStatusIcon } from './icons/CallStatusIcon';

interface CallInfoProps {
  duration: number;
  cost: number;
  status: string;
  timestamp: Date;
  fromNumber: string;
  toNumber: string;
}

export const CallInfo: React.FC<CallInfoProps> = ({
  duration,
  cost,
  status,
  timestamp,
  fromNumber,
  toNumber
}) => {
  const formattedDate = new Date(timestamp).toLocaleString();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CallStatusIcon status={status} size={20} />
        <span className="font-semibold capitalize">{status}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="text-muted-foreground">Date & Time</div>
        <div>{formattedDate}</div>
        
        <div className="text-muted-foreground">Duration</div>
        <div>{formatDuration(duration)}</div>
        
        <div className="text-muted-foreground">Cost</div>
        <div>{formatCurrency(cost)}</div>
        
        <div className="text-muted-foreground">From</div>
        <div className="font-mono">{fromNumber}</div>
        
        <div className="text-muted-foreground">To</div>
        <div className="font-mono">{toNumber}</div>
      </div>
    </div>
  );
};
