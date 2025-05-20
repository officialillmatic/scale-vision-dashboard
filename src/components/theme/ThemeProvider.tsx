
import { createContext, useContext, ReactNode, useEffect } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: ReactNode;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeContextType = {
  theme: "system",
  setTheme: () => null,
};

const ThemeContext = createContext<ThemeContextType>(initialState);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { preferences, updatePreference } = useUserPreferences();
  
  const theme = preferences?.theme || "system";
  
  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);
  
  const setTheme = (newTheme: Theme) => {
    updatePreference("theme", newTheme);
  };
  
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
