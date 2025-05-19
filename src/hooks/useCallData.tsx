
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCalls, CallData } from "@/services/callService";
import { useAuth } from "@/contexts/AuthContext";
import { handleError } from "@/lib/errorHandling";

export function useCallData() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();

  // Fetch calls from the database
  const { 
    data: calls = [], 
    isLoading,
    error
  } = useQuery({
    queryKey: ["calls", company?.id],
    queryFn: () => company?.id ? fetchCalls(company.id) : Promise.resolve([]),
    enabled: !!company?.id,
  });

  // Sync calls mutation
  const { 
    mutate: handleSync, 
    isPending: isSyncing 
  } = useMutation({
    mutationFn: async () => {
      try {
        const { error } = await supabase.functions.invoke("sync-calls");
        if (error) throw error;
      } catch (error) {
        return handleError(error, {
          fallbackMessage: "Failed to sync calls",
          showToast: false, // We'll handle toast in onError
          logToConsole: true
        });
      }
    },
    onSuccess: () => {
      toast.success("Calls synchronized successfully");
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
    onError: (error: any) => {
      console.error("Error syncing calls:", error);
      toast.error(error.message || "Failed to sync calls");
    },
  });

  // Filter calls based on search term and date
  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      searchTerm === "" ||
      call.from.includes(searchTerm) ||
      call.to.includes(searchTerm) ||
      (call.transcript && call.transcript.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDate =
      !date ||
      new Date(call.timestamp).toDateString() === date.toDateString();

    return matchesSearch && matchesDate;
  });

  // Sort calls by timestamp, most recent first
  const sortedCalls = [...filteredCalls].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return {
    calls: sortedCalls,
    isLoading,
    error,
    isSyncing,
    searchTerm,
    setSearchTerm,
    date,
    setDate,
    handleSync,
  };
}
