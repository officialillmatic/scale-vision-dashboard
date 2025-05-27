
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CallData } from '@/services/callService';
import { formatDistanceToNow } from 'date-fns';
import { Play, Phone, PhoneOff, Clock } from 'lucide-react';

interface CallDataTableRowProps {
  call: CallData;
  showLatency: boolean;
  onSelectCall: (call: CallData) => void;
}

export function CallDataTableRow({ call, showLatency, onSelectCall }: CallDataTableRowProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      in_progress: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
      failed: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      unknown: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    );
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(cost);
  };

  return (
    <TableRow 
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => onSelectCall(call)}
    >
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span className="text-sm">
            {formatDistanceToNow(call.timestamp, { addSuffix: true })}
          </span>
          <span className="text-xs text-gray-500">
            {call.timestamp.toLocaleString()}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-sm">
            {call.from_number || call.from || 'Unknown'}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <PhoneOff className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-sm">
            {call.to_number || call.to || 'Unknown'}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {call.agent?.name || 'Unknown Agent'}
          </span>
          {call.agent?.rate_per_minute && (
            <span className="text-xs text-gray-500">
              ${call.agent.rate_per_minute}/min
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm">
          {formatDuration(call.duration_sec)}
        </span>
      </TableCell>
      <TableCell>
        {getStatusBadge(call.call_status)}
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm font-medium">
          {formatCost(call.cost_usd)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {call.audio_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                window.open(call.audio_url, '_blank');
              }}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCall(call);
            }}
          >
            View
          </Button>
        </div>
      </TableCell>
      {showLatency && (
        <TableCell>
          {call.latency_ms ? (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{call.latency_ms}ms</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
