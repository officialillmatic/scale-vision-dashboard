
import { createContext, useContext, ReactNode, useEffect, useState } from "react";
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

// Create a context for the theme
const ThemeContext = createContext<ThemeContextType>(initialState);


export function ThemeProvider({ children }: ThemeProviderProps) {
  const { preferences, updatePreference, isLoading } = useUserPreferences();
  // Use localStorage as fallback while loading preferences from server
  const [localTheme, setLocalTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedTheme = localStorage.getItem("theme");
        return storedTheme ? JSON.parse(storedTheme) : "system";
      } catch (e) {
        return "system";
      }
    }
    return "system";
  });
  
  // Determine the active theme from preferences or fallback to local storage
  const theme = (preferences?.theme as Theme) || localTheme;
  
  // Apply the theme to the document
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
  
  // Listen for system theme changes
  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      };
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);
  
  const setTheme = (newTheme: Theme) => {
    // Store in localStorage for immediate effect and persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", JSON.stringify(newTheme));
    }
    
    // Update local state immediately
    setLocalTheme(newTheme);
    
    // Also update in database if user is logged in
    updatePreference("theme", newTheme);
  };
  
    return (
      <>
        <ThemeContext.Provider
          value={{
            theme,
            setTheme,
          }}
        >
        {children}
      </ThemeContext.Provider>
    </>
  );
}

export const useTheme = () => useContext(ThemeContext);
