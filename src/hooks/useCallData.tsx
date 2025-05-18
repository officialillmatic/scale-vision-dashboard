
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchCalls, syncRetellCalls, CallData } from "@/services/callService";

export function useCallData() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data: calls, isLoading, refetch } = useQuery({
    queryKey: ['calls'],
    queryFn: fetchCalls,
    initialData: [],
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const success = await syncRetellCalls();
      if (success) {
        refetch();
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Filtering logic
  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.call_status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !date || 
      format(call.timestamp, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    
    return matchesSearch && matchesDate;
  });

  return {
    calls: filteredCalls,
    isLoading,
    isSyncing,
    searchTerm,
    setSearchTerm,
    date,
    setDate,
    handleSync
  };
}
