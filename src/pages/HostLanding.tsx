import SiteHeader from '../components/layouts/SiteHeader';

export default function HostLanding() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <SiteHeader />

      {/* Hero */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Host a Digital Kiosk at Your Business
            </h1>
            <p className="mt-4 max-w-xl">
              Partner with us to earn passive revenue, enhance your space, and support local businesses — all at zero cost to you.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#form" className="btn-primary px-5 py-2">Get a Free Kiosk</a>
              <a href="#why" className="btn-secondary px-5 py-2">Learn More</a>
            </div>
          </div>
          <div className="flex justify-center">
            <img
              src="/Kiosk File 2.0.png"
              alt="Kiosk mockup for hosts"
              className="w-72 h-96 rounded-xl object-cover border border-gray-300 dark:border-gray-700 shadow"
            />
          </div>
        </div>
      </section>

      {/* Why Host */}
      <section id="why" className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center">Why Host a Kiosk?</h2>
          <p className="mt-2 text-center">Our digital kiosks offer multiple benefits to your business with zero risk or investment.</p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { t: 'Earn Monthly Revenue', d: 'Get a share of the ad revenue from the kiosk every month with our 15% revenue share program.' },
              { t: 'Free Promotion Space', d: 'Get complimentary ad space on the kiosk in your store, or at one of our other locations.' },
              { t: 'Enhance Your Space', d: 'The modern digital kiosk adds a contemporary visual element to your business environment.' },
              { t: 'Zero Risk Trial', d: 'Try it free for 30 days. If you don\'t love it, we\'ll remove it with no questions asked.' },
              { t: 'Support Local', d: 'Our advertisers are mainly local businesses, just like yours, helping build community connections.' },
              { t: 'Content Control', d: 'You provide criteria to ensure you aren\'t shown competitors, and we filter ads accordingly.' },
            ].map((item) => (
              <div key={item.t} className="card p-5">
                <div className="text-sm font-semibold">{item.t}</div>
                <div className="mt-1 text-sm">{item.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <p className="mt-2">Getting started is simple and hassle-free.</p>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: '1', t: 'We Install', d: 'We deliver and install the kiosk at no cost to you.' },
              { n: '2', t: 'Kiosk Runs Ads', d: 'The kiosk runs targeted digital ads for local brands.' },
              { n: '3', t: 'You Earn Revenue', d: 'You earn 5% of ad revenues and promote your own offers.' },
              { n: '4', t: 'We Support You', d: 'We handle all content, technical support, and compliance.' },
            ].map((s) => (
              <div key={s.n} className="card p-5">
                <div className="mx-auto w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">{s.n}</div>
                <div className="mt-3 text-sm font-semibold">{s.t}</div>
                <div className="mt-1 text-sm">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center">Kiosk Specifications</h2>
          <p className="mt-2 text-center">Our digital kiosks are designed for maximum impact with minimal requirements.</p>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="text-sm font-semibold">Physical Specs</div>
              <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
                <li>55-inch touchscreen display</li>
                <li>6 feet tall by 3 feet wide</li>
                <li>Modern, sleek design</li>
                <li>No construction required</li>
              </ul>
            </div>
            <div className="card p-5">
              <div className="text-sm font-semibold">Technical Requirements</div>
              <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
                <li>Standard power outlet</li>
                <li>Wi‑Fi or internet connection</li>
                <li>Indoor placement</li>
                <li>Accessible location for customers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Perfect For */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold">Perfect For</h2>
          <p className="mt-2">Our kiosks work especially well in these types of businesses.</p>
          <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              'Wineries','Gyms','Bowling Alleys','Family Attractions','Dispensaries','Cafes','Restaurants','Retail Stores','Salons','Event Venues'
            ].map((tag) => (
              <div key={tag} className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">{tag}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="form" className="px-3 sm:px-6 py-12 sm:py-16">
        <div className="max-w-2xl lg:max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center">Ready to Get Started?</h2>
          <p className="mt-2 text-center text-sm sm:text-base max-w-2xl mx-auto">We\'re currently placing kiosks across the area and would love to partner with you. Fill out the form below to get in touch or book a quick 10‑minute call.</p>

          <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Name</label>
              <input className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" placeholder="Your Business Name" />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Name</label>
                <input className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" placeholder="Your Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Type</label>
                <select className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]">
                  <option>Select a business type</option>
                  <option>Retail</option>
                  <option>Restaurant</option>
                  <option>Fitness</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input type="email" className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                <input className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" placeholder="(555) 555-5555" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Address</label>
              <input className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" placeholder="Street, City, State, ZIP" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Information</label>
              <textarea className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none min-h-[120px]" rows={4} placeholder="Tell us more about your location, hours, space, or any questions you have."></textarea>
            </div>
            <div className="flex justify-center sm:justify-end">
              <button type="submit" className="btn-primary px-6 py-3 text-base w-full sm:w-auto">Submit Inquiry</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
