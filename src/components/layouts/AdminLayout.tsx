import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Shield, 
  Users, 
  MapPin, 
  Tag, 
  Settings as SettingsIcon, 
  Menu, 
  LogOut,
  User,
  Target,
  Package,
  Megaphone,
  Plug,
  Archive,
  Folder,
  DollarSign,
  Monitor,
  TrendingUp,
  FileText,
  Building2,
  Upload,
  Clock,
  Share2,
  HelpCircle,
  PlayCircle,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationToast from '../NotificationToast';
import Logo from '../shared/Logo';
import ThemeToggle from '../shared/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { name: 'Ad Review Queue', href: '/admin/review', icon: Shield },
  { name: 'Campaigns', href: '/admin/campaigns', icon: Target},
  { name: 'Host Ad Assignments', href: '/admin/host-ad-assignments', icon: Monitor },
  { name: 'Host Ad Management', href: '/admin/host-ads', icon: Upload },
  { name: 'Creative Orders', href: '/admin/creative-orders', icon: Package },
  { name: 'Custom Ad Management', href: '/admin/custom-ads', icon: FileText },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Kiosk Management', href: '/admin/kiosks', icon: MapPin },
  { name: 'Partners Management', href: '/admin/partners', icon: Building2 },
  { name: 'Kiosk Folders', href: '/admin/kiosk-folders', icon: Folder },
  { name: 'Coupon Manager', href: '/admin/coupons', icon: Tag },
  { name: 'Marketing Tools', href: '/admin/marketing', icon: Megaphone },
  { name: 'Integrations', href: '/admin/integrations', icon: Plug },
  { name: 'Asset Lifecycle', href: '/admin/assets', icon: Archive },
  // { name: 'Asset Scheduler', href: '/admin/asset-scheduler', icon: Clock },
  // { name: 'Campaign & Asset Schedulers', href: '/admin/campaign-asset-schedulers', icon: Clock },
  // { name: 'Asset Archive Tester', href: '/admin/asset-archive-tester', icon: Archive },
  { name: 'Revenue Analytics', href: '/admin/revenue', icon: DollarSign },
  // { name: 'Phone Preview Demo', href: '/admin/phone-preview-demo', icon: Smartphone },
  { name: 'Social Links', href: '/admin/social-links', icon: Share2 },
  { name: 'How It Works', href: '/admin/how-it-works', icon: PlayCircle },
  { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
  { name: 'Subscription Management', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'System Settings', href: '/admin/settings', icon: SettingsIcon },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <NotificationToast />
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
              <Logo 
                size="lg" 
                showText={true} 
                textClassName="text-xl font-bold text-gray-900 dark:text-white" 
                variant="dark"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <ThemeToggle variant="dropdown" size="md" />
              <button
                onClick={() => signOut()}
                className="hidden lg:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
              
              {/* Mobile User Menu */}
              <div className="lg:hidden relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                    <Link
                      to="/admin/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center space-x-3 text-left px-4 py-3 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </button>
                    
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      {/* Sidebar */}
      <div>
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
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-gray-500 dark:text-white/70 group-hover:text-gray-700 dark:group-hover:text-white'
                  }`} />
                  <span className='text-gray-700 dark:text-white'>{item.name}</span>
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
        {/* Header */}
        

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
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