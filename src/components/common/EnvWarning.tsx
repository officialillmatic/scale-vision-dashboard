
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";

export function EnvWarning() {
  const [missingVars, setMissingVars] = useState<string[]>([]);
  
  useEffect(() => {
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];
    
    const missing = requiredVars.filter(
      varName => !import.meta.env[varName]
    );
    
    setMissingVars(missing);
  }, []);
  
  if (missingVars.length === 0) return null;
  
  return (
    <Alert variant="destructive" className="mb-4">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle>Missing Environment Variables</AlertTitle>
      <AlertDescription>
        <p>The following environment variables are missing:</p>
        <ul className="list-disc pl-5 mt-2">
          {missingVars.map(variable => (
            <li key={variable}>{variable}</li>
          ))}
        </ul>
        <p className="mt-2">
          Create a .env file based on .env.example with these variables to ensure the app works correctly.
        </p>
      </AlertDescription>
    </Alert>
  );
}
