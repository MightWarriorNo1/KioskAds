import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQsPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const faqSections = [
    {
      id: 'terms',
      title: 'Terms of Service',
      content: `
        <h3 class="font-semibold mb-3">1. Introduction & Agreement</h3>
        <p class="mb-4">Welcome to EZKioskAds.com ("Platform"). By signing up for, accessing, or using our services, you agree to comply with and be bound by these Terms of Service ("Terms"). If you do not consent to these Terms, you may not use the Platform.</p>
        
        <h3 class="font-semibold mb-3">2. Platform Services</h3>
        <p class="mb-4">The Platform allows advertisers to run digital campaigns on kiosks that are owned and operated by EZKioskAds.com. Advertisers can design, schedule, and manage content that displays across participating kiosk locations.</p>
        
        <h3 class="font-semibold mb-3">3. Eligibility & Accounts</h3>
        <ul class="list-disc list-inside mb-4 space-y-2">
          <li><strong>Minimum Age & Representation:</strong> You must be 18 years or older and acting on behalf of a business or organization.</li>
          <li><strong>Account Setup:</strong> Certain features require registration. You agree to provide accurate and up-to-date information during account creation.</li>
          <li><strong>Security:</strong> You are responsible for maintaining the confidentiality of your login details. Any activity under your account will be treated as your responsibility.</li>
        </ul>
        
        <h3 class="font-semibold mb-3">4. Content Submission & Campaigns</h3>
        <ul class="list-disc list-inside mb-4 space-y-2">
          <li><strong>Submission Window:</strong> Campaign materials must be submitted at least three (1) business days before the desired start date.</li>
          <li><strong>Review Process:</strong> EZKioskAds.com reviews all content. We reserve the right to decline ads that do not meet standards, violate law, or conflict with kiosk host requirements.</li>
          <li><strong>Restrictions:</strong> Content must be lawful, family-safe, and comply with any additional rules set by kiosk hosts.</li>
        </ul>
        
        <h3 class="font-semibold mb-3">5. Payment & Billing</h3>
        <p class="mb-4">All payments are processed securely through Stripe. Campaign costs are calculated based on kiosk location, duration, and number of slots. Payment is required before campaign activation.</p>
      `
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      content: `
        <h3 class="font-semibold mb-3">1. Information We Collect</h3>
        <p class="mb-4">EZ Kiosk Ads ("we," "our," or "us") values your privacy and is committed to safeguarding the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and protect your information when you visit our website or use our advertising services.</p>
        
        <h3 class="font-semibold mb-3">2. Information You Provide</h3>
        <p class="mb-3">When you register an account or create an advertising campaign, we may collect:</p>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>Name</li>
          <li>Email address</li>
          <li>Securely hashed password</li>
          <li>Business name (optional)</li>
          <li>Payment details (processed securely via Stripe; we never store full credit card data)</li>
        </ul>
        
        <h3 class="font-semibold mb-3">3. How We Use Your Information</h3>
        <p class="mb-4">We use your information to provide, maintain, and improve our services, process payments, communicate with you, and comply with legal obligations.</p>
        
        <h3 class="font-semibold mb-3">4. Data Security</h3>
        <p class="mb-4">We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.</p>
        
        <h3 class="font-semibold mb-3">5. Your Rights</h3>
        <p class="mb-4">You have the right to access, update, or delete your personal information at any time through your account settings or by contacting us.</p>
      `
    },
    {
      id: 'cancellation',
      title: 'Ad Cancellation Policy',
      content: `
        <h3 class="font-semibold mb-3">1. Cancellation Requests</h3>
        <p class="mb-4">You may request to cancel your advertising campaign at any time through your dashboard or by contacting our support team. Cancellation requests must be submitted at least 48 hours before the campaign start date to receive a full refund.</p>
        
        <h3 class="font-semibold mb-3">2. Active Campaign Cancellations</h3>
        <p class="mb-4">If you cancel an active campaign, the following applies:</p>
        <ul class="list-disc list-inside mb-4 space-y-2">
          <li><strong>Before Start Date:</strong> Full refund minus processing fees (if applicable)</li>
          <li><strong>After Start Date:</strong> Refund will be prorated based on unused days. Processing fees may apply.</li>
          <li><strong>After 50% Completion:</strong> No refund available, but campaign will be stopped immediately upon request.</li>
        </ul>
        
        <h3 class="font-semibold mb-3">3. Processing Time</h3>
        <p class="mb-4">Cancellation requests are typically processed within 1-2 business days. Refunds, if applicable, will be processed within 5-10 business days to your original payment method.</p>
        
        <h3 class="font-semibold mb-3">4. Campaign Modifications</h3>
        <p class="mb-4">Instead of canceling, you may request to modify your campaign (change dates, content, or kiosks) if the campaign has not yet started. Modification requests are subject to approval and may incur additional fees.</p>
        
        <h3 class="font-semibold mb-3">5. Contact for Cancellations</h3>
        <p class="mb-4">To cancel a campaign, please contact us at support@ezkioskads.com or use the cancellation feature in your dashboard.</p>
      `
    },
    {
      id: 'refund',
      title: 'Refund Policy',
      content: `
        <h3 class="font-semibold mb-3">1. Refund Eligibility</h3>
        <p class="mb-4">Refunds are available under the following circumstances:</p>
        <ul class="list-disc list-inside mb-4 space-y-2">
          <li>Campaign cancellation requested at least 48 hours before start date</li>
          <li>Campaign rejected by our review team</li>
          <li>Technical issues preventing campaign from running as promised</li>
          <li>Kiosk unavailability that we cannot resolve with alternative locations</li>
        </ul>
        
        <h3 class="font-semibold mb-3">2. Refund Amounts</h3>
        <p class="mb-4">Refund amounts are calculated as follows:</p>
        <ul class="list-disc list-inside mb-4 space-y-2">
          <li><strong>Before Campaign Start:</strong> Full refund minus processing fees (typically 2.9% + $0.30)</li>
          <li><strong>After Campaign Start:</strong> Prorated refund based on unused days, minus processing fees</li>
          <li><strong>After 50% Completion:</strong> No refund available</li>
        </ul>
        
        <h3 class="font-semibold mb-3">3. Processing Fees</h3>
        <p class="mb-4">Payment processing fees charged by Stripe (typically 2.9% + $0.30 per transaction) are non-refundable. These fees are deducted from any refund amount.</p>
        
        <h3 class="font-semibold mb-3">4. Refund Processing Time</h3>
        <p class="mb-4">Refunds are typically processed within 5-10 business days after approval. The refund will appear in your original payment method. Processing times may vary depending on your bank or credit card company.</p>
        
        <h3 class="font-semibold mb-3">5. Non-Refundable Items</h3>
        <p class="mb-4">The following are non-refundable:</p>
        <ul class="list-disc list-inside mb-4 space-y-2">
          <li>Payment processing fees</li>
          <li>Custom ad creation services (if work has already begun)</li>
          <li>Campaigns that have completed more than 50% of their duration</li>
          <li>Campaigns canceled due to policy violations</li>
        </ul>
        
        <h3 class="font-semibold mb-3">6. Requesting a Refund</h3>
        <p class="mb-4">To request a refund, please contact our support team at support@ezkioskads.com with your campaign ID and reason for refund. We will review your request and respond within 2-3 business days.</p>
      `
    }
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--surface))] dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Frequently Asked Questions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Find answers to common questions about our services and policies</p>
        </div>

        <div className="space-y-4">
          {faqSections.map((section) => (
            <div
              key={section.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-semibold text-lg text-gray-900 dark:text-white">
                  {section.title}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${
                    expandedSection === section.id ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSection === section.id && (
                <div className="px-6 pb-6">
                  <div
                    className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Still have questions?
          </h3>
          <p className="text-blue-800 dark:text-blue-300 text-sm mb-4">
            If you can't find the answer you're looking for, please don't hesitate to contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:support@ezkioskads.com"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Email Support
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm"
            >
              Contact Form
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

