
import React from 'react';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';

export function CallDataTableEmpty() {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan={12} className="text-center py-4 text-muted-foreground">
          No call data available
        </TableCell>
      </TableRow>
    </TableBody>
  );
}
