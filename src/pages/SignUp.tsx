import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, UserCircle2, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
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
  const [address, setAddress] = useState('');
  const [role] = useState<'client' | 'host' | 'designer' | 'admin'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCapsWarning, setShowCapsWarning] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [invitationRole, setInvitationRole] = useState<string | null>(null);
  const [isInvitationValid, setIsInvitationValid] = useState<boolean | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  // Handle invitation parameters
  useEffect(() => {
    const token = searchParams.get('invitation');
    const emailParam = searchParams.get('email');
    const roleParam = searchParams.get('role');

    if (token && emailParam && roleParam) {
      setInvitationToken(token);
      setInvitationEmail(emailParam);
      setInvitationRole(roleParam);
      setEmail(emailParam);
      // Role is now fixed to 'client' for all signups
      
      // Validate invitation
      validateInvitation(token, emailParam, roleParam);
    }
  }, [searchParams]);

  const validateInvitation = async (token: string, email: string, role: string) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('email', email)
        .eq('role', role)
        .eq('status', 'sent')
        .single();

      if (error || !data) {
        setIsInvitationValid(false);
        addNotification('error', 'Invalid Invitation', 'This invitation is invalid or has expired.');
        return;
      }

      // Check if invitation is expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      if (now > expiresAt) {
        setIsInvitationValid(false);
        addNotification('error', 'Invitation Expired', 'This invitation has expired.');
        return;
      }

      setIsInvitationValid(true);
    } catch (error) {
      console.error('Error validating invitation:', error);
      setIsInvitationValid(false);
      addNotification('error', 'Error', 'Failed to validate invitation.');
    }
  };

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
      // If this is an invitation signup, validate the invitation first
      if (invitationToken && isInvitationValid === false) {
        addNotification('error', 'Invalid Invitation', 'This invitation is invalid or has expired.');
        setIsLoading(false);
        return;
      }

      // Determine the actual role - use invitationRole if available, otherwise use default role
      const actualRole = (invitationRole && isInvitationValid) 
        ? (invitationRole as 'client' | 'host' | 'designer' | 'admin')
        : role;

      // Sign up the user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { 
            name: name.trim(), 
            role: actualRole,
            address: address.trim()
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {

        // If this is an invitation signup, mark the invitation as accepted
        if (invitationToken && isInvitationValid) {
          try {
            await supabase
              .from('invitations')
              .update({ 
                status: 'accepted',
                accepted_at: new Date().toISOString()
              })
              .eq('token', invitationToken)
              .eq('email', email.trim());
          } catch (inviteError) {
            console.error('Error updating invitation status:', inviteError);
            // Don't fail the signup if invitation update fails
          }
        }

        addNotification('success', 'Account Created!', 'Please check your email to confirm your account before signing in.');
        
        // Send admin notification for new client signup
        if (actualRole === 'client' && data.user) {
          try {
            const { AdminNotificationService } = await import('../services/adminNotificationService');
            await AdminNotificationService.sendNewClientSignupNotification({
              type: 'new_client_signup',
              user_id: data.user.id,
              user_name: name.trim(),
              user_email: email.trim(),
              user_role: 'client',
              created_at: new Date().toISOString()
            });
          } catch (notifError) {
            console.error('Error sending admin notification:', notifError);
            // Don't fail signup if notification fails
          }
        }
        
        // Automatically add clients and hosts to Mailchimp with appropriate tags (regardless of newsletterOptIn)
        if ((import.meta as any)?.env?.VITE_ENABLE_MAILCHIMP && (actualRole === 'client' || actualRole === 'host')) {
          MailchimpService.subscribe({
            email: email.trim(),
            first_name: name.trim().split(' ')[0] || undefined,
            last_name: name.trim().split(' ').slice(1).join(' ') || undefined,
            tags: [actualRole], // Tag with 'client' or 'host'
            role: actualRole as 'client' | 'host' | 'designer' | 'admin'
          }).catch(() => {
            // Silently fail - don't block signup if Mailchimp fails
            console.warn('Failed to add user to Mailchimp:', email.trim());
          });
        }
        
        // Also handle newsletter opt-in for other roles or additional subscriptions
        if ((import.meta as any)?.env?.VITE_ENABLE_MAILCHIMP && newsletterOptIn && actualRole !== 'client' && actualRole !== 'host') {
          MailchimpService.subscribe({
            email: email.trim(),
            first_name: name.trim().split(' ')[0] || undefined,
            last_name: name.trim().split(' ').slice(1).join(' ') || undefined,
            tags: ['signup'],
            role: actualRole as 'client' | 'host' | 'designer' | 'admin'
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
        
        {/* Invitation indicator */}
        {invitationToken && (
          <div className={`mt-4 p-4 rounded-lg border-2 ${
            isInvitationValid === true 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : isInvitationValid === false
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              <Shield className={`h-5 w-5 ${
                isInvitationValid === true 
                  ? 'text-green-600 dark:text-green-400' 
                  : isInvitationValid === false
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`} />
              <span className={`text-sm font-medium ${
                isInvitationValid === true 
                  ? 'text-green-800 dark:text-green-200' 
                  : isInvitationValid === false
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {isInvitationValid === true 
                  ? `You've been invited as a ${invitationRole}`
                  : isInvitationValid === false
                  ? 'Invalid or expired invitation'
                  : 'Validating invitation...'
                }
              </span>
            </div>
          </div>
        )}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
            <div className="relative group">
              <input 
                type="text"
                className="w-full px-4 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 dark:hover:border-gray-600 border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-slate-700"
                placeholder="Enter your address"
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
              />
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


