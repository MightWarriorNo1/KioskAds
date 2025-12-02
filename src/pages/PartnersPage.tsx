import React from 'react';
import SiteHeader from '../components/layouts/SiteHeader';
import PartnersSection from '../components/shared/PartnersSection';
import Footer from '../components/shared/Footer';

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-black dark:text-white">
            Our Partners
          </h1>
          <p className="text-xl text-black dark:text-white/90 max-w-3xl mx-auto mb-8">
            Discover our network of trusted partners and their premium kiosk locations across the region
          </p>
        </div>
      </section>

      {/* Partners Section */}
      <PartnersSection className="bg-gray-50 dark:bg-gray-800/50" />

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black dark:text-white">
            Want to become a partner?
          </h2>
          <p className="text-xl text-black dark:text-white/90 mb-8">
            Join our network of premium kiosk locations and start earning revenue from your digital displays.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/hosting" 
              className="btn-primary px-8 py-3"
            >
              Become a Host
            </a>
            <a 
              href="/contact" 
              className="btn-secondary px-8 py-3"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
