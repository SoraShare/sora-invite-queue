import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  supabase,
  onAuthStateChange, 
  signOut as supabaseSignOut,
  signInWithEmail as supabaseSignInWithEmail,
  signUpWithEmail as supabaseSignUpWithEmail,
  signInWithLinkedIn as supabaseSignInWithLinkedIn,
  signInWithGitHub as supabaseSignInWithGitHub,
  updateUserProfileInDB,
  getUserProfileData
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
        // Set up cross-tab session sync
        const channel = new BroadcastChannel('supabase_auth');
        
        const handleAuthBroadcast = (event: MessageEvent) => {
          if (!mounted) return;
          
          if (event.data.type === 'SIGNED_OUT') {
            setUser(null);
          } else if (event.data.type === 'SIGNED_IN' && event.data.user) {
            setUser(event.data.user);
          }
        };
        
        channel.addEventListener('message', handleAuthBroadcast);

        // Set up auth state listener
        const { data: { subscription } } = onAuthStateChange((user) => {
          console.log('Auth state change detected:', user?.id || 'null');
          if (mounted) {
            setUser(user);
            setIsLoading(false);
            clearTimeout(fallbackTimeout);
            
            // Broadcast to other tabs
            channel.postMessage({
              type: user ? 'SIGNED_IN' : 'SIGNED_OUT',
              user: user
            });
          }
        });

        // Return cleanup function
        return () => {
          subscription.unsubscribe();
          channel.removeEventListener('message', handleAuthBroadcast);
          channel.close();
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

  const signInWithGitHub = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseSignInWithGitHub();
      
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      // The redirect will happen automatically
      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'GitHub sign in failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabaseSignOut();
      
      if (error) {
        setError(error.message || 'Sign out failed');
        return { success: false, error: error.message };
      }
      
      clearAuthState();
      return { success: true };
    } catch (err: any) {
      console.error('Sign out error in useAuth:', err);
      const errorMessage = err.message || 'Sign out failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAuthState = () => {
    // Clear all possible auth-related localStorage keys
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    // Force reload
    window.location.reload();
  };

  // Profile management functions with React state management
  const updateProfile = useCallback(async (profileData: {
    full_name?: string;
    github_url?: string;
    linkedin_url?: string;
  }) => {
    if (!user) {
      setError('No user logged in');
      return { success: false, error: 'No user logged in' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await updateUserProfileInDB(user.id, profileData);
      
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      // Refresh auth state to get updated user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
      
      return { success: true, data: result.data };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshUserProfile = useCallback(async () => {
    if (!user) {
      setError('No user logged in');
      return { success: false, error: 'No user logged in', profileData: null, user: null };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get fresh user data from auth
      const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !freshUser) {
        setError('Failed to get current user');
        return { success: false, error: 'Failed to get current user', profileData: null, user: null };
      }

      // Update local user state
      setUser(freshUser);

      // Get profile data
      const result = await getUserProfileData(freshUser.id);
      
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error, profileData: null, user: freshUser };
      }
      
      return { 
        success: true, 
        user: freshUser, 
        profileData: result.profileData 
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refresh profile';
      setError(errorMessage);
      return { success: false, error: errorMessage, profileData: null, user: null };
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
    signInWithGitHub,
    signOut,
    updateProfile,
    refreshUserProfile,
    clearAuthState,
    clearError,
  };
};