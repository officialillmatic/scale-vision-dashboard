
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CallData } from '@/services/callService';
import { formatDistanceToNow } from 'date-fns';
import { Play, Phone, PhoneOff } from 'lucide-react';

interface CallDataTableProps {
  calls: CallData[];
  isLoading: boolean;
  searchTerm: string;
  date: Date | undefined;
  onSelectCall: (call: CallData) => void;
}

export function CallDataTable({ 
  calls, 
  isLoading, 
  searchTerm, 
  date, 
  onSelectCall 
}: CallDataTableProps) {
  // Filter calls based on search term and date
  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.call_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !date || 
      call.timestamp.toDateString() === date.toDateString();
    
    return matchesSearch && matchesDate;
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (filteredCalls.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Phone className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
        <p className="text-gray-500">
          {calls.length === 0 
            ? "No calls have been synced yet. Try clicking 'Sync Calls' to fetch data from Retell AI."
            : "No calls match your current filters. Try adjusting your search criteria."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCalls.map((call) => (
            <TableRow 
              key={call.id} 
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
