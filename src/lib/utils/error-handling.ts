
import { toast } from "sonner";

export interface ErrorHandlingOptions {
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

  let errorMessage = fallbackMessage;

  if (error instanceof Error) {
    errorMessage = error.message || fallbackMessage;
  } else if (typeof error === 'object' && error !== null) {
    const supabaseError = error as { message?: string; error?: string; code?: string };

    if (supabaseError.code === 'PGRST116') {
      errorMessage = "No data found. This might be a permissions issue.";
    } else if (supabaseError.code === '42501') {
      errorMessage = "Access denied. Please check your permissions.";
    } else {
      errorMessage = supabaseError.message || supabaseError.error || fallbackMessage;
    }
  }

  const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;

  if (logError || logToConsole) {
    console.error(`Error: ${fullMessage}`, error);
  }

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

export const createErrorBoundary = (componentName: string) => {
  return (error: Error, errorInfo: any) => {
    console.error(`Error in ${componentName}:`, error, errorInfo);
    toast.error(`Something went wrong in ${componentName}. Please refresh the page.`);
  };
};
