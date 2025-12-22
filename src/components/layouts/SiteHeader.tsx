import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../shared/Logo';
import ThemeToggle from '../shared/ThemeToggle';
import { Menu, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';   

export default function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [partnersLinkVisible, setPartnersLinkVisible] = useState(true);
  const [kiosksLinkVisible, setKiosksLinkVisible] = useState(true);

  // Load navigation visibility settings
  useEffect(() => {
    const loadNavigationSettings = async () => {
      try {
        // Load partners link visibility (must be public due to RLS)
        const { data: partnersData, error: partnersError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'partners_link_visible')
          .eq('is_public', true)
          .single();

        if (partnersError && partnersError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error loading partners link setting:', partnersError);
        } else if (partnersData) {
          setPartnersLinkVisible(partnersData.value);
        }

        // Load kiosks link visibility (must be public due to RLS)
        const { data: kiosksData, error: kiosksError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'kiosks_link_visible')
          .eq('is_public', true)
          .single();

        if (kiosksError) {
          if (kiosksError.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error loading kiosks link setting:', kiosksError);
          }
          // If not found, default to true (show the link)
        } else if (kiosksData !== null && kiosksData !== undefined) {
          // Handle JSONB boolean values - ensure we get the actual boolean
          let value = kiosksData.value;
          
          // If value is a string that looks like JSON, try to parse it
          if (typeof value === 'string' && (value.startsWith('"') || value === 'true' || value === 'false')) {
            try {
              value = JSON.parse(value);
            } catch {
              // If parsing fails, keep the original value
            }
          }
          
          // Explicitly check for false - be very strict about this
          // Only set to false if the value is explicitly false
          if (value === false) {
            setKiosksLinkVisible(false);
          } else {
            // For any other value (true, null, undefined, "true", etc.), show the link
            setKiosksLinkVisible(true);
          }
        }
      } catch (error) {
        console.error('Error loading navigation settings:', error);
      }
    };

    loadNavigationSettings();
  }, []);

  // Handle hash changes for pricing section
  useEffect(() => {
    if (location.pathname === '/' && location.hash === '#pricing') {
      // Small delay to ensure the page is fully loaded
      setTimeout(() => {
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  // Listen for hash changes (when using browser back/forward or direct URL)
  useEffect(() => {
    const handleHashChange = () => {
      if (location.pathname === '/' && window.location.hash === '#pricing') {
        setTimeout(() => {
          const pricingSection = document.getElementById('pricing');
          if (pricingSection) {
            pricingSection.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') {
      // Home should only be active if we're on homepage AND not on pricing section
      return location.pathname === '/' && location.hash !== '#pricing';
    }
    return location.pathname.startsWith(path);
  };

  const handleDashboardClick = () => {
    if (user) {
      // User is authenticated, redirect to their appropriate dashboard
      const role = user.role;
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'host') {
        navigate('/host');
      } else {
        navigate('/client');
      }
    } else {
      // User is not authenticated, redirect to sign in
      navigate('/signin');
    }
  };

  const handlePricingClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // If we're on the homepage, scroll to pricing section and update URL
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        // Update the URL hash first
        window.history.pushState(null, '', '/#pricing');
        // Then scroll to the section
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If we're on a different page, navigate to homepage with hash
      navigate('/#pricing');
    }
  };


  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/60 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo 
              size="xl" 
              showText={true} 
              textClassName="text-2xl sm:text-3xl tracking-tight" 
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className={`transition-colors ${
              isActive('/') 
                ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            Home
          </Link>
          {kiosksLinkVisible && (
            <Link 
              to="/kiosks" 
              className={`transition-colors ${
                isActive('/kiosks') 
                  ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              Kiosks
            </Link>
          )}
          <a 
            href="/#pricing" 
            onClick={handlePricingClick}
            className={`transition-colors ${
              location.pathname === '/' && location.hash === '#pricing'
                ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            Pricing
          </a>
          {partnersLinkVisible && (
            <Link 
              to="/partners" 
              className={`transition-colors ${
                isActive('/partners') 
                  ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              Our Partners
            </Link>
          )}
          <Link 
            to="/how-it-works" 
            className={`transition-colors ${
              isActive('/how-it-works') 
                ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            How It Works
          </Link>
          <Link 
            to="/faqs" 
            className={`transition-colors ${
              isActive('/faqs') 
                ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            FAQs
          </Link>
          <Link 
            to="/contact" 
            className={`transition-colors ${
              isActive('/contact') 
                ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            Contact
          </Link>
          <Link 
            to="/hosting" 
            className={`transition-colors ${
              isActive('/hosting') 
                ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            Host
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle variant="dropdown" size="md" />
          <button onClick={handleDashboardClick} className="btn-primary">{user ? 'Dashboard' : 'Login'}</button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle variant="dropdown" size="sm" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-4 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive('/') 
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
              }`}
            >
              Home
            </Link>
            {kiosksLinkVisible && (
              <Link 
                to="/kiosks" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/kiosks') 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                }`}
              >
                Kiosks
              </Link>
            )}
            <a 
              href="/#pricing" 
              onClick={(e) => {
                handlePricingClick(e);
                setMobileMenuOpen(false);
              }}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                location.pathname === '/' && location.hash === '#pricing'
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
              }`}
            >
              Pricing
            </a>
            {partnersLinkVisible && (
              <Link 
                to="/partners" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/partners') 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                }`}
              >
                Our Partners
              </Link>
            )}
            <Link 
              to="/how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive('/how-it-works') 
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
              }`}
            >
              How It Works
            </Link>
            <Link 
              to="/faqs" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive('/faqs') 
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
              }`}
            >
              FAQs
            </Link>
            <Link 
              to="/contact" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive('/contact') 
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
              }`}
            >
              Contact
            </Link>
            <Link 
              to="/hosting" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive('/hosting') 
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
              }`}
            >
              Host
            </Link>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => {
                  handleDashboardClick();
                  setMobileMenuOpen(false);
                }} 
                className="w-full btn-primary text-center"
              >
                {user ? 'Dashboard' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


