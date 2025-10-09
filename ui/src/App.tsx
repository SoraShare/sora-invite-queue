import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthForm } from '@/components/AuthForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RequestCode } from '@/components/RequestCode';
import { DonateCode } from '@/components/DonateCode';
import { Homepage } from '@/components/Homepage';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useQueue } from '@/hooks/useQueue';
import toast, { Toaster } from 'react-hot-toast';
import { Download, Gift } from 'lucide-react';

// Auth Page Component
const AuthPage = () => {
  const { user } = useAuth();
  const { stats } = useQueue(user?.id);

  if (user) {
    return <Navigate to="/request" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
        
        <AuthForm />

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
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const { user, signOut, isLoading } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    console.log('Sign out clicked, current user:', user);
    try {
      const result = await signOut();
      console.log('Sign out result:', result);
      
      if (result.success) {
        toast.success('Signed out successfully');
        // Force reload to clear any remaining state
        setTimeout(() => {
          window.location.href = '/auth';
        }, 100);
      } else {
        toast.error(result.error || 'Error signing out');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Sign out failed');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <Link to="/" className="block">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                SoraShare
              </h1>
              <p className="text-sm text-gray-600">
                Fair, transparent access to OpenAI Sora invitations
              </p>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <nav className="flex items-center gap-2">
                  <Link
                    to="/request"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive('/request')
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Request Code
                  </Link>
                  <Link
                    to="/donate"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive('/donate')
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Gift className="w-4 h-4" />
                    Donate Code
                  </Link>
                </nav>

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
              </>
            ) : (
              <div className="text-sm text-gray-600">
                Sign in to join the queue
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

function App() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isDebugEnabled = import.meta.env.VITE_SHOW_AUTH_DEBUG === 'true';
  const AuthDebug = () => {
    const { isAuthenticated } = useAuth();
    
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

    const forceNavigate = (path: string) => {
      window.location.href = path;
    };

    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50 max-w-xs">
        <div>User: {user?.id ? `${user.id.substring(0, 8)}...` : 'null'}</div>
        <div>Email: {user?.email || 'null'}</div>
        <div>Loading: {isAuthLoading ? 'yes' : 'no'}</div>
        <div>Authenticated: {isAuthenticated ? 'yes' : 'no'}</div>
        <div>Path: {window.location.pathname}</div>
        <div className="flex gap-1 mt-2">
          <button 
            onClick={clearAuthState}
            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            Clear Auth
          </button>
          <button 
            onClick={() => forceNavigate('/request')}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Force /request
          </button>
        </div>
      </div>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
        {isDebugEnabled && <AuthDebug />}
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <Routes>
        {/* Homepage - Public (standalone layout) */}
        <Route path="/" element={<Homepage />} />
        
        {/* All other routes with navigation layout */}
        <Route path="/auth" element={
          <Layout>
            <Navigation />
            <main className="flex-1 overflow-y-auto">
              <AuthPage />
            </main>
          </Layout>
        } />
        
        <Route 
          path="/request" 
          element={
            <Layout>
              <Navigation />
              <main className="flex-1 overflow-y-auto">
                <ProtectedRoute>
                  <RequestCode />
                </ProtectedRoute>
              </main>
            </Layout>
          } 
        />
        
        <Route 
          path="/donate" 
          element={
            <Layout>
              <Navigation />
              <main className="flex-1 overflow-y-auto">
                <ProtectedRoute>
                  <DonateCode />
                </ProtectedRoute>
              </main>
            </Layout>
          } 
        />
        
        {/* Default fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Debug info */}
      {isDebugEnabled && <AuthDebug />}
    </>
  );
}

export default App;