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
    console.log('Getting current user from Supabase...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    console.log('Got user:', user || 'No user (not authenticated)');
    return user;
  } catch (error) {
    console.error('Exception in getCurrentUser:', error);
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
    console.error('Error getting user profile:', error);
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

export const signOut = async () => {
  try {

    if (isDevelopment || isLocalSupabase) {
      console.log('supabase.ts: signOut function called in development/local mode');
      // Clear session from localStorage manually
      localStorage.removeItem('sb-' + supabaseUrl.replace('http://', '').replace('https://', '').replace('/', '') + '-auth-token');
    } else {
      // Try the standard signOut first
      const result = await supabase.auth.signOut();
      console.log('supabase.ts: Standard signOut completed:', result);
      return { error: result.error };
    }
    
  } catch (err) {
    console.error('supabase.ts: Exception in signOut:', err);
  }
};

// Ensure user profile exists in users table
export const ensureUserProfile = async (user: User) => {
  if (!user) return;

  // Check if user profile exists
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id);

  if (existingProfile && existingProfile.length === 0) {
    // Create user profile if it doesn't exist
    const { error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
        linkedin_id: user.user_metadata?.sub || user.user_metadata?.provider_id,
      });

    if (error) {
      console.error('Error creating user profile:', error);
    }
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('=== AUTH STATE CHANGE ===');
    console.log('Event:', event);
    console.log('Session exists:', !!session);
    console.log('User:', session?.user?.id || 'null');
    
    const user = session?.user ?? null;
    
    // Call callback immediately to avoid delays
    console.log('Calling auth callback with user:', user?.id || 'null');
    callback(user);
    
    // Ensure user profile exists when user signs in (do this after callback)
    if (user && event === 'SIGNED_IN') {
      try {
        console.log('Creating user profile for signed in user');
        await ensureUserProfile(user);
      } catch (error) {
        console.error('Error ensuring user profile:', error);
      }
    }
    
    if (event === 'SIGNED_OUT') {
      console.log('User signed out event detected');
    }
    
    console.log('=== AUTH STATE CHANGE COMPLETE ===');
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