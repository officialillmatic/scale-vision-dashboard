
import { Loader2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

interface CallTableListEmptyProps {
  isLoading: boolean;
  searchTerm: string;
  date: Date | undefined;
  colSpan: number;
}

export function CallTableListEmpty({ isLoading, searchTerm, date, colSpan }: CallTableListEmptyProps) {
  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="h-24 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center">
        {searchTerm || date ? "No matching calls found." : "No calls found. Try syncing your call history."}
      </TableCell>
    </TableRow>
  );
}
