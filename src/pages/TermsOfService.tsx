import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[rgb(var(--surface))] dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link 
            to="/signup" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign Up
          </Link>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">EZKioskAds.com — Terms of Service</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Effective Date: September 1, 2025</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction & Agreement</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              Welcome to EZKioskAds.com ("Platform"). By signing up for, accessing, or using our services, you agree to comply with and be bound by these Terms of Service ("Terms"). If you do not consent to these Terms, you may not use the Platform.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. Platform Services</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              The Platform allows advertisers to run digital campaigns on kiosks that are owned and operated by EZKioskAds.com. Advertisers can design, schedule, and manage content that displays across participating kiosk locations.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Eligibility & Accounts</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li><strong>Minimum Age & Representation:</strong> You must be 18 years or older and acting on behalf of a business or organization.</li>
              <li><strong>Account Setup:</strong> Certain features require registration. You agree to provide accurate and up-to-date information during account creation.</li>
              <li><strong>Security:</strong> You are responsible for maintaining the confidentiality of your login details. Any activity under your account will be treated as your responsibility.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Content Submission & Campaigns</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li><strong>Submission Window:</strong> Campaign materials must be submitted at least three (1) business days before the desired start date.</li>
              <li><strong>Review Process:</strong> EZKioskAds.com reviews all content. We reserve the right to decline ads that do not meet standards, violate law, or conflict with kiosk host requirements.</li>
              <li><strong>Restrictions:</strong> Content must be lawful, family-safe, and comply with any additional rules set by kiosk hosts.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Payment & Billing</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li><strong>Payment Handling:</strong> Payments are securely processed via Stripe. By entering payment information, you authorize charges for the selected services.</li>
              <li><strong>Recurring Subscriptions:</strong> Some advertising packages renew automatically each billing cycle until canceled by the advertiser.</li>
              <li><strong>Refund Policy:</strong> Refunds are only issued if a campaign has not yet launched. Once a campaign has started, all fees are non-refundable.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Intellectual Property</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li><strong>Advertiser Rights:</strong> Advertisers maintain ownership of their submitted creative content.</li>
              <li><strong>License to Display:</strong> By submitting materials, advertisers grant EZKioskAds.com a non-exclusive, royalty-free license to use, reproduce, and display the content for campaign purposes.</li>
              <li><strong>Third-Party Clearances:</strong> Advertisers are solely responsible for ensuring they have the necessary rights and licenses for all submitted materials.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Privacy & Data Usage</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li><strong>Information We Collect:</strong> We may collect advertiser contact details and business information necessary for campaign management and analysis</li>
              <li><strong>Use of Cookies:</strong> Our website uses cookies and analytics tools to improve the advertiser experience.</li>
              <li><strong>No Sale of Data:</strong> We do not sell or trade personal data to third parties. Please see our Privacy Policy for more details.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. Kiosk Operations & Tracking</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li><strong>Ownership:</strong> EZKioskAds.com owns and maintains the kiosk hardware.</li>
              <li><strong>Performance Metrics:</strong> We track ad impressions and related engagement for reporting purposes. No device-level data, location tracking, or personal device information is collected.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">9. Suspension & Termination</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              We reserve the right to suspend or terminate accounts that violate these Terms, attempt to misuse the Platform, or submit prohibited content.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">10. Disclaimers & Limitation of Liability</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li><strong>No Guarantees:</strong> The Platform and services are provided "as is" without warranties of any kind.</li>
              <li><strong>Limitations:</strong> EZKioskAds.com shall not be liable for indirect, incidental, or consequential damages arising from use of the Platform.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">11. Governing Law</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              These Terms will be governed by and interpreted under the laws of the State of California, without reference to conflict-of-law rules. Disputes shall be resolved exclusively in California courts.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">12. Updates to These Terms</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              We may revise these Terms periodically. Updates will be posted on this page with a new effective date. Material changes may be communicated directly to registered advertisers.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">13. Contact Us</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">For questions about these Terms, contact:</p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300">📧 sales@ezkioskads.com</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link 
            to="/signup" 
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
