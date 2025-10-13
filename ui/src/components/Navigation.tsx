import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download, Gift, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserDropdown } from './UserDropdown';
import { useAuth } from '@/hooks/useAuth';

interface NavigationProps {
  authState: ReturnType<typeof useAuth>;
}

export const Navigation: React.FC<NavigationProps> = ({ authState }) => {
  const { user, signOut, isLoading } = authState;
  const location = useLocation();

  console.log('Navigation - user:', user?.id || 'null', 'isLoading:', isLoading);

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      
      if (result.success) {
        toast.success('Signed out successfully');
      } else {
        toast.error(result.error || 'Error signing out');
      }
    } catch (error) {
      toast.error('Sign out failed');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo section */}
          <div className="flex-shrink-0">
            <Link to="/" className="block">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                SoraShare
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Fair, transparent access to OpenAI Sora invitations
              </p>
            </Link>
          </div>

          {/* Desktop Navigation and User section */}
          <div className="flex items-center gap-6">
            {user ? (
              <>
                {/* Desktop Navigation - Hidden on mobile */}
                <nav className="hidden md:flex items-center gap-2">
                  <Link
                    to="/request"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive('/request')
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span className="whitespace-nowrap">Request Code</span>
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
                    <span className="whitespace-nowrap">Donate Code</span>
                  </Link>
                  <Link
                    to="/account"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive('/account')
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span className="whitespace-nowrap">Account</span>
                  </Link>
                </nav>

                {/* User section */}
                <div className="flex items-center gap-3">
                  <UserDropdown user={user} onSignOut={handleSignOut} />
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