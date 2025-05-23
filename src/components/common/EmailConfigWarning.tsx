
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function EmailConfigWarning() {
  const [isEmailConfigured, setIsEmailConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkEmailConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-email-config');
        
        if (error) {
          console.error("Error checking email configuration:", error);
          setIsEmailConfigured(false);
        } else {
          setIsEmailConfigured(data?.configured || false);
        }
      } catch (err) {
        console.error("Failed to check email configuration:", err);
        setIsEmailConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (import.meta.env.VITE_EMAIL_ENABLED === 'true') {
      checkEmailConfig();
    } else {
      setIsLoading(false);
    }
  }, []);
  
  if (isLoading || isEmailConfigured === true || isEmailConfigured === null) {
    return null;
  }
  
  return (
    <Alert variant="warning" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Email Configuration Incomplete</AlertTitle>
      <AlertDescription>
        <p>The email service is not properly configured. Team invitations will not be sent until this is resolved.</p>
        <p className="mt-2 text-sm">
          Please ensure the RESEND_API_KEY is set in your Supabase Edge Function secrets.
        </p>
      </AlertDescription>
    </Alert>
  );
}
