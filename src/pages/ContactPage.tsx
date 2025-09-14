import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SiteHeader from '../components/layouts/SiteHeader';
import { useAuth } from '../contexts/AuthContext';

export default function ContactPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleViewKiosksClick = () => {
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
      // User is not authenticated, redirect to kiosks page
      navigate('/kiosks');
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Let's Start Your Advertising Journey</h1>
          <p className="mt-2 text-sm">Reach out to our team to discuss how our kiosk advertising platform can help your business reach new customers.</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup" className="btn-secondary text-sm">Get in Touch</Link>
          <button onClick={handleViewKiosksClick} className="btn-secondary text-sm">View Available Kiosks</button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">Email Us</div>
            <div className="mt-1 text-sm font-medium">For sales inquiries</div>
            <div className="text-sm">sales@ezkioskads.com</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">Call Us</div>
            <div className="mt-1 text-sm font-medium">Customer support</div>
            <div className="text-sm">(951) 216-3657</div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <section>
            <h2 className="text-lg font-semibold">Ready to Transform Your Advertising?</h2>
            <p className="mt-2 text-sm">Our team of advertising experts is ready to help you leverage our network of premium kiosk locations to reach your target audience effectively.</p>

            <div className="mt-6">
              <h3 className="text-sm font-semibold">Why Choose Our Platform?</h3>
              <ul className="mt-2 space-y-2 text-sm list-disc pl-5">
                <li>Premium kiosk locations in high-traffic areas</li>
                <li>Detailed analytics and audience metrics</li>
                <li>Flexible campaign scheduling</li>
                <li>Real-time performance tracking</li>
                <li>Content customization options</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold">Our Clients</h3>
              <p className="mt-2 text-sm">Trusted by local businesses, national brands, and agencies looking to maximize their advertising impact and reach targeted audiences.</p>
            </div>
          </section>

          <aside>
            <div className="card p-5">
              <h3 className="text-base font-semibold">Get in Touch</h3>
              <form className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Name</label>
                    <input className="input text-sm" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Email</label>
                    <input type="email" className="input text-sm" placeholder="your.email@company.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Company (optional)</label>
                    <input className="input text-sm" placeholder="Your company name" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly Advertising Budget</label>
                    <select className="input text-sm">
                      <option>Under $500/month</option>
                      <option>$500 - $2,500/month</option>
                      <option>$2,500 - $10,000/month</option>
                      <option>$10,000+/month</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">What are you interested in?</label>
                  <select className="input text-sm">
                    <option>General Inquiry</option>
                    <option>Campaign Planning</option>
                    <option>Partnership</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Message</label>
                  <textarea rows={4} className="input text-sm" placeholder="Tell us about your advertising needs and goals."></textarea>
                </div>

                <button type="button" className="btn-primary w-full py-2 text-sm">Submit Inquiry</button>
              </form>
            </div>
          </aside>
        </div>

        <section className="mt-16">
          <h2 className="text-center text-lg font-semibold">Frequently Asked Questions</h2>
          <div className="mt-6 max-w-3xl mx-auto divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
            {[
              'What makes your kiosk advertising platform unique?',
              'How quickly can my ad campaign be up and running?',
              'What types of businesses see the best results with kiosk advertising?',
              'Can I target specific demographics with my kiosk campaigns?',
              'What ad formats do you support?',
              'How is pricing determined for kiosk advertising?',
              'What analytics and reporting will I receive?',
            ].map((q) => (
              <details key={q} className="group px-4">
                <summary className="cursor-pointer select-none py-3 text-sm group-open:font-medium">{q}</summary>
                <div className="pb-3 text-sm">We provide detailed analytics, flexible scheduling, and premium locations to maximize your results.</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="max-w-5xl mx-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-8 text-center">
            <h3 className="text-lg font-semibold">Ready to Get Started?</h3>
            <p className="mt-2 text-sm">Create an account today and start exploring our platform. Browse available kiosks, plan your campaigns, and transform your advertising strategy.</p>
            <Link to="/signup" className="btn-secondary inline-flex mt-4 text-sm">Create an Account</Link>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-500 dark:text-gray-400">© 2025 EZ Kiosk Ads. All rights reserved.</footer>
    </div>
  );
}


