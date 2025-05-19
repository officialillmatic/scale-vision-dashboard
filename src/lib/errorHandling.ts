
import { toast } from "sonner";

interface ErrorHandlerOptions {
  fallbackMessage?: string;
  logToConsole?: boolean;
  showToast?: boolean;
  onError?: (error: any) => void;
}

const defaultOptions: ErrorHandlerOptions = {
  fallbackMessage: "An unexpected error occurred",
  logToConsole: true,
  showToast: true,
  onError: undefined
};

/**
 * Unified error handler that can be used across the application
 */
export function handleError(error: any, options?: ErrorHandlerOptions) {
  const opts = { ...defaultOptions, ...options };
  
  // Extract error message
  let errorMessage = opts.fallbackMessage;
  
  if (error?.message) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.error_description) {
    errorMessage = error.error_description;
  } else if (error?.details) {
    errorMessage = error.details;
  }
  
  // Log to console if enabled
  if (opts.logToConsole) {
    console.error("Error occurred:", error);
  }
  
  // Show toast if enabled
  if (opts.showToast) {
    toast.error(errorMessage);
  }
  
  // Call custom error handler if provided
  if (opts.onError) {
    opts.onError(error);
  }
  
  // Return the error message for further use if needed
  return errorMessage;
}

/**
 * Type guard to check if an error is a Supabase error
 */
export function isSupabaseError(error: any): boolean {
  return error && typeof error === 'object' && 'code' in error && 'message' in error;
}

/**
 * Map Supabase error codes to user-friendly messages
 */
export function getSupabaseErrorMessage(error: any): string {
  if (!isSupabaseError(error)) {
    return "An unexpected error occurred";
  }
  
  // Common Supabase error codes
  const errorMessages: Record<string, string> = {
    "22P02": "Invalid input syntax",
    "23505": "This record already exists",
    "23503": "This record references another record that doesn't exist",
    "PGRST116": "Row level security policy violation",
    "42501": "Insufficient permissions",
    "42P01": "The requested resource was not found",
    "auth/invalid-email": "Invalid email address",
    "auth/email-already-in-use": "Email already in use",
    "auth/weak-password": "Password is too weak",
    "auth/wrong-password": "Incorrect password",
    "auth/user-not-found": "User not found"
  };
  
  return errorMessages[error.code] || error.message || "An unexpected error occurred";
}
