
import React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CallDataTableHeader } from './CallDataTableHeader';

interface CallDataTableSkeletonProps {
  showLatency: boolean;
}

export function CallDataTableSkeleton({ showLatency }: CallDataTableSkeletonProps) {
  const columnCount = showLatency ? 9 : 8;

  return (
    <div className="overflow-x-auto">
      <Table>
        <CallDataTableHeader showLatency={showLatency} />
        <TableBody>
          {Array(5).fill(0).map((_, i) => (
            <TableRow key={i}>
              {Array(columnCount).fill(0).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
