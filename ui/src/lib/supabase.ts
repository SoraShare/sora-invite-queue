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

// Validate required environment variables
const validateEnvVars = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    );
  }
};

validateEnvVars();

// Helper function for environment-aware redirect URLs
const getRedirectUrl = () => {
  if (typeof window === 'undefined') return '';
  
  // Use environment variable or current origin
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl}/request`;
};

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

// Pure function to update user profile in database (no auth state management)
export const updateUserProfileInDB = async (userId: string, profileData: {
  full_name?: string;
  github_url?: string;
  linkedin_url?: string;
}) => {
  try {
    // Extract LinkedIn profile URL and convert to potential LinkedIn ID format
    let linkedin_id;
    if (profileData.linkedin_url) {
      const linkedinMatch = profileData.linkedin_url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      linkedin_id = linkedinMatch ? linkedinMatch[1] : profileData.linkedin_url;
    }

    // Update user profile in database
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: profileData.full_name,
        github_profile_url: profileData.github_url,
        linkedin_id: linkedin_id,
        linkedin_profile_url: profileData.linkedin_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err: any) {
    const errorMessage = err.message || 'Failed to update profile';
    return { success: false, error: errorMessage };
  }
};

// Pure function to get fresh user profile data (no auth state management)
export const getUserProfileData = async (userId: string) => {
  try {
    const profileData = await getUserProfile(userId);
    if (profileData) {
      return { 
        success: true,
        profileData: {
          full_name: profileData.full_name,
          github_url: profileData.github_profile_url,
          linkedin_url: profileData.linkedin_profile_url || 
                       (profileData.linkedin_id ? `https://linkedin.com/in/${profileData.linkedin_id}` : null),
          linkedin_id: profileData.linkedin_id,
        }
      };
    }
    return { success: true, profileData: null };
  } catch (error: any) {
    console.error('Failed to get user profile data:', error);
    return { success: false, error: error.message || 'Failed to get profile data', profileData: null };
  }
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
      emailRedirectTo: getRedirectUrl(),
    },
  });
  return { data, error };
};

export const signInWithLinkedIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: getRedirectUrl(),
    },
  });
  return { data, error };
};

export const signInWithGitHub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: getRedirectUrl(),
    },
  });
  return { data, error };
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err: any) {
    return { error: err };
  }
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
      // Determine auth provider based on user metadata
      let auth_provider = 'email';
      if (user.app_metadata?.provider === 'github') {
        auth_provider = 'github';
      } else if (user.app_metadata?.provider === 'linkedin_oidc') {
        auth_provider = 'linkedin';
      }

      // Create user profile if it doesn't exist
      await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          avatar_url: user.user_metadata?.avatar_url,
          linkedin_id: user.user_metadata?.sub || user.user_metadata?.provider_id,
          auth_provider: auth_provider,
          github_profile_url: user.user_metadata?.user_name ? `https://github.com/${user.user_metadata.user_name}` : null,
          linkedin_profile_url: user.user_metadata?.linkedin_url || null,
        });
    }
  } catch (error) {
    // Silently handle profile creation errors
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  // Get initial session first
  supabase.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user ?? null;
    console.log('Initial session user:', user?.id || 'null');
    callback(user);
  });

  // Then listen for changes
  return supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user ?? null;
    console.log('Auth state change event:', event, 'user:', user?.id || 'null');
    
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