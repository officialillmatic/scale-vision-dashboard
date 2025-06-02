
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Play, Phone, PhoneOff, Clock, Bot } from 'lucide-react';
import { RetellCall } from '@/hooks/useRetellCalls';

interface RetellCallDataTableProps {
  calls: RetellCall[];
  isLoading: boolean;
  searchTerm: string;
  date: Date | undefined;
  onSelectCall: (call: RetellCall) => void;
}

export function RetellCallDataTable({ 
  calls, 
  isLoading, 
  searchTerm, 
  date, 
  onSelectCall 
}: RetellCallDataTableProps) {
  // Filter calls based on search term and date
  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.from_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.call_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !date || 
      new Date(call.start_timestamp).toDateString() === date.toDateString();
    
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (filteredCalls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
        <p className="text-gray-600">
          {searchTerm || date ? 'Try adjusting your filters' : 'No call data available yet'}
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
                    {formatDistanceToNow(new Date(call.start_timestamp), { addSuffix: true })}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(call.start_timestamp).toLocaleString()}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-sm">
                    {call.from_number || 'Unknown'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <PhoneOff className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-sm">
                    {call.to_number || 'Unknown'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-sm flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    {call.agent?.name || 'Unknown Agent'}
                  </span>
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
                  {call.recording_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(call.recording_url, '_blank');
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
