
import { useDirectCallSync } from "./useDirectCallSync";

export const useCallSync = (refetch: () => void) => {
  const { isSyncing, handleDirectSync } = useDirectCallSync();

  const handleSync = async () => {
    await handleDirectSync();
    // Refresh the call data after sync
    refetch();
  };

  return {
    isSyncing,
    handleSync
  };
};
