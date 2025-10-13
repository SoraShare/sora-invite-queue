import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RequestCode } from '@/components/RequestCode';
import { DonateCode } from '@/components/DonateCode';
import { Homepage } from '@/components/Homepage';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AuthDebug } from '@/components/AuthDebug';
import { UserPage } from '@/components/UserPage';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from 'react-hot-toast';

function App() {
  const authState = useAuth();
  const { user, isLoading: isAuthLoading, isAuthenticated } = authState;
  const isDebugEnabled = import.meta.env.VITE_SHOW_AUTH_DEBUG === 'true';

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
        {isDebugEnabled && <AuthDebug authState={authState} />}
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <Routes>
        {/* Homepage - Public (standalone layout) - now handles auth redirects */}
        <Route path="/" element={<Homepage />} />
        
        {/* All other routes with navigation layout */}
        <Route path="/account" element={
          <Layout>
            <Navigation authState={authState} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
              <UserPage authState={authState} />
            </main>
            <MobileBottomNav isVisible={!!user} />
          </Layout>
        } />
        
        <Route 
          path="/request" 
          element={
            <Layout>
              <Navigation authState={authState} />
              <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
                <ProtectedRoute authState={authState}>
                  <RequestCode authState={authState} />
                </ProtectedRoute>
              </main>
              <MobileBottomNav isVisible={!!user} />
            </Layout>
          } 
        />
        
        <Route 
          path="/donate" 
          element={
            <Layout>
              <Navigation authState={authState} />
              <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
                <ProtectedRoute authState={authState}>
                  <DonateCode authState={authState} />
                </ProtectedRoute>
              </main>
              <MobileBottomNav isVisible={!!user} />
            </Layout>
          } 
        />
        
        <Route 
          path="/account" 
          element={
            <Layout>
              <Navigation authState={authState} />
              <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
                <ProtectedRoute authState={authState}>
                  <UserPage authState={authState} />
                </ProtectedRoute>
              </main>
              <MobileBottomNav isVisible={!!user} />
            </Layout>
          } 
        />
        
        {/* Default fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Debug info */}
      {isDebugEnabled && <AuthDebug authState={authState} />}
    </>
  );
}

export default App;