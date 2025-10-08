import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange } from '@/lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    console.log('useAuth: Setting up auth hook');

    // Fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Auth initialization timeout, setting loading to false');
        setIsLoading(false);
      }
    }, 3000); // 3 second timeout

    const initAuth = async () => {
      try {
        // Set up auth listener first
        const { data: { subscription } } = onAuthStateChange((user) => {
          console.log('Auth state changed in hook:', user?.id || 'no user');
          if (mounted) {
            setUser(user);
            setIsLoading(false);
            clearTimeout(fallbackTimeout);
          }
        });

        // Get initial user state
        console.log('Getting initial auth state...');
        const currentUser = await getCurrentUser();
        console.log('Initial user state:', currentUser?.id || 'no user');
        
        if (mounted) {
          setUser(currentUser);
          setIsLoading(false);
          clearTimeout(fallbackTimeout);
        }

        // Return cleanup function
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
          clearTimeout(fallbackTimeout);
        }
        return () => {}; // No-op cleanup
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
};