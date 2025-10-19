import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Megaphone, DollarSign, CreditCard, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationToast from '../NotificationToast';
import Logo from '../shared/Logo';
import ThemeToggle from '../shared/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/designer', icon: BarChart3 },
  { name: 'Orders', href: '/designer/orders', icon: Megaphone },
  { name: 'Revenue', href: '/designer/revenue', icon: DollarSign },
  { name: 'Payouts', href: '/designer/payouts', icon: CreditCard },
];

interface DesignerLayoutProps {
  children: React.ReactNode;
}

export default function DesignerLayout({ children }: DesignerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogoClick = () => navigate('/designer');

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <NotificationToast />
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="hidden lg:flex items-center">
            <button onClick={handleLogoClick} className="flex items-center hover:opacity-80 transition-opacity">
              <Logo size="xl" showText={true} textClassName="text-2xl font-bold text-gray-900 dark:text-white" variant="dark" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
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
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-32 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 shadow-xl border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-gray-500 dark:text-white/70 group-hover:text-gray-700 dark:group-hover:text-white'
                  }`} />
                  <span>{item.name}</span>
                  {isActive && <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>}
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
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}


