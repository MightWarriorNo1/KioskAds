import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  MapPin, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  FileText,
  PlusCircle,
  Megaphone,
  Menu, 
  LogOut,
  Receipt,
  MessageSquare,
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../shared/Logo';
import ThemeToggle from '../shared/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/host', icon: BarChart3 },
  { name: 'Kiosk Manager', href: '/host/kiosks', icon: MapPin },
  { name: 'My Kiosk Ad Upload', href: '/host/ads', icon: Calendar },
  { name: 'Create Campaign', href: '/host/new-campaign', icon: PlusCircle },
  { name: 'Manage Campaigns', href: '/host/campaigns', icon: Receipt },
  { name: 'Billing', href: '/host/billing', icon: CreditCard },
  { name: 'Revenue Tracker', href: '/host/revenue', icon: DollarSign },
  { name: 'Payout History', href: '/host/payouts', icon: CreditCard },
  { name: 'Analytics', href: '/host/analytics', icon: FileText },
  { name: 'Create Custom Ads', href: '/host/custom-ads', icon: Megaphone },
  { name: 'Manage My Custom Ad', href: '/host/manage-custom-ads', icon: MessageSquare },
  { name: 'Profile', href: '/host/profile', icon: User },
];

interface HostLayoutProps {
  children: React.ReactNode;
}

export default function HostLayout({ children }: HostLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogoClick = () => {
    navigate('/host');
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
      
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left side - Menu button */}
          <button
              onClick={() => setSidebarOpen(true)}
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
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-16 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 shadow-xl border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full">
            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
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
      <div className="lg:ml-64">
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Global click handler to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}