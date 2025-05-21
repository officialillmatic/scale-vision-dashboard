
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CallData } from '@/pages/AnalyticsPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDuration } from '@/lib/formatters';

interface CallDataTableProps {
  data: CallData[];
  isLoading: boolean;
}

export function CallDataTable({ data, isLoading }: CallDataTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                No call data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((call) => (
              <TableRow key={call.id}>
                <TableCell>{format(call.timestamp, 'yyyy-MM-dd HH:mm')}</TableCell>
                <TableCell>{call.from}</TableCell>
                <TableCell>{call.to}</TableCell>
                <TableCell>{formatDuration(call.duration_sec)}</TableCell>
                <TableCell>{formatCurrency(call.cost_usd)}</TableCell>
                <TableCell>{call.agent?.name || 'N/A'}</TableCell>
                <TableCell>
                  <Badge 
                    variant={call.call_status === 'completed' ? 'default' : 
                            call.call_status === 'in_progress' ? 'outline' : 'destructive'}
                    className={call.call_status === 'completed' ? 'bg-green-500 hover:bg-green-600' : 
                              call.call_status === 'in_progress' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                  >
                    {call.call_status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
