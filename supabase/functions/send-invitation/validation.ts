import { createErrorResponse } from "../_shared/corsUtils.ts";

export function validateInvitationRequest(requestData: any): { 
  isValid: boolean; 
  error?: Response; 
  data?: { email: string; companyId: string; role: string } 
} {
  const { email, companyId, role, invitationId } = requestData;
  
  // Si no hay companyId, usar un valor por defecto para super admin
  const finalCompanyId = companyId || "default-company-id";
  
  if (!email || !role) {
    console.error("Missing required parameters:", requestData);
    return { 
      isValid: false, 
      error: createErrorResponse("Missing required parameters (email, role)", 400) 
    };
  }
  
  if (!["admin", "member", "viewer"].includes(role)) {
    return { 
      isValid: false, 
      error: createErrorResponse("Invalid role", 400) 
    };
  }
  
  // IMPORTANTE: Retornar los datos validados
  return { 
    isValid: true,
    data: {
      email,
      companyId: finalCompanyId,
      role
    }
  };
}