
import React from 'react';
import { Table, TableBody } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CallData } from '@/services/callService';
import { CallDataTableHeader } from './CallDataTableHeader';
import { CallDataTableRow } from './CallDataTableRow';
import { CallDataTableSkeleton } from './CallDataTableSkeleton';
import { CallDataTableEmpty } from './CallDataTableEmpty';

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

  // Check if any call has latency data
  const showLatency = calls.some(call => call.latency_ms);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (filteredCalls.length === 0) {
    return <CallDataTableEmpty calls={calls} searchTerm={searchTerm} date={date} />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <CallDataTableHeader showLatency={showLatency} />
        <TableBody>
          {filteredCalls.map((call) => (
            <CallDataTableRow 
              key={call.id} 
              call={call}
              showLatency={showLatency}
              onSelectCall={onSelectCall}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
