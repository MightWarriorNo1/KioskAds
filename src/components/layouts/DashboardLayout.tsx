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

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/client', icon: LayoutDashboard },
    { name: 'Campaigns', href: '/client/campaigns', icon: Target },
    { name: 'Analytics', href: '/client/analytics', icon: BarChart3 },
    { name: 'New Campaign', href: '/client/new-campaign', icon: Plus },
    { name: 'Billing', href: '/client/billing', icon: FileText },
    { name: 'Profile', href: '/client/profile', icon: User },
    { name: 'Help Center', href: '/client/help', icon: HelpCircle },
    { name: 'Create Custom Ads', href: '/client/custom-ads', icon: Megaphone },
    { name: 'Manage My Custom Ad', href: '/client/manage-custom-ads', icon: MessageSquare },
  ];

  const isActive = (href: string) => {
    if (href === '/client') {
      // Dashboard should only be active when exactly on /client
      return location.pathname === '/client';
    }
    // Other items should be active when pathname starts with their href
    return location.pathname.startsWith(href);
  };

  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[rgb(var(--surface))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800 pt-16">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed left-0 right-0 top-16 bottom-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - Always fixed on left */}
      <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 bg-white/90 dark:bg-gray-900/80 backdrop-blur border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}


        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        
      </div>

      {/* Main Content - With left margin to account for fixed sidebar */}
      <div className="flex-1 flex flex-col lg:ml-72">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/70 dark:bg-gray-900/60 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 flex items-center justify-between">
          {/* Left side - Menu button */}
          <button className="lg:hidden btn-secondary" onClick={() => setMobileOpen(v => !v)}>
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Center - Logo and Branding (Mobile) */}
          <div className="lg:hidden flex items-center justify-center flex-1">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg border border-white/20 p-1">
                <Logo 
                  size="sm" 
                  showText={false} 
                  className="w-full h-full"
                />
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-white">EZ Kiosk Ads</div>
              </div>
            </div>
          </div>
          
          {/* Desktop Logo */}
          <div className="hidden lg:flex items-center">
            <Link to="/" className="hover:opacity-90 transition-opacity">
              <Logo
                size="xl"
                showText={true}
                textClassName="text-3xl font-bold"
                variant="dark"
              />
            </Link>
          </div>
          
          {/* Right side - Theme Toggle + Logout */}
          <div className="flex items-center gap-2">
            <ThemeToggle variant="dropdown" size="md" />
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-200/5 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 px-4 md:px-8 py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            {subtitle && <p className="text-lg">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
