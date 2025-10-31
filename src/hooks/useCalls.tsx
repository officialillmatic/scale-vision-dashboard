
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { supabase } from "@/integrations/supabase/client";

export interface Call {
  id: string;
  call_id: string;
  user_id: string;
  agent_id?: string;
  company_id: string;
  timestamp: string;
  duration_sec?: number;
  cost_usd?: number;
  to?: string;
  from?: string;
  call_status: string;
  disposition?: string;
  transcript?: string;
  recording_url?: string;
  audio_url?: string;
}

export function useCalls() {
  const { company, user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  const { 
    data: calls = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['calls', company?.id, user?.id],
    queryFn: async (): Promise<Call[]> => {
      try {
        let query = supabase
          .from("calls")
          .select("*")
          .order("timestamp", { ascending: false });

        // Super admins can see all calls
        if (!isSuperAdmin) {
          if (company?.id) {
            query = query.eq("company_id", company.id);
          }
          if (user?.id) {
            query = query.eq("user_id", user.id);
          }
        }

        const { data, error } = await query;

        if (error) {
          console.error("[CALLS_SERVICE] Error fetching calls:", error);
          throw error;
        }

        return data || [];
      } catch (error: any) {
        console.error("[CALLS_SERVICE] Error in useCalls:", error);
        throw new Error(`Failed to fetch calls: ${error.message}`);
      }
    },
    enabled: !!user && (!!company?.id || isSuperAdmin)
  });

  return {
    calls,
    isLoading,
    error,
    refetch
  };
}
