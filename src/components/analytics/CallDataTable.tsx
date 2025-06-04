
import React from 'react';
import { Table, TableBody } from '@/components/ui/table';
import { CallData } from '@/types/analytics';
import { CallDataTableHeader } from './CallDataTableHeader';
import { CallDataTableRow } from './CallDataTableRow';
import { CallDataTableSkeleton } from './CallDataTableSkeleton';
import { CallDataTableEmpty } from './CallDataTableEmpty';

interface CallDataTableProps {
  data: CallData[];
  isLoading: boolean;
}

export function CallDataTable({ data, isLoading }: CallDataTableProps) {
  if (isLoading) {
    return <CallDataTableSkeleton />;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <CallDataTableHeader />
        {data.length === 0 ? (
          <CallDataTableEmpty />
        ) : (
          <TableBody>
            {data.map((call) => (
              <CallDataTableRow key={call.id} call={call} />
            ))}
          </TableBody>
        )}
      </Table>
    </div>
  );
}
