import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first (only in browser)
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('sia-theme');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        return savedTheme;
      }
    }
    // Default to 'system' to respect user's OS preference
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    
    const savedTheme = localStorage.getItem('sia-theme');
    if (savedTheme === 'light') return 'light';
    if (savedTheme === 'dark') return 'dark';
    
    // Check system preference
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Update resolved theme when theme preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateResolvedTheme = () => {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      };
      
      updateResolvedTheme();
      
      // Use addEventListener for better browser support
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', updateResolvedTheme);
        return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(updateResolvedTheme);
        return () => mediaQuery.removeListener(updateResolvedTheme);
      }
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  // Apply theme class to html element
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Persist theme preference
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('sia-theme', theme);
      } catch (error) {
        console.warn('Failed to save theme preference:', error);
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      // Cycle through: light -> dark -> system -> light
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
