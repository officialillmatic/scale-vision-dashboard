
import { useSync } from "./useSync";
import { useWebhookRegistration } from "./useWebhookRegistration";
import { useApiTest } from "./useApiTest";

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

export * from "./types";
