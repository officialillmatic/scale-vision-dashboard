import { debugLog } from "@/lib/debug";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

export function EmailConfigWarning() {
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkEmailConfig = async () => {
      try {
        debugLog("Checking email configuration...");
        const { data, error } = await supabase.functions.invoke('check-email-config');
        
        if (error) {
          console.error("Error checking email config:", error);
          setEmailConfigured(false);
          return;
        }
        
        debugLog("Email config response:", data);
        setEmailConfigured(data?.configured === true);
      } catch (err) {
        console.error("Failed to check email configuration:", err);
        setEmailConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkEmailConfig();
  }, []);
  
  // Don't show anything while loading or if email is properly configured
  if (isLoading || emailConfigured === null || emailConfigured === true) {
    return null;
  }
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Email Configuration Warning</AlertTitle>
      <AlertDescription>
        Email sending is not configured properly. Team invitations may not be delivered.
        Please ensure the Resend API key is configured and domain verification is complete.
      </AlertDescription>
    </Alert>
  );
}
