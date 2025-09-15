import { Link } from 'react-router-dom';
import { MapPin, Clock, Upload, Check, Star ,Aperture, Camera, Videotape} from 'lucide-react';
import SiteHeader from '../components/layouts/SiteHeader';

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-md font-medium bg-primary-100 text-primary-700 dark:bg-gray-800 dark:text-primary-300 mb-4">
              Ad Management Platform
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Put your ads on high‑impact digital kiosks
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-2xl">
              Reach local customers with our curated network of digital kiosks. Simple setup, transparent pricing, measurable results.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/signin" className="btn-primary px-6 py-3">Get started</Link>
              <Link to="/custom-ads" className="btn-secondary px-6 py-3">Custom Ads</Link>
              <Link to="/kiosks" className="btn-secondary px-6 py-3">Learn more</Link>
            </div>
            <div className="flex items-center gap-6 text-md text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2"><Star className="w-4 h-4 text-primary-600" /><span>Trusted by local brands</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary-600" /><span>Launch in minutes</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-600" /><span>Prime locations</span></div>
            </div>
          </div>
          <div className="relative">
            <div className="relative mx-auto w-80 h-96 md:w-96 md:h-[28rem] rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-elevated overflow-hidden border border-slate-700">
              {/* Kiosk Frame */}
              <div className="absolute inset-4 rounded-xl bg-black border-2 border-slate-600 overflow-hidden">
                {/* Sample Ad Display */}
                <div className="h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">Your Brand Here</h3>
                  <p className="text-sm text-white/90 mb-4">Reach customers at prime locations</p>
                  <div className="bg-white/20 px-4 py-2 rounded-full text-xs font-medium">
                    EZ Kiosk Ads
                  </div>
                </div>
              </div>
              
              {/* Kiosk Stand */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-slate-700 rounded-b-lg"></div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-40 h-4 bg-slate-600 rounded-lg"></div>
              
              {/* Floating Elements */}
              <div className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div className="absolute bottom-16 left-4 text-xs text-slate-400 font-mono">
                LIVE
              </div>
            </div>
          </div>
        </div>
      </section>

{/* How It Works Section */}
<section className="px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-xl mb-16 max-w-3xl mx-auto  text-black dark:text-white/90">
            Get your ads in front of customers in just a few simple steps.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-8 text-center text-black dark:text-white/90 hover:shadow-lg transition-shadow duration-300 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center mx-auto mb-6 shadow-lg">
                <MapPin className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Select locations</h3>
              <p>Choose from our network of kiosks in high‑traffic areas.</p>
            </div>
            <div className="card p-8 text-center text-black dark:text-white/90 hover:shadow-lg transition-shadow duration-300 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Clock className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Set duration</h3>
              <p>Choose your ad slot duration and campaign length.</p>
            </div>
            <div className="card p-8 text-center text-black dark:text-white/90 hover:shadow-lg transition-shadow duration-300 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Upload className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pay & upload</h3>
              <p>Upload your ad content and pay securely online.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Ads Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black dark:text-white">Need Professional Ad Creation?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto  text-black dark:text-white/90">
            Our expert team can create stunning vertical ads for you. Choose from graphic design, 
            custom photography, or professional videography services.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Aperture className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Graphic DesignAd</h3>
              <p className="text-sm text-black dark:text-white/80 mb-3">Using your assets</p>
              <div className="text-2xl font-bold text-black dark:text-white">$125</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">PhotographyAd</h3>
              <p className="text-sm text-black dark:text-white/80 mb-3">Custom photo session</p>
              <div className="text-2xl font-bold text-black dark:text-white">$199</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Videotape className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">VideographyAd</h3>
              <p className="text-sm text-black dark:text-white/80 mb-3">Professional video</p>
              <div className="text-2xl font-bold text-black dark:text-white">$399</div>
            </div>
          </div>
          <Link to="/custom-ads" className="btn-primary px-8 py-3">
            Get Custom Ads
          </Link>
        </div>
      </section>

      

      {/* Pricing Section */}
      <section 
        id="pricing" 
        className={"px-6 py-20 transition-all duration-1000"}
      >
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-xl mb-16 max-w-3xl mx-auto  text-black dark:text-white/90">
            Pay only for what you need. No hidden fees.
          </p>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="card p-8 text-center text-black dark:text-white hover:scale-105 transition-transform duration-300 relative border-2 border-primary-200 dark:border-primary-700">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">High‑traffic kiosk</h3>
              <div className="text-3xl font-extrabold mb-6 text-primary-600">$90 per week</div>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>Prime locations</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>Maximum visibility</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>High foot traffic</span>
                </div>
              </div>
            </div>
            <div className="card p-8 text-center text-black dark:text-white/90 hover:scale-105 transition-transform duration-300 relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Medium‑traffic kiosk</h3>
              <div className="text-3xl font-extrabold mb-6 text-primary-600">$50 per week</div>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>Good locations</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>Steady visibility</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>Moderate foot traffic</span>
                </div>
              </div>
            </div>
            <div className="card p-8 text-center text-black dark:text-white/90 hover:scale-105 transition-transform duration-300 relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Low‑traffic kiosk</h3>
              <div className="text-3xl font-extrabold mb-6 text-primary-600">$40 per week</div>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>Budget‑friendly</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>Targeted visibility</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="h-5 w-5 text-success-500" />
                  <span>Lower foot traffic</span>
                </div>
              </div>
            </div>
          </div>
          <Link
            to="/signin"
            className="btn-primary px-8 py-3"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white dark:text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-16 h-16 bg-white/5 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-pulse delay-500"></div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Star className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to reach more customers?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Sign up today and start advertising on our network of digital kiosks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signin" className="btn bg-white text-primary-700 hover:bg-gray-100 px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
              Get started now
            </Link>
            <Link to="/kiosks" className="btn border-2 border-white text-white hover:bg-white hover:text-primary-700 px-8 py-3 transition-all duration-300">
              View Kiosk Locations
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 EZ Kiosk Ads. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/contact" className="hover:underline">Contact</Link>
            <Link to="/#pricing" className="hover:underline">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}