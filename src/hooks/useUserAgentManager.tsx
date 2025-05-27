
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const useUserAgentManager = () => {
  const { 
    mutate: autoMapOrphanedCalls, 
    isPending: isAutoMapping 
  } = useMutation({
    mutationFn: async () => {
      console.log("[USER_AGENT_MANAGER] Starting auto-mapping...");
      console.log("[USER_AGENT_MANAGER] Using headers:", {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Profile': 'public'
      });
      
      const { data, error } = await supabase.functions.invoke("user-agent-manager", {
        body: { action: 'auto_map_orphaned_calls' },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        }
      });
      
      if (error) {
        console.error("[USER_AGENT_MANAGER] Auto-mapping error:", error);
        console.error("[USER_AGENT_MANAGER] Error details:", JSON.stringify(error, null, 2));
        
        // Enhanced error handling
        if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
          throw new Error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
        }
        
        throw new Error(error.message || "Auto-mapping failed");
      }
      
      console.log("[USER_AGENT_MANAGER] Auto-mapping response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("[USER_AGENT_MANAGER] Auto-mapping successful:", data);
      const { mappings_created, agents_processed, calls_found } = data;
      
      if (mappings_created > 0) {
        toast.success(`Successfully created ${mappings_created} user-agent mappings from ${calls_found} existing calls`);
      } else if (agents_processed > 0) {
        toast.info(`Checked ${agents_processed} agents - all mappings already exist`);
      } else {
        toast.info("No agents found that require mapping");
      }
    },
    onError: (error: any) => {
      console.error("[USER_AGENT_MANAGER] Auto-mapping error:", error);
      
      if (error.message?.includes("CORS") || error.message?.includes("preflight")) {
        toast.error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
      } else {
        toast.error(`Auto-mapping failed: ${error.message}`);
      }
    },
  });

  const { 
    mutate: auditMappings, 
    isPending: isAuditing 
  } = useMutation({
    mutationFn: async () => {
      console.log("[USER_AGENT_MANAGER] Starting audit...");
      console.log("[USER_AGENT_MANAGER] Using headers:", {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Profile': 'public'
      });
      
      const { data, error } = await supabase.functions.invoke("user-agent-manager", {
        body: { action: 'audit_mappings' },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        }
      });
      
      if (error) {
        console.error("[USER_AGENT_MANAGER] Audit error:", error);
        console.error("[USER_AGENT_MANAGER] Error details:", JSON.stringify(error, null, 2));
        
        // Enhanced error handling
        if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
          throw new Error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
        }
        
        throw new Error(error.message || "Audit failed");
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log("[USER_AGENT_MANAGER] Audit successful:", data);
      const { analysis } = data;
      
      if (analysis.agents_without_mappings.length > 0) {
        toast.warning(`Found ${analysis.agents_without_mappings.length} agents without user mappings`);
      } else {
        toast.success("All agents have proper user mappings");
      }
    },
    onError: (error: any) => {
      console.error("[USER_AGENT_MANAGER] Audit error:", error);
      
      if (error.message?.includes("CORS") || error.message?.includes("preflight")) {
        toast.error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
      } else {
        toast.error(`Audit failed: ${error.message}`);
      }
    },
  });

  const { 
    mutate: createDefaultMapping, 
    isPending: isCreatingMapping 
  } = useMutation({
    mutationFn: async ({ retellAgentId, userId, companyId }: { 
      retellAgentId: string; 
      userId: string; 
      companyId: string; 
    }) => {
      console.log("[USER_AGENT_MANAGER] Creating default mapping...");
      console.log("[USER_AGENT_MANAGER] Using headers:", {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Profile': 'public'
      });
      
      const { data, error } = await supabase.functions.invoke("user-agent-manager", {
        body: { 
          action: 'create_default_mapping',
          retell_agent_id: retellAgentId,
          user_id: userId,
          company_id: companyId
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        }
      });
      
      if (error) {
        console.error("[USER_AGENT_MANAGER] Mapping creation error:", error);
        console.error("[USER_AGENT_MANAGER] Error details:", JSON.stringify(error, null, 2));
        
        // Enhanced error handling
        if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
          throw new Error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
        }
        
        throw new Error(error.message || "Mapping creation failed");
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log("[USER_AGENT_MANAGER] Mapping creation successful:", data);
      toast.success(`Successfully created mapping for agent: ${data.agent_name}`);
    },
    onError: (error: any) => {
      console.error("[USER_AGENT_MANAGER] Mapping creation error:", error);
      
      if (error.message?.includes("CORS") || error.message?.includes("preflight")) {
        toast.error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
      } else {
        toast.error(`Mapping creation failed: ${error.message}`);
      }
    },
  });

  return {
    autoMapOrphanedCalls,
    isAutoMapping,
    auditMappings,
    isAuditing,
    createDefaultMapping,
    isCreatingMapping
  };
};
