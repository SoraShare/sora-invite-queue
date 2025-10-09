import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Environment configuration
const isDevelopment = import.meta.env.MODE === 'development';
const isLocalSupabase = import.meta.env.VITE_USE_LOCAL_SUPABASE === 'true';

// Environment variables with smart defaults
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (
  isLocalSupabase || isDevelopment 
    ? 'http://localhost:54321' 
    : ''
);

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const enableAutoRefresh = import.meta.env.VITE_ENABLE_QUEUE_AUTO_REFRESH === 'true';
const autoRefreshInterval = parseInt(import.meta.env.VITE_QUEUE_REFRESH_INTERVAL || '60000', 10) || 60000;

// Feature flags
const queueStatsEnabled = import.meta.env.VITE_QUEUE_STATS_ENABLED !== 'false'; // Default to true
const communityReturnRateEnabled = import.meta.env.VITE_COMMUNITY_RETURN_RATE_ENABLED !== 'false'; // Default to true

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});

// Helper function to get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      return null;
    }
    return user;
  } catch (error) {
    return null;
  }
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    return null;
  }
  return data;
};

// Authentication helpers
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}`,
    },
  });
  return { data, error };
};

export const signInWithLinkedIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: `${window.location.origin}`,
    },
  });
  return { data, error };
};

export const signInWithGitHub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}`,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  try {
    // Always try the standard Supabase signOut method first
    // This should trigger the auth state change event properly
    const result = await supabase.auth.signOut();
    
    // Additional cleanup for local development or if there are issues
    if (isDevelopment || isLocalSupabase || result.error) {
      // Clear all Supabase-related storage keys as backup
      clearSupabaseStorage();
    }
    
    return { error: result.error };
  } catch (err: any) {
    // If standard signOut fails, force clear storage and trigger manual state change
    clearSupabaseStorage();
    
    // Manually trigger auth state change as fallback
    try {
      // Force trigger the auth state change callback
      window.dispatchEvent(new CustomEvent('supabase-signout'));
    } catch (eventErr) {
      console.error('Failed to dispatch signout event:', eventErr);
    }
    
    return { error: err };
  }
};

// Helper function to clear all Supabase-related storage
const clearSupabaseStorage = () => {
  // Clear localStorage
  const localKeysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('sb-') || 
      key.includes('supabase') ||
      key.includes('auth-token') ||
      key.includes('session')
    )) {
      localKeysToRemove.push(key);
    }
  }
  
  localKeysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage
  const sessionKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('sb-') || 
      key.includes('supabase') ||
      key.includes('auth-token') ||
      key.includes('session')
    )) {
      sessionKeysToRemove.push(key);
    }
  }
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
  });
};

// Ensure user profile exists in users table
export const ensureUserProfile = async (user: User) => {
  if (!user) return;

  try {
    // Check if user profile exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id);

    if (existingProfile && existingProfile.length === 0) {
      // Create user profile if it doesn't exist
      await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          avatar_url: user.user_metadata?.avatar_url,
          linkedin_id: user.user_metadata?.sub || user.user_metadata?.provider_id,
        });
    }
  } catch (error) {
    // Silently handle profile creation errors
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user ?? null;
    
    // Call callback immediately to avoid delays
    callback(user);
    
    // Ensure user profile exists when user signs in (do this after callback)
    if (user && event === 'SIGNED_IN') {
      await ensureUserProfile(user);
    }
  });
};

export const config = {
  isDevelopment,
  isLocalSupabase,
  enableAutoRefresh,
  autoRefreshInterval,
  queueStatsEnabled,
  communityReturnRateEnabled
}

export default supabase;