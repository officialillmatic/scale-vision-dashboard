
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

// Mock data for the call table
const callData = Array.from({ length: 30 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  
  const statuses = ["dial_no_answer", "user_hangup", "completed", "voicemail", "error"];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  const randomDuration = Math.floor(Math.random() * 400);
  const cost = (randomDuration / 60) * 0.1;
  
  const types = ["Outbound", "Inbound"];
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  return {
    id: `CALL-${(10000 + i).toString()}`,
    timestamp: date,
    duration: randomDuration,
    type: randomType,
    cost: cost.toFixed(2),
    status: randomStatus,
  };
});

interface CallTableProps {
  onSelectCall: (call: any) => void;
}

export function CallTable({ onSelectCall }: CallTableProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Simple filtering logic
  const filteredCalls = callData.filter(call => {
    const matchesSearch = !searchTerm || 
      call.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !date || 
      format(call.timestamp, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    
    return matchesSearch && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "user_hangup":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Hangup</Badge>;
      case "dial_no_answer":
        return <Badge variant="outline" className="border-red-500 text-red-500">No Answer</Badge>;
      case "voicemail":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Voicemail</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-500">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Input
          placeholder="Search by ID or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => setDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {date && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDate(undefined)}
              className="h-9 w-9"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                  <path d="M3 6h18"></path>
                  <path d="M7 12h10"></path>
                  <path d="M10 18h4"></path>
                </svg>
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <input type="checkbox" id="type" className="mr-2" />
                <label htmlFor="type">Type</label>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <input type="checkbox" id="duration" className="mr-2" />
                <label htmlFor="duration">Duration</label>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <input type="checkbox" id="cost" className="mr-2" />
                <label htmlFor="cost">Cost</label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden call-table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Call ID</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCalls.length > 0 ? (
              filteredCalls.map((call) => (
                <TableRow 
                  key={call.id} 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => onSelectCall(call)}
                >
                  <TableCell className="font-medium">
                    {format(call.timestamp, "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>{Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}</TableCell>
                  <TableCell>{call.type}</TableCell>
                  <TableCell>${call.cost}</TableCell>
                  <TableCell>{call.id}</TableCell>
                  <TableCell>{getStatusBadge(call.status)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No calls found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
