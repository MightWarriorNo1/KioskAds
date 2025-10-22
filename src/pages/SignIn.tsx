import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/layouts/AuthLayout';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import GoogleIcon from '../components/icons/GoogleIcon';
import AuthRedirect from '../components/AuthRedirect';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [showCapsWarning, setShowCapsWarning] = useState(false);
  
  const { signIn } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    setFormError(''); // Clear form error when validating
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setFormError(''); // Clear any previous form errors

    try {
      await signIn(email, password);
      
      // Wait a moment for the auth state to update
      setTimeout(() => {
        addNotification('success', 'Welcome!', 'Successfully signed in to your account.');
      }, 100);
    } catch (error: any) {
      console.error('Sign-in error:', error);
      let errorMessage = 'Invalid email or password. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many sign-in attempts. Please wait a moment and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Set form error for display on the form
      setFormError(errorMessage);
      // Also show notification for additional feedback
      addNotification('error', 'Sign In Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed demo users and role chips from sign-in

  return (
    <AuthLayout>
      <AuthRedirect />
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-6 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all`}>
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      Sign In Failed
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {formError}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email address
              </label>
              <div className="relative group">
                <Mail className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                  errors.email ? 'text-red-400' : email ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-500'
                }`} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                    if (formError) setFormError('');
                  }}
                  className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 ${
                    errors.email 
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/10' 
                      : 'border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700'
                  }`}
                  placeholder="Enter your email"
                  required
                />
                {errors.email && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                  errors.password ? 'text-red-400' : password ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-500'
                }`} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                    if (formError) setFormError('');
                  }}
                  className={`w-full pl-11 pr-12 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 ${
                    errors.password 
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/10' 
                      : 'border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700'
                  }`}
                  placeholder="Enter your password"
                  required
                  onKeyUp={(e) => setShowCapsWarning((e.getModifierState && e.getModifierState('CapsLock')) || false)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 focus:outline-none focus:text-indigo-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {errors.password && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.password}</span>
                  </div>
                )}
                {showCapsWarning && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Caps Lock is on</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 font-medium">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <GoogleIcon className="h-5 w-5" />
            <span>Sign in with Google</span>
          </button>

          <div className="text-center pt-4">
            <span className="text-lg text-gray-600 dark:text-gray-400">Don't have an account? </span>
            <Link 
              to="/signup" 
              className="text-lg font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
            >
              Create one now
            </Link>
          </div>
      </form>
    </AuthLayout>
  );
}