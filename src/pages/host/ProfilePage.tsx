import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ProfileService, Profile } from '../../services/profileService';

export default function HostProfilePage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company_name: ''
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [appearance, setAppearance] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    // Load theme preference
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        setAppearance(stored);
      } else {
        setAppearance('system');
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Load user profile data
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const profileData = await ProfileService.getProfile(user.id);
      
      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          company_name: profileData.company_name || ''
        });
      } else {
        // Use data from auth context if profile doesn't exist
        setFormData({
          full_name: user.name || '',
          email: user.email || '',
          company_name: ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      addNotification('error', 'Error', 'Failed to load profile data.');
      
      // Fallback to auth context data
      setFormData({
        full_name: user.name || '',
        email: user.email || '',
        company_name: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      localStorage.removeItem('theme');
    } else {
      root.classList.toggle('dark', mode === 'dark');
      localStorage.setItem('theme', mode);
    }
    setAppearance(mode);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      
      // Update profile data
      await ProfileService.updateProfile(user.id, {
        full_name: formData.full_name,
        company_name: formData.company_name
      });

      // Update email if changed
      if (formData.email !== user.email) {
        await ProfileService.updateEmail(formData.email);
        addNotification('info', 'Email Update', 'A confirmation email has been sent to your new email address.');
      }

      addNotification('success', 'Profile Updated', 'Your profile has been successfully updated.');
      
      // Reload profile data
      await loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      addNotification('error', 'Save Failed', 'Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addNotification('error', 'Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      addNotification('error', 'Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      setSaving(true);
      await ProfileService.updatePassword(passwordData.newPassword);
      addNotification('success', 'Password Updated', 'Your password has been successfully updated.');
      
      // Clear password fields
      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      addNotification('error', 'Update Failed', 'Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    try {
      await ProfileService.sendPasswordReset(user.email);
      addNotification('success', 'Reset Email Sent', 'A password reset email has been sent to your email address.');
    } catch (error) {
      console.error('Error sending password reset:', error);
      addNotification('error', 'Reset Failed', 'Failed to send password reset email. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your account settings and profile information</p>
      </div>

      {/* Personal Information Section */}
      <div className="mb-8">
        <Card title="Personal Information" subtitle="Update your personal information and company details.">
          <form onSubmit={handleSaveChanges} className="space-y-6">
            <Input 
              id="full_name" 
              name="full_name" 
              label="Full Name" 
              value={formData.full_name} 
              onChange={handleInputChange} 
              required 
            />
            <Input 
              id="email" 
              name="email" 
              type="email" 
              label="Email" 
              value={formData.email} 
              onChange={handleInputChange} 
              required 
            />
            <Input 
              id="company_name" 
              name="company_name" 
              label="Company Name" 
              value={formData.company_name} 
              onChange={handleInputChange} 
              placeholder="Enter your company name (optional)" 
            />
            
            {profile && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Account Type</label>
                  <div className="text-sm text-gray-900 dark:text-white capitalize">{profile.role}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Subscription</label>
                  <div className="text-sm text-gray-900  dark:text-white capitalize">{profile.subscription_tier}</div>
                </div>
              </div>
            )}
            
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </Card>
      </div>

      {/* Change Password Section */}
      <div className="mb-8">
        <Card title="Change Password" subtitle="Update your account password for security.">
          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <Input 
              id="newPassword" 
              name="newPassword" 
              type="password" 
              label="New Password" 
              value={passwordData.newPassword} 
              onChange={handlePasswordChange}
              placeholder="Enter new password (min 6 characters)"
              required 
            />
            <Input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              label="Confirm New Password" 
              value={passwordData.confirmPassword} 
              onChange={handlePasswordChange}
              placeholder="Confirm your new password"
              required 
            />
            <div className="flex space-x-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handlePasswordReset}
                disabled={saving}
              >
                Send Reset Email
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Appearance Settings Section */}
      <div className="mb-8">
        <Card title="Appearance" subtitle="Choose how the interface looks and feels.">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Button variant={appearance === 'light' ? 'primary' : 'secondary'} onClick={() => applyTheme('light')}>Light</Button>
              <Button variant={appearance === 'dark' ? 'primary' : 'secondary'} onClick={() => applyTheme('dark')}>Dark</Button>
              <Button variant={appearance === 'system' ? 'primary' : 'secondary'} onClick={() => applyTheme('system')}>System</Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">System uses your device setting and updates automatically.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
