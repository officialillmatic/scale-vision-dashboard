
import React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CallDataTableHeader } from './CallDataTableHeader';

export function CallDataTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <CallDataTableHeader />
        <TableBody>
          {Array(5).fill(0).map((_, i) => (
            <TableRow key={i}>
              {Array(12).fill(0).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
