
import { createErrorResponse } from "../_shared/corsUtils.ts";

export function validateInvitationRequest(requestData: any): { isValid: boolean; error?: Response } {
  const { email, companyId, role, invitationId } = requestData;

  if (!email || !companyId || !role) {
    console.error("Missing required parameters:", requestData);
    return { 
      isValid: false, 
      error: createErrorResponse("Missing required parameters", 400) 
    };
  }

  if (!["admin", "member", "viewer"].includes(role)) {
    return { 
      isValid: false, 
      error: createErrorResponse("Invalid role", 400) 
    };
  }

  return { isValid: true };
}
