import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { signInAnonymousUser, onAuthChange, isFirebaseConfigured } from '../services/firebase';
import { isGeminiConfigured } from '../services/gemini';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState('student'); // 'student' or 'admin'
  const [user, setUser] = useState(null);
  
  // Compute config status once at initialization (these are synchronous checks)
  const configStatus = useMemo(() => ({
    firebase: isFirebaseConfigured(),
    gemini: isGeminiConfigured()
  }), []);

  // Set initial loading state based on firebase config
  const [isLoading, setIsLoading] = useState(configStatus.firebase);

  // Handle anonymous authentication
  useEffect(() => {
    if (!configStatus.firebase) {
      return;
    }

    let isMounted = true;

    const unsubscribe = onAuthChange(async (authUser) => {
      if (authUser) {
        if (isMounted) {
          setUser(authUser);
          setIsLoading(false);
        }
      } else {
        // Sign in anonymously
        try {
          const newUser = await signInAnonymousUser();
          if (isMounted) {
            setUser(newUser);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Failed to sign in anonymously:', error);
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [configStatus.firebase]);

  // Student profile (would come from user profile in real app)
  const [studentMilestone, setStudentMilestone] = useState('Sem 1');
  const [studentCohortId, setStudentCohortId] = useState(''); // Empty = see all surveys (demo)

  const toggleRole = useCallback(() => {
    setCurrentRole(prev => prev === 'student' ? 'admin' : 'student');
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    currentRole,
    setCurrentRole,
    toggleRole,
    user,
    isLoading,
    configStatus,
    studentMilestone,
    setStudentMilestone,
    studentCohortId,
    setStudentCohortId,
    isDemo: !configStatus.firebase || !configStatus.gemini
  }), [currentRole, toggleRole, user, isLoading, configStatus, studentMilestone, studentCohortId]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
