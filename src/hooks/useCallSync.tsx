
import { useDirectCallSync } from "./useDirectCallSync";
import { useState } from "react";
import { toast } from "sonner";

export const useCallSync = (refetch: () => void) => {
  const { isSyncing, handleDirectSync } = useDirectCallSync();
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSync = async () => {
    await handleDirectSync();
    // Refresh the call data after sync
    refetch();
  };

  const handleRegisterWebhook = async () => {
    setIsRegisteringWebhook(true);
    try {
      // Placeholder for webhook registration
      toast.info("Webhook registration not implemented");
    } catch (error: any) {
      toast.error(`Webhook registration failed: ${error.message}`);
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const handleTestSync = async () => {
    setIsTesting(true);
    try {
      const retellApiKey = import.meta.env.VITE_RETELL_API_KEY;
      if (!retellApiKey) {
        throw new Error("RETELL_API_KEY not configured");
      }

      const response = await fetch('https://api.retellai.com/v2/list-calls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 1 })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      toast.success(`API test successful - found ${data.calls?.length || 0} calls`);

    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return {
    isSyncing,
    handleSync,
    handleRegisterWebhook,
    isRegisteringWebhook,
    handleTestSync,
    isTesting
  };
};
