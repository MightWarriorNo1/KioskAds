import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../shared/Logo';
import ThemeToggle from '../shared/ThemeToggle';   

export default function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handlePartnersClick=(e:React.MouseEvent<HTMLAnchorElement>)=>{
    e.preventDefault();
    if(location.pathname==='/'){
      const partnerSection=document.getElementById('partners');
      if(partnerSection){
        window.history.pushState(null, '', '/#partners');
        partnerSection.scrollIntoView({ behavior: 'smooth' });
      }
    }else{
      navigate('/#partners');
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/60 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo 
              size="xl" 
              showText={true} 
              textClassName="text-3xl tracking-tight" 
              // variant="dark"
            />
          </Link>
        </div>
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
          <a 
            href="/#partners" 
            onClick={handlePartnersClick}
            className={`transition-colors ${
              location.pathname === '/' && location.hash === '#partners'
                ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            Our Partners
          </a>
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
        <div className="flex items-center gap-3">
          <ThemeToggle variant="dropdown" size="md" />
          <button onClick={handleDashboardClick} className="btn-primary">{user ? 'Dashboard' : 'Login'}</button>
        </div>
      </nav>
    </header>
  );
}


