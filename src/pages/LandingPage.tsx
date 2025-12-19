import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Check, Star ,Aperture, Camera, Videotape} from 'lucide-react';
import SiteHeader from '../components/layouts/SiteHeader';
import MarketingToolsManager from '../components/marketing/MarketingToolsManager';
import MarketingOverlays from '../components/marketing/MarketingOverlays';
import ProudlyPartneredWith from '../components/shared/ProudlyPartneredWith';
import Footer from '../components/shared/Footer';
// import TestNotification from '../components/marketing/TestNotification';

export default function LandingPage() {
  const navigate = useNavigate();

  // Check for password recovery tokens on mount
  useEffect(() => {
    const hash = window.location.hash;
    const hasRecoveryToken = hash.includes('type=recovery') || 
                             (hash.includes('access_token') && hash.includes('type=recovery'));
    
    if (hasRecoveryToken) {
      // Redirect to reset-password page with the hash fragment
      const hashPart = hash.startsWith('#') ? hash : `#${hash}`;
      navigate(`/reset-password${hashPart}`, { replace: true });
    }
  }, [navigate]);
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      {/* Marketing Overlays (Banner, Popup, Sales Notification) */}
      <MarketingOverlays />
      
      {/* Test notification to verify positioning */}
      {/* <TestNotification /> */}
      
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700 dark:bg-gray-800 dark:text-primary-300 mb-4">
                Ad Management Platform
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 sm:mb-6">
                Put your ads on high‑impact digital kiosks
              </h1>
              <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0">
                Reach local customers with our curated network of digital kiosks. Simple setup, transparent pricing, measurable results.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8 justify-center lg:justify-start">
                <Link to="/signin" className="btn-primary px-6 py-3 text-center">Get started</Link>
                <Link to="/custom-ads" className="btn-secondary px-6 py-3 text-center">Custom Ads</Link>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-sm sm:text-base text-gray-600 dark:text-gray-300 justify-center lg:justify-start">
                <div className="flex items-center gap-2"><Star className="w-4 h-4 text-primary-600" /><span>Trusted by local brands</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary-600" /><span>Launch in minutes</span></div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-600" /><span>Prime locations</span></div>
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <img
                src="/7814298c-3468-4ad0-be3c-fec26df8fedf.jpg"
                alt="Digital kiosk showcase"
                className="relative mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-none lg:w-96 lg:h-[28rem] h-80 sm:h-96 md:h-[28rem] rounded-2xl object-cover shadow-elevated border border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>
        </div>
      </section>

{/* Custom Ads Section */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-black dark:text-white">Need Professional Ad Creation?</h2>
          <p className="text-lg sm:text-xl mb-8 max-w-3xl mx-auto text-black dark:text-white/90">
            Our expert team can create stunning vertical ads for you. Choose from graphic design, 
            custom photography, or professional videography services.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <div className="card p-6 sm:p-8 text-center text-black dark:text-white/90 hover:shadow-lg transition-shadow duration-300 relative">
              <div className="relative mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Aperture className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-black dark:text-white">Custom Vertical Ad Design</h3>
              <p className="text-xs sm:text-sm text-black dark:text-white/80 mb-3">Using your assets</p>
              <div className="text-xl sm:text-2xl font-bold text-black dark:text-white">$125</div>
            </div>
            <div className="card p-6 sm:p-8 text-center text-black dark:text-white/90 hover:shadow-lg transition-shadow duration-300 relative">
              <div className="relative mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-black dark:text-white">Custom Vertical Ad - Photography</h3>
              <p className="text-xs sm:text-sm text-black dark:text-white/80 mb-3">Custom photo session</p>
              <div className="text-xl sm:text-2xl font-bold text-black dark:text-white">$199</div>
            </div>
            <div className="card p-6 sm:p-8 text-center text-black dark:text-white/90 hover:shadow-lg transition-shadow duration-300 relative">
              <div className="relative mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Videotape className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-black dark:text-white">Custom Vertical Ad - Videography</h3>
              <p className="text-xs sm:text-sm text-black dark:text-white/80 mb-3">Professional video</p>
              <div className="text-xl sm:text-2xl font-bold text-black dark:text-white">$399</div>
            </div>
          </div>
        </div>
      </section>
    
      
      {/* Proudly Partnered With Section */}
      <ProudlyPartneredWith className="bg-gray-50 dark:bg-gray-800/30" />

      {/* Testimonials Section */}
      <section className="px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <MarketingToolsManager className="max-w-4xl mx-auto" />
        </div>
      </section>

      {/* Pricing Section */}
      {/* <section 
        id="pricing" 
        className={"px-4 sm:px-6 py-16 sm:py-20 transition-all duration-1000"}
      >
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-lg sm:text-xl mb-12 sm:mb-16 max-w-3xl mx-auto text-black dark:text-white/90">
            Pay only for what you need. No hidden fees.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="card p-6 sm:p-8 text-center text-black dark:text-white hover:scale-105 transition-transform duration-300 relative border-2 border-primary-200 dark:border-primary-700">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium">
                Most Popular
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Star className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4">High‑traffic kiosk</h3>
              <div className="text-2xl sm:text-3xl font-extrabold mb-4 sm:mb-6 text-primary-600">$90 per month</div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">Prime locations</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">Maximum visibility</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">High foot traffic</span>
                </div>
              </div>
            </div>
            <div className="card p-6 sm:p-8 text-center text-black dark:text-white/90 hover:scale-105 transition-transform duration-300 relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4">Medium‑traffic kiosk</h3>
              <div className="text-2xl sm:text-3xl font-extrabold mb-4 sm:mb-6 text-primary-600">$50 per month</div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">Good locations</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">Steady visibility</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">Moderate foot traffic</span>
                </div>
              </div>
            </div>
            <div className="card p-6 sm:p-8 text-center text-black dark:text-white/90 hover:scale-105 transition-transform duration-300 relative sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4">Low‑traffic kiosk</h3>
              <div className="text-2xl sm:text-3xl font-extrabold mb-4 sm:mb-6 text-primary-600">$40 per month</div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">Budget‑friendly</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">Targeted visibility</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success-500" />
                  <span className="text-sm sm:text-base">Lower foot traffic</span>
                </div>
              </div>
            </div>
          </div>
          <Link
            to="/signin"
            className="btn-primary px-6 sm:px-8 py-3"
          >
            Get Started
          </Link>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="relative px-4 sm:px-6 py-16 sm:py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white dark:text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-8 h-8 sm:w-12 sm:h-12 bg-white/10 rounded-full animate-pulse delay-500"></div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg">
            <Star className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Ready to reach more customers?</h2>
          <p className="text-lg sm:text-xl text-white/90 mb-6 sm:mb-8 max-w-3xl mx-auto">
            Sign up today and start advertising on our network of digital kiosks.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Link to="/signin" className="btn bg-white text-primary-700 hover:bg-gray-100 px-6 sm:px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 text-center w-full sm:w-auto">
              Get started now
            </Link>
            <Link to="/kiosks" className="btn border-2 border-white text-white hover:bg-white hover:text-primary-700 px-6 sm:px-8 py-3 transition-all duration-300 text-center w-full sm:w-auto">
              View Kiosk Locations
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}