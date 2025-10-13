import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQueue } from '@/hooks/useQueue';
import { AuthForm } from './AuthForm';
import { CommunityStats } from './CommunityStats';
// Profile functions now come from useAuth hook
import toast from 'react-hot-toast';

interface UserPageProps {
  authState?: ReturnType<typeof useAuth>;
}

export const UserPage: React.FC<UserPageProps> = ({ authState }) => {
  // Use passed authState or get it from the hook
  const hookAuthState = useAuth();
  const { user, isLoading, updateProfile, refreshUserProfile } = authState || hookAuthState;
  const { stats } = useQueue(user?.id);

  // State for profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [githubProfile, setGithubProfile] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form fields when user data changes
  React.useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      setGithubProfile(user.user_metadata?.github_url || '');
      setLinkedinProfile(user.user_metadata?.linkedin_url || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.error('No user logged in');
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateProfile({
        full_name: fullName || undefined,
        github_url: githubProfile || undefined,
        linkedin_url: linkedinProfile || undefined,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      
      // Refresh user profile data (the user state will be updated by the auth listener)
      await refreshUserProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form fields to original values
    if (user) {
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      setGithubProfile(user.user_metadata?.github_url || '');
      setLinkedinProfile(user.user_metadata?.linkedin_url || '');
    }
    setIsEditing(false);
  };

  // If user is not authenticated, show the auth form
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="text-center">
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Join the Sora Invite Queue
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
              Connect with your LinkedIn account or email to join our verified community 
              and access the fair distribution queue for Sora invitations.
            </p>
          </div>
          
          <AuthForm />

          {/* Public Stats */}
          <CommunityStats stats={stats} />
        </div>
      </div>
    );
  }

  // If user is authenticated, show profile management
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
          Account Settings
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
          Manage your profile information and social media links.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary text-sm"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="btn-primary text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg transition ${
                  isEditing 
                    ? 'focus:ring-2 focus:ring-primary-500 focus:border-primary-500' 
                    : 'bg-gray-50 cursor-not-allowed'
                }`}
                placeholder="Enter your full name"
              />
            </div>

            {/* LinkedIn Profile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={linkedinProfile}
                onChange={(e) => setLinkedinProfile(e.target.value)}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg transition ${
                  isEditing 
                    ? 'focus:ring-2 focus:ring-primary-500 focus:border-primary-500' 
                    : 'bg-gray-50 cursor-not-allowed'
                }`}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>

            {/* GitHub Profile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Profile URL
              </label>
              <input
                type="url"
                value={githubProfile}
                onChange={(e) => setGithubProfile(e.target.value)}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg transition ${
                  isEditing 
                    ? 'focus:ring-2 focus:ring-primary-500 focus:border-primary-500' 
                    : 'bg-gray-50 cursor-not-allowed'
                }`}
                placeholder="https://github.com/yourusername"
              />
            </div>

            {/* Account Info */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Account Information</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">User ID:</span> {user.id}</p>
                <p><span className="font-medium">Created:</span> {new Date(user.created_at || '').toLocaleDateString()}</p>
                <p><span className="font-medium">Last Sign In:</span> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};