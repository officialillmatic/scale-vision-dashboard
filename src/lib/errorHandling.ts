
import { toast } from "sonner";

interface ErrorHandlingOptions {
  fallbackMessage: string;
  showToast?: boolean;
  logError?: boolean;
  logToConsole?: boolean; 
  context?: string;
}

export const handleError = (
  error: unknown, 
  options: ErrorHandlingOptions
): void => {
  const { fallbackMessage, showToast = true, logError = true, logToConsole = true, context } = options;
  
  // Default error message
  let errorMessage = fallbackMessage;
  
  // Try to extract more specific error message
  if (error instanceof Error) {
    errorMessage = error.message || fallbackMessage;
  } else if (typeof error === 'object' && error !== null) {
    // Handle Supabase error format
    const supabaseError = error as { message?: string; error?: string; code?: string };
    
    // Handle specific Supabase error codes
    if (supabaseError.code === 'PGRST116') {
      errorMessage = "No data found. This might be a permissions issue.";
    } else if (supabaseError.code === '42501') {
      errorMessage = "Access denied. Please check your permissions.";
    } else {
      errorMessage = supabaseError.message || supabaseError.error || fallbackMessage;
    }
  }
  
  // Add context if provided
  const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
  
  // Log error if required
  if (logError || logToConsole) {
    console.error(`Error: ${fullMessage}`, error);
  }
  
  // Show toast notification if required
  if (showToast) {
    toast.error(fullMessage);
  }
};

export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  errorOptions: ErrorHandlingOptions
): Promise<T | null> => {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error, errorOptions);
    return null;
  }
};
