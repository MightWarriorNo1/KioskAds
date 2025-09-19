import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">EZ Kiosk Ads Privacy Policy</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Effective Date: September 1, 2025</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              EZ Kiosk Ads ("we," "our," or "us") values your privacy and is committed to safeguarding the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and protect your information when you visit our website or use our advertising services.
            </p>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              By using our services, you agree to the terms outlined in this Privacy Policy. If you do not agree, please discontinue use of our services.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">a. Information You Provide</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              When you register an account or create an advertising campaign, we may collect:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>Name</li>
              <li>Email address</li>
              <li>Securely hashed password</li>
              <li>Business name (optional)</li>
              <li>Payment details (processed securely via Stripe; we never store full credit card data)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">b. Information We Collect Automatically</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              We may use cookies and analytics tools (e.g., Google Analytics) to collect:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device type and operating system</li>
              <li>Pages visited and time spent</li>
              <li>Referring websites or links</li>
            </ul>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              This information helps us optimize performance and enhance your user experience.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">We use collected information to:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-1">
              <li>Create and manage user accounts</li>
              <li>Process advertising campaigns and payments</li>
              <li>Communicate service updates, confirmations, and support messages</li>
              <li>Analyze site traffic and performance</li>
              <li>Enforce our Terms of Service and prevent misuse</li>
              <li>Meet applicable legal and regulatory requirements</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Sharing of Information</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">We do not sell or rent your personal information.</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">We only share information in these limited situations:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-6 space-y-1">
              <li><strong>Service Providers</strong> – such as Stripe for secure payment processing or analytics platforms that help us improve services.</li>
              <li><strong>Legal Requirements</strong> – when required by law, subpoena, or valid government request.</li>
              <li><strong>Business Transfers</strong> – if EZ Kiosk Ads is involved in a merger, acquisition, or sale of assets, your information may transfer as part of the business continuity.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Cookies & Tracking</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">We use cookies to:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>Maintain secure login sessions</li>
              <li>Monitor traffic patterns and service usage</li>
              <li>Improve ad campaign tracking and delivery</li>
            </ul>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              You may disable cookies through your browser, but some features may not function properly without them.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Retention</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">We retain your personal data only as long as necessary to:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>Provide services and maintain your account</li>
              <li>Comply with legal or contractual obligations</li>
              <li>Resolve disputes and enforce agreements</li>
            </ul>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              You may request account deletion anytime (see Section 9).
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Security</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              We apply industry-standard security measures, including encryption and access controls, to protect your data. However, no online system is 100% secure. We cannot guarantee absolute protection against unauthorized access.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Your Rights (California Residents)</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">If you are a California resident, you have the right to:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>Know what personal data we collect</li>
              <li>Request deletion of your personal data</li>
              <li>Request a copy of your information</li>
              <li>Opt out of the sale of personal information (note: EZ Kiosk Ads does not sell your data)</li>
            </ul>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              To exercise these rights, contact us at sales@ezkioskads.com. We may request verification before fulfilling your request.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. Children's Privacy</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              EZ Kiosk Ads is intended for users 18 and older. We do not knowingly collect data from children under 13. If we discover such data, we will delete it promptly.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">9. Contact Us</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">For questions or privacy requests, please contact us:</p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-1"><strong>EZ Kiosk Ads – Privacy Team</strong></p>
              <p className="text-sm text-gray-700 dark:text-gray-300">📧 Email: sales@ezkioskads.com</p>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">10. Changes to This Policy</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              We may update this Privacy Policy periodically. If we make significant changes, we will update the "Effective Date" above and notify you by email or site notice.
            </p>
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
