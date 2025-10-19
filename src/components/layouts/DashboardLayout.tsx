import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Plus,
  BarChart3,
  FileText,
  User,
  HelpCircle,
  LogOut,
  Target,
  Menu,
  Megaphone,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationToast from '../NotificationToast';
import Logo from '../shared/Logo';
import ThemeToggle from '../shared/ThemeToggle';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBreadcrumb?: boolean;
}

export default function DashboardLayout({
  children,
  title,
  subtitle
}: DashboardLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const navigationItems = [
    { name: 'Dashboard', href: '/client', icon: LayoutDashboard },
    { name: 'New Campaign', href: '/client/new-campaign', icon: Plus },
    { name: 'Manage Campaigns', href: '/client/campaigns', icon: Target },
    { name: 'Analytics', href: '/client/analytics', icon: BarChart3 },
    { name: 'Billing', href: '/client/billing', icon: FileText },
    { name: 'Profile', href: '/client/profile', icon: User },
    { name: 'Help Center', href: '/client/help', icon: HelpCircle },
    { name: 'Create Custom Ads', href: '/client/custom-ads', icon: Megaphone },
    { name: 'Manage My Custom Ad', href: '/client/manage-custom-ads', icon: MessageSquare },
  ];

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogoClick = () => {
    navigate('/client');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      // Still navigate to landing page even if there's an error
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <NotificationToast />
      
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left side - Menu button */}
          <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Center - Logo and Branding (Mobile) */}
          <div className="lg:hidden flex items-center justify-center flex-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg border border-white/20 p-1">
                <Logo 
                  size="sm" 
                  showText={false} 
                  className="w-full h-full"
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">EZKIOSK ADS.com</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">EZ Kiosk Ads</div>
              </div>
            </div>
          </div>
          
          {/* Desktop Logo */}
          <div className="hidden lg:flex items-center">
            <button
              onClick={handleLogoClick}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Logo 
                size="xl" 
                showText={true} 
                textClassName="text-2xl font-bold text-gray-900 dark:text-white" 
                variant="dark"
              />
            </button>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <ThemeToggle variant="dropdown" size="md" />
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar - Fixed Position */}
      <div className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-16 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 shadow-xl border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full">
            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/client' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }`} />
                    <span className='text-black dark:text-white'>{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </nav>

            
          </div>
        </div>

      {/* Main Content */}
      <div className="lg:ml-64 lg:pt-16">
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{title}</h1>
              {subtitle && <p className="text-lg text-gray-600 dark:text-gray-300">{subtitle}</p>}
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
