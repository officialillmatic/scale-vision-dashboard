
import { useState, useEffect } from "react";
import { fetchCompanyInvitations, cancelInvitation, resendInvitation, CompanyInvitation, createInvitation } from "@/services/invitation";
import { handleError } from "@/lib/errorHandling";
import { fetchCompanyMembers, CompanyMember } from "@/services/memberService";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { supabase } from "@/integrations/supabase/client";

interface UseTeamMembersResult {
  invitations: CompanyInvitation[];
  members: CompanyMember[];
  isLoading: boolean;
  error: string | null;
  fetchInvitations: () => Promise<void>;
  handleCancelInvitation: (invitationId: string) => Promise<void>;
  handleResendInvitation: (invitationId: string) => Promise<void>;
  teamMembers: CompanyMember[];
  isInviting: boolean;
  handleInvite: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<boolean>;
}

export const useTeamMembers = (companyId: string | undefined): UseTeamMembersResult => {
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const { isSuperAdmin } = useSuperAdmin();

  const fetchInvitations = async () => {
    if (!companyId && !isSuperAdmin) {
      console.log("🚨 [useTeamMembers] No company ID and not super admin, skipping invitations");
      setInvitations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🚨 [useTeamMembers] Fetching invitations for company:", companyId);
      
      // Get confirmed users first to filter out from invitations
      const { data: confirmedUsers } = await supabase.auth.admin.listUsers();
      const confirmedEmails = confirmedUsers?.users
        ?.filter(user => user.email_confirmed_at !== null)
        ?.map(user => user.email)
        ?.filter(Boolean) || [];
      
      console.log("🚨 [useTeamMembers] Confirmed user emails:", confirmedEmails);
      
      const rawInvitations = await fetchCompanyInvitations(companyId);
      console.log("🚨 [useTeamMembers] Raw invitations fetched:", rawInvitations);
      
      // Filter out invitations for users who are already confirmed
      const filteredInvitations = rawInvitations.filter(invitation => {
        const isAlreadyConfirmed = confirmedEmails.includes(invitation.email);
        if (isAlreadyConfirmed) {
          console.log("🚨 [useTeamMembers] Filtering out invitation for confirmed user:", invitation.email);
        }
        return !isAlreadyConfirmed;
      });
      
      console.log("🚨 [useTeamMembers] 📧 INVITATION SUMMARY:");
      console.log("🚨 [useTeamMembers] - Raw invitations:", rawInvitations.length);
      console.log("🚨 [useTeamMembers] - Filtered invitations (excluding confirmed users):", filteredInvitations.length);
      console.log("🚨 [useTeamMembers] - Pending invitation emails:", filteredInvitations.map(inv => inv.email));
      
      setInvitations(filteredInvitations);
    } catch (error) {
      console.error("🚨 [useTeamMembers] Error fetching invitations:", error);
      handleError(error, {
        fallbackMessage: "Failed to fetch invitations",
        logToConsole: true
      });
      setError("Failed to fetch invitations");
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchMembers = async () => {
    if (!companyId && !isSuperAdmin) {
      console.log("🚨 [useTeamMembers] No company ID and not super admin, skipping members");
      setMembers([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🚨 [useTeamMembers] ⚡ INICIANDO FETCH DE MIEMBROS");
      console.log("🚨 [useTeamMembers] - Company ID:", companyId);
      console.log("🚨 [useTeamMembers] - Is Super Admin:", isSuperAdmin);
      
      const companyMembers = await fetchCompanyMembers(companyId);
      
      console.log("🚨 [useTeamMembers] ⚡ RESULTADO FETCH:");
      console.log("🚨 [useTeamMembers] - Miembros recibidos:", companyMembers.length);
      console.log("🚨 [useTeamMembers] - Datos completos:", companyMembers);
      
      if (companyMembers.length === 0) {
        console.log("🚨 [useTeamMembers] ❌ NO SE RECIBIERON MIEMBROS!");
        console.log("🚨 [useTeamMembers] ❌ Esto debería mostrar 7 usuarios confirmados");
      } else {
        console.log("🚨 [useTeamMembers] ✅ MIEMBROS RECIBIDOS CORRECTAMENTE");
        companyMembers.forEach((member, index) => {
          console.log(`🚨 [useTeamMembers] - Miembro ${index + 1}: ${member.user_details?.email} (${member.user_details?.name || 'Sin nombre'})`);
        });
      }
      
      console.log("🚨 [useTeamMembers] 👥 ESTABLECIENDO ESTADO DE MIEMBROS...");
      setMembers(companyMembers);
      
      console.log("🚨 [useTeamMembers] ✅ ESTADO ESTABLECIDO");
      
    } catch (error) {
      console.error("🚨 [useTeamMembers] ❌ ERROR FATAL EN FETCH:", error);
      handleError(error, {
        fallbackMessage: "Failed to fetch team members",
        logToConsole: true
      });
      setMembers([]);
      setError("Failed to fetch team members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("🚨 [useTeamMembers] 🔄 EFFECT TRIGGERED");
    console.log("🚨 [useTeamMembers] - companyId:", companyId);
    console.log("🚨 [useTeamMembers] - isSuperAdmin:", isSuperAdmin);
    
    if (companyId || isSuperAdmin) {
      console.log("🚨 [useTeamMembers] 🚀 EJECUTANDO FETCH DE DATOS");
      // Fetch both in sequence for better debugging
      const fetchData = async () => {
        console.log("🚨 [useTeamMembers] 1️⃣ Iniciando fetchMembers...");
        await fetchMembers();
        console.log("🚨 [useTeamMembers] 2️⃣ Iniciando fetchInvitations...");
        await fetchInvitations();
        console.log("🚨 [useTeamMembers] ✅ Fetch completo");
      };
      fetchData();
    } else {
      console.log("🚨 [useTeamMembers] ❌ Clearing data - no company access");
      setMembers([]);
      setInvitations([]);
    }
  }, [companyId, isSuperAdmin]);

  // Log final state
  useEffect(() => {
    console.log("🚨 [useTeamMembers] 📊 ESTADO FINAL DEL HOOK:");
    console.log("🚨 [useTeamMembers] - Members count:", members.length);
    console.log("🚨 [useTeamMembers] - Members data:", members);
    console.log("🚨 [useTeamMembers] - Invitations count:", invitations.length);
    console.log("🚨 [useTeamMembers] - IsLoading:", isLoading);
    console.log("🚨 [useTeamMembers] - Error:", error);
  }, [members, invitations, isLoading, error]);

  const handleCancelInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      const success = await cancelInvitation(invitationId);
      if (success) {
        await fetchInvitations();
      }
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to cancel invitation",
        logToConsole: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      const success = await resendInvitation(invitationId);
      if (success) {
        await fetchInvitations();
      }
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to resend invitation",
        logToConsole: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
    if (!companyId && !isSuperAdmin) return false;
    
    setIsInviting(true);
    console.log("🎯 [HOOK] useTeamMembers: Inviting", email, "with role", role, "for company", companyId);
    
    try {
      const success = await createInvitation(companyId, email, role);
      console.log("🎯 [HOOK] createInvitation result:", success);
      
      if (success) {
        await fetchInvitations();
        // Also refresh members in case user was already confirmed
        await fetchMembers();
      }
      return success;
    } catch (error) {
      console.error("🎯 [HOOK] Error in handleInvite:", error);
      handleError(error, {
        fallbackMessage: "Failed to send invitation",
        logToConsole: true
      });
      return false;
    } finally {
      setIsInviting(false);
    }
  };

  return {
    invitations,
    members,
    isLoading,
    error,
    fetchInvitations,
    handleCancelInvitation,
    handleResendInvitation,
    teamMembers: members,
    isInviting,
    handleInvite,
  };
};
