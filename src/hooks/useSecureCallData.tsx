import { useQuery } from "@tanstack/react-query";
import { retellService } from "@/utils/retellAbstraction";
import { useAuth } from "@/contexts/AuthContext";
import { useSecurityMonitor } from "@/hooks/useSecurityMonitor";
import { toast } from "sonner";

export const useSecureCallData = (limit: number = 100) => {
  const { company, user } = useAuth();
  const { checkRateLimit, logSecurityEvent } = useSecurityMonitor();

  // LOG DE DEBUG AL INICIO
  console.log("[HOOK_EXECUTION] useSecureCallData ejecutándose", { 
    user: user?.id, 
    company: company?.id,
    userExists: !!user?.id,
    companyExists: !!company?.id,
    limit
  });

  const { 
    data: calls = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["secure-calls", user?.id, limit],
    queryFn: async () => {
      console.log("[DEBUG] User ID:", user?.id, "Company:", company);
      
      if (!user?.id) {
        console.log("[SECURE_CALL_DATA] Missing user ID - returning empty array");
        return [];
      }

      // Rate limiting check
      try {
        const rateLimitOk = await checkRateLimit('fetch_calls');
        if (!rateLimitOk) {
          console.log("[SECURE_CALL_DATA] Rate limit exceeded");
          await logSecurityEvent('rate_limit_exceeded', 'Call data fetch rate limit exceeded');
          toast.error("Rate limit exceeded. Please wait before trying again.");
          throw new Error("Rate limit exceeded");
        }
      } catch (rateLimitError) {
        console.log("[SECURE_CALL_DATA] Rate limit check failed, continuing anyway:", rateLimitError);
      }

      console.log("[SECURE_CALL_DATA] Fetching secure call data for user:", user.id);
      
      try {
        // USAR user.id en lugar de company.id
        const callData = await retellService.getCallData(user.id, limit);
        
        console.log("[SECURE_CALL_DATA] Successfully fetched calls:", callData);
        
        // Log successful access
        try {
          await logSecurityEvent('call_data_access', `Successfully fetched ${callData.length} calls`);
        } catch (logError) {
          console.log("[SECURE_CALL_DATA] Logging failed but continuing:", logError);
        }
        
        return callData;
      } catch (error: any) {
        console.error("[SECURE_CALL_DATA] Error fetching call data:", error);
        
        // Log security event for failed access
        try {
          await logSecurityEvent('call_data_access_failed', error.message);
        } catch (logError) {
          console.log("[SECURE_CALL_DATA] Error logging failed:", logError);
        }
        
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
    enabled: !!user?.id, // SOLO verificar user?.id
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      console.log("[SECURE_CALL_DATA] Retry attempt:", failureCount, "Error:", error?.message);
      // Don't retry rate limit or permission errors
      if (error?.message?.includes("rate limit") || 
          error?.message?.includes("permission denied")) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // LOG DE DEBUG DESPUÉS DEL useQuery
  console.log("[HOOK_STATE] Hook state:", { 
    calls: calls.length, 
    isLoading, 
    error: error?.message,
    enabled: !!user?.id 
  });

  const syncCallsSecurely = async () => {
    console.log("[SYNC_CALLS] Starting sync for user:", user?.id);
    
    if (!user?.id) {
      toast.error("Authentication required");
      return;
    }

    // Rate limiting check
    try {
      const rateLimitOk = await checkRateLimit('sync_calls');
      if (!rateLimitOk) {
        await logSecurityEvent('rate_limit_exceeded', 'Call sync rate limit exceeded');
        toast.error("Rate limit exceeded. Please wait before syncing again.");
        return;
      }
    } catch (rateLimitError) {
      console.log("[SYNC_CALLS] Rate limit check failed, continuing anyway:", rateLimitError);
    }

    try {
      await logSecurityEvent('call_sync_started', 'User initiated call sync');
      const result = await retellService.syncCalls();
      
      console.log("[SYNC_CALLS] Sync result:", result);
      
      await logSecurityEvent('call_sync_completed', `Synced ${result.synced_calls} calls`);
      toast.success(`Successfully synced ${result.synced_calls} calls`);
      
      // Refresh the data
      refetch();
    } catch (error: any) {
      console.error("[SYNC_CALLS] Sync failed:", error);
      await logSecurityEvent('call_sync_failed', error.message);
      toast.error(`Sync failed: ${error.message}`);
    }
  };

  const testConnectionSecurely = async () => {
    console.log("[TEST_CONNECTION] Starting test for user:", user?.id);
    
    if (!user?.id) {
      toast.error("Authentication required");
      return;
    }

    // Rate limiting check
    try {
      const rateLimitOk = await checkRateLimit('test_connection');
      if (!rateLimitOk) {
        toast.error("Rate limit exceeded. Please wait before testing again.");
        return;
      }
    } catch (rateLimitError) {
      console.log("[TEST_CONNECTION] Rate limit check failed, continuing anyway:", rateLimitError);
    }

    try {
      await logSecurityEvent('connection_test_started', 'User initiated connection test');
      const isConnected = await retellService.testConnection();
      
      console.log("[TEST_CONNECTION] Connection test result:", isConnected);
      
      if (isConnected) {
        await logSecurityEvent('connection_test_success', 'Connection test successful');
        toast.success("Connection test successful");
      } else {
        await logSecurityEvent('connection_test_failed', 'Connection test failed');
        toast.error("Connection test failed");
      }
    } catch (error: any) {
      console.error("[TEST_CONNECTION] Test failed:", error);
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