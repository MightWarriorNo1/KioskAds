import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import AuthLayout from '../components/layouts/AuthLayout';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string>('');
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [showCapsWarning, setShowCapsWarning] = useState(false);
  
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Check if we have a valid session (Supabase sets session when user clicks reset link)
    const checkSession = async () => {
      try {
        // Check if there's a hash fragment with access token (Supabase puts recovery tokens in hash)
        const hash = window.location.hash;
        const hasRecoveryToken = hash.includes('access_token') && hash.includes('type=recovery');
        
        if (hasRecoveryToken) {
          // Supabase client should automatically process the hash fragment
          // Listen for auth state changes to detect when session is established
          const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session?.user)) {
              setIsValidToken(true);
              if (subscription) {
                subscription.unsubscribe();
                subscription = null;
              }
            }
          });
          subscription = authSubscription;

          // Also check immediately and after delays
          let attempts = 0;
          const maxAttempts = 5;
          
          const checkSessionWithRetry = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Error checking session:', error);
              if (attempts >= maxAttempts) {
                setIsValidToken(false);
                if (subscription) {
                  subscription.unsubscribe();
                  subscription = null;
                }
              }
              return;
            }

            if (session?.user) {
              setIsValidToken(true);
              if (subscription) {
                subscription.unsubscribe();
                subscription = null;
              }
            } else if (attempts < maxAttempts) {
              attempts++;
              timeoutId = setTimeout(checkSessionWithRetry, 500);
            } else {
              setIsValidToken(false);
              if (subscription) {
                subscription.unsubscribe();
                subscription = null;
              }
            }
          };

          // Start checking
          checkSessionWithRetry();
        } else {
          // No hash fragment, check for existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error checking session:', error);
            setIsValidToken(false);
            return;
          }

          if (session?.user) {
            setIsValidToken(true);
          } else {
            setIsValidToken(false);
          }
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setIsValidToken(false);
      }
    };

    checkSession();

    // Cleanup
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    setFormError('');
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setFormError('');

    try {
      // Update the password using Supabase auth
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });
      
      if (error) {
        throw error;
      }
      
      addNotification('success', 'Password Reset', 'Your password has been successfully reset. You can now sign in with your new password.');
      
      // Redirect to sign in page after a short delay
      setTimeout(() => {
        navigate('/signin', { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('session')) {
          errorMessage = 'This password reset link has expired or is invalid. Please request a new one.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setFormError(errorMessage);
      addNotification('error', 'Reset Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Validating reset link...</p>
        </div>
      </AuthLayout>
    );
  }

  if (isValidToken === false) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid or Expired Link</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            This password reset link has expired or is invalid. Please request a new password reset link.
          </p>
          <button
            onClick={() => navigate('/signin')}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
          >
            Back to Sign In
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Your Password</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Enter your new password below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Reset Failed
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {formError}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Password
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
              placeholder="Enter your new password"
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

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirm New Password
          </label>
          <div className="relative group">
            <Lock className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
              errors.confirmPassword ? 'text-red-400' : confirmPassword ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-500'
            }`} />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                if (formError) setFormError('');
              }}
              className={`w-full pl-11 pr-12 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 ${
                errors.confirmPassword 
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/10' 
                  : 'border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700'
              }`}
              placeholder="Confirm your new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 focus:outline-none focus:text-indigo-500"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            {errors.confirmPassword && (
              <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.confirmPassword}</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:hover:scale-100"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Resetting password...</span>
            </div>
          ) : (
            'Reset Password'
          )}
        </button>

        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
          >
            Back to Sign In
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

