
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

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
    queryFn: async () => {
      // This would normally fetch from your calls API
      // For now, returning empty array to prevent build errors
      return [] as Call[];
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
