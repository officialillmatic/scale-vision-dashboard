
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPreferences, updateUserPreferences, ensureUserPreferences, UserPreferences, defaultPreferences } from '@/services/preferencesService';

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  preferences: null,
  isLoading: false,
  updatePreference: async () => {},
  updatePreferences: async () => {},
});

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const prefs = await ensureUserPreferences(user.id);
      return prefs;
    },
    enabled: !!user?.id,
  });
  
  // Mutation for updating preferences
  const { mutateAsync: updateMutation } = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
    },
  });
  
  // Update a single preference
  const updatePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!user?.id) return;
    await updateMutation({ [key]: value });
  }, [user?.id, updateMutation]);
  
  // Update multiple preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user?.id) return;
    await updateMutation(updates);
  }, [user?.id, updateMutation]);
  
  return (
    <UserPreferencesContext.Provider 
      value={{ 
        preferences: preferences || null, 
        isLoading, 
        updatePreference, 
        updatePreferences 
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export const useUserPreferences = () => useContext(UserPreferencesContext);
