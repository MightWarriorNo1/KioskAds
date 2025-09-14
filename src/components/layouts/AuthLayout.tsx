import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../shared/Logo';
import ThemeToggle from '../shared/ThemeToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title = 'Welcome to EZ Kiosk Ads', subtitle = 'Access your dashboard to manage your advertising campaigns across our network of digital kiosks.' }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <div className="min-h-screen relative isolate overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-600/30 blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-600/20 blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-600/10 blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <header className="relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-slate-700/50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center space-x-2 text-gray-900 dark:text-white hover:scale-105 transition-transform duration-200">
              <Logo 
                size="xl" 
                showText={true} 
                textClassName="text-xl font-semibold" 
                variant="dark"
              />
            </Link>
            <div className="flex items-center space-x-4">
              <ThemeToggle variant="dropdown" size="md" />
            </div>
          </div>
        </header>

        <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl animate-fadeInUp order-2 lg:order-1">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></span>
                Digital Advertising Platform
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent leading-tight">
                {title}
              </h1>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">{subtitle}</p>

              <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Feature 
                  icon={
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg">
                      🏙
                    </div>
                  } 
                  title="Prime Locations" 
                  text="Access high-traffic areas with maximum visibility" 
                />
                <Feature 
                  icon={
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-lg">
                      🖥
                    </div>
                  } 
                  title="HD Displays" 
                  text="Beautiful, high-resolution screens to showcase your content" 
                />
                <Feature 
                  icon={
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-lg">
                      📈
                    </div>
                  } 
                  title="Real-time Analytics" 
                  text="Track campaign performance and audience engagement" 
                />
                <Feature 
                  icon={
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-lg">
                      ⚙️
                    </div>
                  } 
                  title="Easy Management" 
                  text="Simple tools to update and control your advertising" 
                />
              </div>
            </div>

            <div className="w-full max-w-md mx-auto lg:ml-auto animate-fadeInUp order-1 lg:order-2" style={{animationDelay: '0.2s'}}>
              <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl ring-1 ring-gray-200/50 dark:ring-slate-700/50 p-8 hover:shadow-3xl transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-slate-800/50 rounded-2xl pointer-events-none"></div>
                
                {/* Floating theme toggle for mobile */}
                <div className="absolute top-4 right-4 lg:hidden">
                  <ThemeToggle size="sm" />
                </div>
                
                <div className="relative">
                {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="group flex items-start space-x-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-6 py-5 ring-1 ring-gray-200/50 dark:ring-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 hover:scale-105 hover:shadow-lg">
      <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">{title}</div>
        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{text}</div>
      </div>
    </div>
  );
}


