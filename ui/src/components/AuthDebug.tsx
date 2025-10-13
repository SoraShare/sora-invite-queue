import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthDebugProps {
  // We can optionally pass auth state as props or use the hook directly
  authState?: ReturnType<typeof useAuth>;
}

export const AuthDebug: React.FC<AuthDebugProps> = ({ authState }) => {
  // Use passed authState or get it from the hook
  const hookAuthState = useAuth();
  const { user, isLoading: isAuthLoading, isAuthenticated, clearAuthState } = authState || hookAuthState;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50 max-w-xs">
      <div>User: {user?.id ? `${user.id.substring(0, 8)}...` : 'null'}</div>
      <div>Email: {user?.email || 'null'}</div>
      <div>Loading: {isAuthLoading ? 'yes' : 'no'}</div>
      <div>Authenticated: {isAuthenticated ? 'yes' : 'no'}</div>
      <div className="flex gap-1 mt-2">
        <button 
          onClick={clearAuthState}
          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
        >
          Clear Auth
        </button>
      </div>
    </div>
  );
};