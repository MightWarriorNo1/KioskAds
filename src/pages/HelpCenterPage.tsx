import React, { useState } from 'react';
import { ChevronDown, Mail, Phone, Clock } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';

export default function HelpCenterPage() {
  const [activeTab, setActiveTab] = useState('FAQ');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      id: 1,
      question: "How do I create a new advertising campaign?",
      answer: "To create a new campaign, navigate to the 'New Campaign' section in your dashboard. Follow the step-by-step process to select kiosks, set duration, and upload your media content."
    },
    {
      id: 2,
      question: "What file formats are accepted for advertisements?",
      answer: "We accept high-quality image formats (JPG, PNG) and video formats (MP4, MOV) with resolutions up to 4K. Files should be optimized for digital display."
    },
    {
      id: 3,
      question: "How are advertising costs calculated?",
      answer: "Costs are based on kiosk location traffic, campaign duration, and number of kiosks. Low-traffic kiosks cost $40/week, medium-traffic kiosks cost $50/week, and high-traffic kiosks cost $90/week. Higher traffic locations provide better visibility and engagement."
    },
    {
      id: 4,
      question: "Can I edit my campaign after it has been submitted?",
      answer: "Yes, you can edit campaigns that are in 'Draft' status. Once submitted and approved, changes may require re-approval from our team."
    },
    {
      id: 5,
      question: "How do I view analytics for my campaigns?",
      answer: "Access the 'Analytics' section in your dashboard to view real-time performance metrics, engagement rates, and audience demographics for all your campaigns."
    },
    {
      id: 6,
      question: "What are content limitations?",
      answer: "Content must be family-friendly, comply with local advertising regulations, and not contain offensive or inappropriate material. Our team reviews all submissions."
    },
    {
      id: 7,
      question: "How do I get help with technical issues?",
      answer: "For technical support, contact our team via email at support@ezkioskads.com or call us at (951) 216-3657 during business hours."
    }
  ];

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const renderFAQ = () => (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-8">Find answers to the most common questions about our platform and services.</p>
      
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.id} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <button
              onClick={() => toggleFaq(faq.id)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
              <ChevronDown 
                className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${
                  expandedFaq === faq.id ? 'rotate-180' : ''
                }`} 
              />
            </button>
            {expandedFaq === faq.id && (
              <div className="px-6 pb-4">
                <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderContactUs = () => (
    <div>
      {/* Contact Information */}
      <div className="mb-12">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-8">Find different ways to get in touch with our support team.</p>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Email</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-2">For general inquiries and support</p>
            <p className="text-gray-900 dark:text-white font-medium">sales@ezkioskads.com</p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Phone className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Phone</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-2">Monday to Friday, 9am to 5pm PT</p>
            <p className="text-gray-900 dark:text-white font-medium">(951) 216-3657</p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Business Hours</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-2">Response within 24 business hours</p>
            <p className="text-gray-900 dark:text-white font-medium">9:00 AM - 5:00 PM PT</p>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Form</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Send us a message and we'll get back to you within 24 business hours.</p>
        
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          <form className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="How can we help you?"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Please provide details about your request..."
                required
              ></textarea>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Please be as specific as possible to help us address your request efficiently.
              </p>
            </div>

            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="Help Center"
      subtitle="Find answers to common questions or contact our support team for assistance."
    >
      {/* Tabs */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('FAQ')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'FAQ'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('Contact Us')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'Contact Us'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Contact Us
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'FAQ' && renderFAQ()}
        {activeTab === 'Contact Us' && renderContactUs()}
      </div>
    </DashboardLayout>
  );
}
