import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  getCurrentUser, 
  onAuthStateChange, 
  signOut as supabaseSignOut,
  signInWithEmail as supabaseSignInWithEmail,
  signUpWithEmail as supabaseSignUpWithEmail,
  signInWithLinkedIn as supabaseSignInWithLinkedIn
} from '@/lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 3000);

    const initAuth = async () => {
      try {
        // Set up auth state listener
        const { data: { subscription } } = onAuthStateChange((user) => {
          console.log('Auth state change detected:', user?.id || 'null');
          if (mounted) {
            setUser(user);
            setIsLoading(false);
            clearTimeout(fallbackTimeout);
          }
        });

        // Set up manual signout event listener as fallback
        const handleManualSignout = () => {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        };

        window.addEventListener('supabase-signout', handleManualSignout);

        // Get initial user state
        const currentUser = await getCurrentUser();
        
        if (mounted) {
          setUser(currentUser);
          setIsLoading(false);
          clearTimeout(fallbackTimeout);
        }

        // Return cleanup function
        return () => {
          subscription.unsubscribe();
          window.removeEventListener('supabase-signout', handleManualSignout);
        };
      } catch (error) {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
          clearTimeout(fallbackTimeout);
        }
        return () => {};
      }
    };

    let cleanup: (() => void) | null = null;
    
    initAuth().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  // Auth actions
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseSignInWithEmail(email, password);
      
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      // State will be updated by auth listener
      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Sign in failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseSignUpWithEmail(email, password);
      
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      // State will be updated by auth listener
      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Sign up failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithLinkedIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseSignInWithLinkedIn();
      
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      // The redirect will happen automatically
      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'LinkedIn sign in failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('useAuth signOut called, current user:', user?.id || 'null');
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabaseSignOut();
      console.log('Supabase signOut result:', error || 'success');
      
      if (error) {
        setError(error.message || 'Sign out failed');
        return { success: false, error: error.message };
      }
      
      // Manually clear user state as backup
      setUser(null);
      
      return { success: true };
    } catch (err: any) {
      console.error('Sign out error in useAuth:', err);
      const errorMessage = err.message || 'Sign out failed';
      setError(errorMessage);
      
      // Force clear user state even on error
      setUser(null);
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signInWithLinkedIn,
    signOut,
    clearError,
  };
};