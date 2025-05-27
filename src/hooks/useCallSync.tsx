
import { useSync } from "./useCallSync/useSync";
import { useWebhookRegistration } from "./useCallSync/useWebhookRegistration";
import { useApiTest } from "./useCallSync/useApiTest";

export const useCallSync = (refetch: () => void) => {
  const { 
    mutate: handleSync, 
    isPending: isSyncing 
  } = useSync(refetch);

  const { 
    mutate: handleRegisterWebhook, 
    isPending: isRegisteringWebhook 
  } = useWebhookRegistration();

  const { 
    mutate: handleTestSync, 
    isPending: isTesting 
  } = useApiTest();

  return {
    handleSync,
    isSyncing,
    handleRegisterWebhook,
    isRegisteringWebhook,
    handleTestSync,
    isTesting
  };
};

export * from "./useCallSync/types";
