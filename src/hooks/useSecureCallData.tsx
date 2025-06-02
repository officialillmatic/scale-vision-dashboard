
import { useQuery } from "@tanstack/react-query";
import { retellService } from "@/utils/retellAbstraction";
import { useAuth } from "@/contexts/AuthContext";
import { useSecurityMonitor } from "@/hooks/useSecurityMonitor";
import { toast } from "sonner";

export const useSecureCallData = (limit: number = 100) => {
  const { user } = useAuth();
  const { checkRateLimit, logSecurityEvent } = useSecurityMonitor();

  const { 
    data: calls = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["secure-calls", user?.id, limit],
    queryFn: async () => {
      console.log("[SECURE_CALL_DATA] User ID:", user?.id);
      
      if (!user?.id) {
        console.log("[SECURE_CALL_DATA] Missing user ID");
        return [];
      }

      // Rate limiting check
      const rateLimitOk = await checkRateLimit('fetch_calls');
      if (!rateLimitOk) {
        await logSecurityEvent('rate_limit_exceeded', 'Call data fetch rate limit exceeded');
        toast.error("Rate limit exceeded. Please wait before trying again.");
        throw new Error("Rate limit exceeded");
      }

      console.log("[SECURE_CALL_DATA] Fetching secure call data for user:", user.id);
      
      try {
        const callData = await retellService.getCallData(user.id, limit);
        
        // Log successful access
        await logSecurityEvent('call_data_access', `Successfully fetched ${callData.length} calls`);
        
        console.log("[SECURE_CALL_DATA] Successfully fetched calls:", callData.length);
        return callData;
      } catch (error: any) {
        console.error("[SECURE_CALL_DATA] Error fetching call data:", error);
        
        // Log security event for failed access
        await logSecurityEvent('call_data_access_failed', error.message);
        
        if (error.message?.includes("permission denied")) {
          toast.error("Access denied. Your session may have expired.");
        } else if (error.message?.includes("rate limit")) {
          toast.error("Rate limit exceeded. Please wait before trying again.");
        } else {
          toast.error("Failed to load call data. Please try again.");
        }
        
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry rate limit or permission errors
      if (error?.message?.includes("rate limit") || 
          error?.message?.includes("permission denied")) {
        return false;
      }
      return failureCount < 2;
    }
  });

  const syncCallsSecurely = async () => {
    if (!user?.id) {
      toast.error("Authentication required");
      return;
    }

    // Rate limiting check
    const rateLimitOk = await checkRateLimit('sync_calls');
    if (!rateLimitOk) {
      await logSecurityEvent('rate_limit_exceeded', 'Call sync rate limit exceeded');
      toast.error("Rate limit exceeded. Please wait before syncing again.");
      return;
    }

    try {
      await logSecurityEvent('call_sync_started', 'User initiated call sync');
      const result = await retellService.syncCalls();
      
      await logSecurityEvent('call_sync_completed', `Synced ${result.synced_calls} calls`);
      toast.success(`Successfully synced ${result.synced_calls} calls`);
      
      // Refresh the data
      refetch();
    } catch (error: any) {
      await logSecurityEvent('call_sync_failed', error.message);
      toast.error(`Sync failed: ${error.message}`);
    }
  };

  const testConnectionSecurely = async () => {
    if (!user?.id) {
      toast.error("Authentication required");
      return;
    }

    // Rate limiting check
    const rateLimitOk = await checkRateLimit('test_connection');
    if (!rateLimitOk) {
      toast.error("Rate limit exceeded. Please wait before testing again.");
      return;
    }

    try {
      await logSecurityEvent('connection_test_started', 'User initiated connection test');
      const isConnected = await retellService.testConnection();
      
      if (isConnected) {
        await logSecurityEvent('connection_test_success', 'Connection test successful');
        toast.success("Connection test successful");
      } else {
        await logSecurityEvent('connection_test_failed', 'Connection test failed');
        toast.error("Connection test failed");
      }
    } catch (error: any) {
      await logSecurityEvent('connection_test_error', error.message);
      toast.error(`Connection test error: ${error.message}`);
    }
  };

  return {
    calls,
    isLoading,
    error,
    refetch,
    syncCallsSecurely,
    testConnectionSecurely
  };
};
