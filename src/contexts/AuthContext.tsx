import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isOffline: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHED_SESSION_KEY = 'pharmatrack_cached_session';
const CACHED_USER_KEY = 'pharmatrack_cached_user';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Cache user data for offline access
  const cacheUserData = useCallback((userData: User | null, sessionData: Session | null) => {
    if (userData && sessionData) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify({
        ...userData,
        cachedAt: Date.now(),
      }));
      // Only cache non-sensitive session info
      localStorage.setItem(CACHED_SESSION_KEY, JSON.stringify({
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email,
          user_metadata: sessionData.user.user_metadata,
        },
        cachedAt: Date.now(),
      }));
    }
  }, []);

  // Get cached user data
  const getCachedUserData = useCallback((): { user: User | null; session: Session | null } => {
    try {
      const cachedUser = localStorage.getItem(CACHED_USER_KEY);
      const cachedSession = localStorage.getItem(CACHED_SESSION_KEY);
      
      if (cachedUser && cachedSession) {
        const parsedUser = JSON.parse(cachedUser);
        const parsedSession = JSON.parse(cachedSession);
        
        // Cache is valid for 7 days
        if (Date.now() - parsedUser.cachedAt < 7 * 24 * 60 * 60 * 1000) {
          return {
            user: parsedUser as User,
            session: parsedSession as Session,
          };
        }
      }
    } catch (e) {
      console.error('Error reading cached auth data:', e);
    }
    return { user: null, session: null };
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Re-fetch session when coming back online
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSession(session);
          setUser(session.user);
          cacheUserData(session.user, session);
        }
      });
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cacheUserData]);

  useEffect(() => {
    const initAuth = async () => {
      // If offline, use cached data immediately
      if (!navigator.onLine) {
        const cached = getCachedUserData();
        if (cached.user) {
          setUser(cached.user);
          setSession(cached.session);
          setIsLoading(false);
          return;
        }
      }

      try {
        // Get initial session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // If network error and we have cached data, use it
          if (!navigator.onLine || error.message?.includes('Failed to fetch')) {
            const cached = getCachedUserData();
            if (cached.user) {
              setUser(cached.user);
              setSession(cached.session);
              setIsLoading(false);
              return;
            }
          }
          throw error;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Cache the session data for offline use
        if (session) {
          cacheUserData(session.user, session);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Try cached data as fallback
        const cached = getCachedUserData();
        if (cached.user) {
          setUser(cached.user);
          setSession(cached.session);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Cache the new session data
        if (session) {
          cacheUserData(session.user, session);
        } else {
          // Clear cache on sign out
          localStorage.removeItem(CACHED_USER_KEY);
          localStorage.removeItem(CACHED_SESSION_KEY);
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [getCachedUserData, cacheUserData]);

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!navigator.onLine) {
      return { error: new Error('Cannot sign up while offline. Please check your internet connection.') };
    }
    
    const redirectUrl = `${window.location.origin}/onboarding`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!navigator.onLine) {
      return { error: new Error('Cannot sign in while offline. Please check your internet connection.') };
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Clear cached data
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHED_SESSION_KEY);
    localStorage.removeItem('pharmatrack_pharmacy_staff');
    
    if (navigator.onLine) {
      await supabase.auth.signOut();
    } else {
      // If offline, just clear local state
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isOffline, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
