
import { useCallFetch } from "./useCallFetch";
import { useCallSync } from "./useCallSync";
import { useCallFilters } from "./useCallFilters";
import { CallData } from "@/services/callService";

export const useCallData = (initialCalls: CallData[] = []) => {
  // Fetch calls data
  const {
    calls: fetchedCalls,
    isLoading,
    error,
    refetch
  } = useCallFetch();

  // Use fetched calls or fall back to initial calls
  const calls = fetchedCalls.length > 0 ? fetchedCalls : initialCalls;

  // Sync functionality
  const { handleSync, isSyncing } = useCallSync(refetch);

  // Filtering functionality
  const {
    searchTerm,
    setSearchTerm,
    date,
    setDate,
    filteredAndSortedCalls
  } = useCallFilters(calls);

  return {
    calls: filteredAndSortedCalls,
    isLoading,
    error,
    isSyncing,
    searchTerm,
    setSearchTerm,
    date,
    setDate,
    handleSync,
    refetch
  };
};
