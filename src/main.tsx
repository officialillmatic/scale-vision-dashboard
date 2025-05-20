
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/common/ErrorBoundary.tsx";

// Initialize theme before React renders to prevent flash
const initializeTheme = () => {
  try {
    const storedTheme = localStorage.getItem('theme');
    const theme = storedTheme ? JSON.parse(storedTheme) : 'system';
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  } catch (e) {
    console.error('Error initializing theme:', e);
  }
};

// Call theme initialization before React renders
initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
