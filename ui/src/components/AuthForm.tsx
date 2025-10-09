import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface AuthFormProps {
  onAuthSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithLinkedIn, isLoading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let result;
      if (isSignUp) {
        result = await signUp(email, password);
        
        if (result.success) {
          if (result.data?.user && !result.data.user.email_confirmed_at) {
            toast.success('Check your email for the confirmation link!');
          } else {
            toast.success('Account created successfully!');
            onAuthSuccess?.();
            navigate('/request');
          }
        } else {
          toast.error(result.error || 'Sign up failed');
        }
      } else {
        result = await signIn(email, password);
        
        if (result.success) {
          toast.success('Signed in successfully!');
          onAuthSuccess?.();
          navigate('/request');
        } else {
          toast.error(result.error || 'Sign in failed');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    }
  };

  const handleLinkedInAuth = async () => {
    try {
      const result = await signInWithLinkedIn();
      
      if (result.success) {
        toast.success('Signed in with LinkedIn successfully!');
        onAuthSuccess?.();
        navigate('/request');
      } else {
        toast.error(result.error || 'LinkedIn authentication failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'LinkedIn authentication failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        {/* LinkedIn Auth Button */}
        <button
          onClick={handleLinkedInAuth}
          disabled={authLoading}
          className="w-full mb-4 bg-[#0077B5] hover:bg-[#005885] text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          {authLoading ? 'Connecting...' : 'Continue with LinkedIn'}
        </button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {authLoading 
              ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
              : (isSignUp ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary-600 hover:text-primary-700 transition"
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      </div>
    </div>
  );
};