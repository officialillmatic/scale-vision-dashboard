
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { hasValidSupabaseCredentials } from "@/integrations/supabase/client";

interface EnvironmentCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  valid: boolean;
  description: string;
  setupHint?: string;
}

export function EnvWarning() {
  const [environmentChecks, setEnvironmentChecks] = useState<EnvironmentCheck[]>([]);
  const [hasErrors, setHasErrors] = useState(false);
  const [hasWarnings, setHasWarnings] = useState(false);
  
  useEffect(() => {
    const checks: EnvironmentCheck[] = [
      {
        name: 'VITE_SUPABASE_URL',
        value: import.meta.env.VITE_SUPABASE_URL,
        required: true,
        valid: false,
        description: 'Supabase project URL',
        setupHint: 'Find this in your Supabase dashboard under Settings > API'
      },
      {
        name: 'VITE_SUPABASE_ANON_KEY',
        value: import.meta.env.VITE_SUPABASE_ANON_KEY,
        required: true,
        valid: false,
        description: 'Supabase anonymous public key',
        setupHint: 'Find this in your Supabase dashboard under Settings > API > Project API keys'
      },
      {
        name: 'VITE_API_BASE_URL',
        value: import.meta.env.VITE_API_BASE_URL,
        required: true,
        valid: false,
        description: 'Application base URL',
        setupHint: 'Set to your deployed application URL (e.g., https://your-app.vercel.app)'
      },
      {
        name: 'VITE_STORAGE_COMPANY_LOGOS_BUCKET',
        value: import.meta.env.VITE_STORAGE_COMPANY_LOGOS_BUCKET || 'company-logos',
        required: false,
        valid: true, // Now defaults to company-logos bucket we created
        description: 'Storage bucket for company logos',
        setupHint: 'This bucket has been created automatically'
      },
      {
        name: 'VITE_STORAGE_RECORDINGS_BUCKET',
        value: import.meta.env.VITE_STORAGE_RECORDINGS_BUCKET,
        required: false,
        valid: false,
        description: 'Storage bucket for call recordings',
        setupHint: 'Create this bucket in Supabase Dashboard > Storage'
      },
      {
        name: 'VITE_ENABLE_ANALYTICS',
        value: import.meta.env.VITE_ENABLE_ANALYTICS,
        required: false,
        valid: false,
        description: 'Enable analytics features'
      },
      {
        name: 'VITE_ENABLE_USER_PROFILES',
        value: import.meta.env.VITE_ENABLE_USER_PROFILES,
        required: false,
        valid: false,
        description: 'Enable user profile features'
      },
      {
        name: 'VITE_EMAIL_ENABLED',
        value: import.meta.env.VITE_EMAIL_ENABLED,
        required: false,
        valid: false,
        description: 'Enable email functionality'
      }
    ];

    // Validate each environment variable
    const validatedChecks = checks.map(check => {
      const { name, value, required } = check;
      let valid = check.valid; // Use the preset valid status

      if (value && !check.valid) {
        switch (name) {
          case 'VITE_SUPABASE_URL':
            valid = value.startsWith('https://') && value.includes('.supabase.co') && !value.includes('your-project-ref');
            break;
          case 'VITE_SUPABASE_ANON_KEY':
            valid = value.startsWith('eyJ') && value.length > 100 && !value.includes('your-anon-key');
            break;
          case 'VITE_API_BASE_URL':
            valid = (value.startsWith('http://') || value.startsWith('https://')) && !value.includes('your-');
            break;
          case 'VITE_STORAGE_RECORDINGS_BUCKET':
            valid = value.length > 0 && /^[a-z0-9-]+$/.test(value);
            break;
          case 'VITE_ENABLE_ANALYTICS':
          case 'VITE_ENABLE_USER_PROFILES':
          case 'VITE_EMAIL_ENABLED':
            valid = value === 'true' || value === 'false';
            break;
          default:
            valid = value.length > 0;
        }
      }

      return { ...check, valid };
    });

    setEnvironmentChecks(validatedChecks);
    
    const errors = validatedChecks.filter(check => check.required && !check.valid);
    const warnings = validatedChecks.filter(check => !check.required && !check.valid && check.value);
    
    setHasErrors(errors.length > 0);
    setHasWarnings(warnings.length > 0);
  }, []);

  // Don't show warning if we have valid Supabase credentials and no other issues
  if (hasValidSupabaseCredentials() && !hasErrors && !hasWarnings) {
    return null;
  }

  const requiredIssues = environmentChecks.filter(check => check.required && !check.valid);
  const optionalIssues = environmentChecks.filter(check => !check.required && !check.valid && check.value);

  return (
    <div className="space-y-4 mb-4">
      {hasErrors && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Critical Environment Configuration Issues</AlertTitle>
          <AlertDescription>
            <p className="mb-3">The following required environment variables have issues:</p>
            <ul className="list-disc pl-5 space-y-1">
              {requiredIssues.map(check => (
                <li key={check.name} className="text-sm">
                  <strong>{check.name}</strong> - {check.description}
                  {check.setupHint && (
                    <div className="text-xs text-muted-foreground mt-1">{check.setupHint}</div>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">Quick Setup:</p>
              <ol className="text-xs space-y-1 list-decimal pl-4">
                <li>Copy .env.example to .env</li>
                <li>Update the values with your actual configuration</li>
                <li>Restart the development server</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && !hasErrors && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Environment Configuration Warnings</AlertTitle>
          <AlertDescription>
            <p className="mb-3">The following optional environment variables have configuration issues:</p>
            <ul className="list-disc pl-5 space-y-1">
              {optionalIssues.map(check => (
                <li key={check.name} className="text-sm">
                  <strong>{check.name}</strong> - {check.description}
                  {check.setupHint && (
                    <div className="text-xs text-muted-foreground mt-1">{check.setupHint}</div>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              These issues won't prevent the app from running but may affect some features.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!hasErrors && !hasWarnings && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Environment Configuration Valid</AlertTitle>
          <AlertDescription>
            All environment variables are properly configured.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
