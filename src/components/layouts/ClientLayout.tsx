import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Upload, 
  Calendar, 
  CreditCard, 
  ShoppingCart, 
  Menu, 
  X,
  LogOut,
  User,
  Settings,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationToast from '../NotificationToast';
import NotificationDropdown from '../shared/NotificationDropdown';
import Logo from '../shared/Logo';
import ThemeToggle from '../shared/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/client', icon: BarChart3 },
  { name: 'Upload Ads', href: '/client/upload', icon: Upload },
  { name: 'Campaigns', href: '/client/campaigns', icon: Calendar },
  { name: 'Analytics', href: '/client/analytics', icon: BarChart3 },
  { name: 'Proof-of-Play', href: '/client/proof-of-play', icon: FileText },
  { name: 'Billing', href: '/client/billing', icon: CreditCard },
  { name: 'Marketplace', href: '/client/marketplace', icon: ShoppingCart },
];

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <NotificationToast />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border-r border-slate-200/50 dark:border-slate-700/50 transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/20 p-1" >
                <Logo 
                  size="xl" 
                  showText={false} 
                  className="w-full h-full"
                />
              </div>
              <div>
                <span className="text-xl font-bold text-white">EZ Kiosk Ads</span>
                <p className="text-xs text-white/80">Client Portal</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white hover:scale-105'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'group-hover:opacity-10'}`}></div>
                  <item.icon className={`h-5 w-5 transition-all duration-300 relative z-10 ${
                    isActive 
                      ? 'text-white scale-110' 
                      : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-700 dark:group-hover:text-slate-100 group-hover:scale-110'
                  }`} />
                  <span className="relative z-10">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full shadow-sm relative z-10"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300 group"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform border border-white/20">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 capitalize">{user?.role}</p>
                </div>
              </button>
              
              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 py-2 z-10">
                  <Link
                    to="/client/settings"
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 rounded-lg mx-2"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-all duration-200 rounded-lg mx-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg border-b border-slate-200/50 dark:border-slate-700/50 fixed top-0 right-0 left-0 lg:left-72 z-40">
          <div className="flex items-center justify-between h-20 px-6">
            {/* Left side - Menu button */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden lg:block">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Client Portal</span>
                </div>
              </div>
            </div>
            
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
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">KIOSK ADS.com</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">EZ Kiosk Ads</div>
                </div>
              </div>
            </div>
            
            {/* Right side - Controls */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle variant="dropdown" size="md" />
              
              {/* Notifications */}
              <NotificationDropdown />
              
              {/* Mobile User Menu */}
              <div className="lg:hidden relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 capitalize">{user?.role}</p>
                    </div>
                    <Link
                      to="/client/settings"
                      className="block px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        setUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="pt-20 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Global click handler to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}