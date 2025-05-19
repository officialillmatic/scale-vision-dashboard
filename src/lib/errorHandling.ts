
import { toast } from "sonner";

interface ErrorHandlingOptions {
  fallbackMessage: string;
  showToast?: boolean;
  logError?: boolean;
  logToConsole?: boolean; // Added to support existing code
}

export const handleError = (
  error: unknown, 
  options: ErrorHandlingOptions
): void => {
  const { fallbackMessage, showToast = true, logError = true, logToConsole = true } = options;
  
  // Default error message
  let errorMessage = fallbackMessage;
  
  // Try to extract more specific error message
  if (error instanceof Error) {
    errorMessage = error.message || fallbackMessage;
  } else if (typeof error === 'object' && error !== null) {
    // Handle Supabase error format
    const supabaseError = error as { message?: string; error?: string };
    errorMessage = supabaseError.message || supabaseError.error || fallbackMessage;
  }
  
  // Log error if required
  if (logError || logToConsole) {
    console.error(`Error: ${errorMessage}`, error);
  }
  
  // Show toast notification if required
  if (showToast) {
    toast.error(errorMessage);
  }
};
