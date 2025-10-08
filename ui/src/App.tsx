import { useEffect } from 'react';
import { QueueCard } from '@/components/QueueCard';
import { AuthForm } from '@/components/AuthForm';
import { useQueue } from '@/hooks/useQueue';
import { useAuth } from '@/hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const { 
    user, 
    isLoading: isAuthLoading, 
    error: authError, 
    signOut: handleAuthSignOut,
    clearError: clearAuthError 
  } = useAuth();
  
  const {
    position,
    stats,
    isLoading,
    isInQueue,
    error,
    queryInvitationCode,
    leaveQueue,
  } = useQueue(user?.id);

  // Show error toasts
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Show auth error toasts
  useEffect(() => {
    if (authError) {
      toast.error(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  const handleQueryInvitationCode = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    try {
      const invitationCode = await queryInvitationCode();
      if (invitationCode) {
        toast.success(`Invitation code: ${invitationCode}`);
      } else if (!error) {
        toast.success('Joined the queue! You will be notified when a code is available.');
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await leaveQueue();
      toast.success('Left the queue');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleSignOut = async () => {
    const result = await handleAuthSignOut();
    if (result.success) {
      toast.success('Signed out successfully');
    } else {
      toast.error(result.error || 'Error signing out');
    }
  };

  const handleAuthSuccess = () => {
    // Authentication successful
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sora Invite Queue
              </h1>
              <p className="text-sm text-gray-600">
                Fair, transparent access to OpenAI Sora invitations
              </p>
            </div>
            
            {!user ? (
              <div className="text-sm text-gray-600">
                Sign in to join the queue
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  Welcome, {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                </div>
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {(user.user_metadata?.full_name || user.user_metadata?.name || user.email)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 px-2 py-1 rounded hover:bg-gray-100"
                  aria-label="Sign out of your account"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!user ? (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Join the Sora Invite Queue
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Connect with your LinkedIn account or email to join our verified community 
                and access the fair distribution queue for Sora invitations.
              </p>
            </div>
            
            <AuthForm onAuthSuccess={handleAuthSuccess} />

            {/* Public Stats */}
            {stats && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
                  Community Statistics
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {stats.totalInQueue}
                    </div>
                    <div className="text-sm text-gray-600">In Queue</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {stats.totalProcessed}
                    </div>
                    <div className="text-sm text-gray-600">Processed</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {stats.availableCodes}
                    </div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {stats.returnRate}%
                    </div>
                    <div className="text-sm text-gray-600">Return Rate</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <QueueCard
            position={position}
            stats={stats || {
              totalInQueue: 0,
              averageWaitTime: 0,
              totalProcessed: 0,
              availableCodes: 0,
              returnRate: 0,
            }}
            isInQueue={isInQueue}
            isLoading={isLoading}
            onQueryInvitationCode={handleQueryInvitationCode}
            onLeaveQueue={handleLeaveQueue}
          />
        )}
        </div>
      </main>

      {/* Footer - Sticky at bottom */}
      <footer className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="text-sm">
              Built for the AI community • Fair • Transparent • Open Source
            </p>
            <p className="text-xs mt-2">
              Part of the SoraShare community initiative
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;