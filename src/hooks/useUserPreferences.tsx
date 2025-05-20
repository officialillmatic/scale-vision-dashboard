
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPreferences, updateUserPreferences, ensureUserPreferences, UserPreferences, defaultPreferences } from '@/services/preferencesService';
import { toast } from "sonner";

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  preferences: null,
  isLoading: false,
  error: null,
  updatePreference: async () => {},
  updatePreferences: async () => {},
});

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch user preferences
  const { data: preferences, isLoading, error: queryError } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const prefs = await ensureUserPreferences(user.id);
        return prefs;
      } catch (err) {
        console.error("Error fetching user preferences:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch preferences"));
        // Return default preferences so the app can still function
        return { ...defaultPreferences, user_id: user.id } as UserPreferences;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError : new Error("Failed to fetch preferences"));
    }
  }, [queryError]);
  
  // Mutation for updating preferences
  const { mutateAsync: updateMutation } = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
    },
    onError: (err) => {
      console.error("Error updating preferences:", err);
      toast.error("Failed to update preferences");
      setError(err instanceof Error ? err : new Error("Failed to update preferences"));
    },
  });
  
  // Update a single preference
  const updatePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!user?.id) return;
    try {
      await updateMutation({ [key]: value });
    } catch (err) {
      console.error(`Error updating preference ${String(key)}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to update ${String(key)}`));
    }
  }, [user?.id, updateMutation]);
  
  // Update multiple preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user?.id) return;
    try {
      await updateMutation(updates);
    } catch (err) {
      console.error("Error updating multiple preferences:", err);
      setError(err instanceof Error ? err : new Error("Failed to update preferences"));
    }
  }, [user?.id, updateMutation]);
  
  return (
    <UserPreferencesContext.Provider 
      value={{ 
        preferences: preferences || null, 
        isLoading, 
        error,
        updatePreference, 
        updatePreferences 
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export const useUserPreferences = () => useContext(UserPreferencesContext);
