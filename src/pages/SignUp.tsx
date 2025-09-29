import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, UserCircle2, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import AuthLayout from '../components/layouts/AuthLayout';
import PasswordStrength from '../components/shared/PasswordStrength';
import { MailchimpService } from '../services/mailchimpService';
import GoogleIcon from '../components/icons/GoogleIcon';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'host'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCapsWarning, setShowCapsWarning] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate form fields
    if (!name.trim()) {
      setIsLoading(false);
      addNotification('error', 'Name Required', 'Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setIsLoading(false);
      addNotification('error', 'Email Required', 'Please enter your email address.');
      return;
    }

    if (password !== confirmPassword) {
      setIsLoading(false);
      addNotification('error', 'Passwords do not match', 'Please confirm your password and try again.');
      return;
    }

    if (password.length < 6) {
      setIsLoading(false);
      addNotification('error', 'Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      // Sign up the user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { 
            name: name.trim(), 
            role: role 
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        addNotification('success', 'Account Created!', 'Please check your email to confirm your account before signing in.');
        // Fire-and-forget Mailchimp opt-in (non-blocking)
        if ((import.meta as any)?.env?.VITE_ENABLE_MAILCHIMP && newsletterOptIn) {
          MailchimpService.subscribe({
            email: email.trim(),
            first_name: name.trim().split(' ')[0] || undefined,
            last_name: name.trim().split(' ').slice(1).join(' ') || undefined,
            tags: ['signup']
          }).catch(() => {});
        }
        navigate('/signin');
      } else {
        throw new Error('No user data returned from signup');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Database error')) {
        addNotification('error', 'Sign Up Failed', 'There was an issue creating your account. Please try again or contact support.');
      } else if (error.message?.includes('already registered')) {
        addNotification('error', 'Email Already Exists', 'An account with this email already exists. Please sign in instead.');
      } else if (error.message?.includes('password')) {
        addNotification('error', 'Invalid Password', 'Please ensure your password meets the requirements.');
      } else {
        addNotification('error', 'Sign Up Failed', error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create your account</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Join our digital advertising platform today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full name</label>
            <div className="relative group">
              <UserCircle2 className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                errors.name ? 'text-red-400' : name ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-500'
              }`} />
              <input 
                type="text"
                className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 ${
                  errors.name 
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10' 
                    : 'border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700'
                }`}
                placeholder="Enter your full name"
                value={name} 
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                required 
              />
              {errors.name && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
              />
              <span>
                Send me product updates, tips, and occasional marketing emails. You can unsubscribe at any time.
              </span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email address</label>
            <div className="relative group">
              <Mail className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                errors.email ? 'text-red-400' : email ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-500'
              }`} />
              <input 
                type="email" 
                className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 ${
                  errors.email 
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10' 
                    : 'border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700'
                }`}
                placeholder="Enter your email address"
                value={email} 
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <div className="relative group">
              <Lock className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                errors.password ? 'text-red-400' : password ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-500'
              }`} />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full pl-11 pr-12 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 ${
                  errors.password 
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10' 
                    : 'border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700'
                }`}
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                onKeyUp={(e) => setShowCapsWarning((e.getModifierState && e.getModifierState('CapsLock')) || false)}
                required
                aria-describedby="password-help"
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
            <PasswordStrength password={password} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm password</label>
            <div className="relative group">
              <Lock className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                (confirmPassword && confirmPassword !== password) || errors.confirmPassword ? 'text-red-400' : confirmPassword ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-500'
              }`} />
              <input 
                type={showConfirmPassword ? 'text' : 'password'}
                className={`w-full pl-11 pr-12 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 ${
                  (confirmPassword && confirmPassword !== password) || errors.confirmPassword
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10' 
                    : 'border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700'
                }`}
                placeholder="Confirm your password"
                value={confirmPassword} 
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
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
              {confirmPassword && confirmPassword !== password && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Passwords do not match</span>
                </div>
              )}
              {errors.confirmPassword && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account type</label>
            <div className="relative group">
              <Shield className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <select 
                className="w-full pl-11 pr-4 py-3 border-2 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700 appearance-none" 
                value={role} 
                onChange={(e) => setRole(e.target.value as 'client' | 'host')}
              >
                <option value="client">Client - I want to advertise</option>
                <option value="host">Host - I have display spaces</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
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
                <span>Creating account...</span>
              </div>
            ) : (
              'Create Account'
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
            <span>Sign up with Google</span>
          </button>

          <div className="text-center pt-4 space-y-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              By creating an account, you agree to our{' '}
              <Link 
                to="/terms" 
                className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200 underline"
              >
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link 
                to="/privacy" 
                className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200 underline"
              >
                Privacy Policy
              </Link>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Already have an account? </span>
              <Link 
                to="/signin" 
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
              >
                Sign in here
              </Link>
            </div>
          </div>
      </form>
    </AuthLayout>
  );
}


