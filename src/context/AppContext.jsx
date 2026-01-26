import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

    const unsubscribe = onAuthChange(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        setIsLoading(false);
      } else {
        // Sign in anonymously
        const newUser = await signInAnonymousUser();
        setUser(newUser);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [configStatus.firebase]);

  // Student profile (would come from user profile in real app)
  const [studentMilestone, setStudentMilestone] = useState('Sem 1');
  const [studentCohortId, setStudentCohortId] = useState(''); // Empty = see all surveys (demo)

  const toggleRole = () => {
    setCurrentRole(prev => prev === 'student' ? 'admin' : 'student');
  };

  const value = {
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
  };

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
