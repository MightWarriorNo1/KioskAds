import React, { useState } from 'react';
import { ChevronDown, Mail, Phone, Clock } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { ContactService } from '../services/contactService';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

export default function HelpCenterPage() {
  const [activeTab, setActiveTab] = useState('FAQ');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [contactFormData, setContactFormData] = useState({
    businessName: '',
    contactName: '',
    businessType: '',
    email: '',
    phone: '',
    businessAddress: '',
    additionalInfo: ''
  });
  const [submittingContact, setSubmittingContact] = useState(false);

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
      answer: "Costs are based on kiosk location traffic, campaign duration, and number of kiosks. Low-traffic kiosks cost $40/month, medium-traffic kiosks cost $50/month, and high-traffic kiosks cost $90/month. Higher traffic locations provide better visibility and engagement."
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
        <p className="text-gray-600 dark:text-gray-300 mb-6">We're currently placing kiosks across the area and would love to partner with you. Fill out the form below to get in touch or book a quick 10‑minute call.</p>
        
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          <form className="space-y-4 sm:space-y-6" onSubmit={async (e) => {
            e.preventDefault();
            if (!contactFormData.contactName.trim() || !contactFormData.email.trim()) {
              addNotification('error', 'Missing Information', 'Please provide your name and email.');
              return;
            }
            if (!contactFormData.additionalInfo.trim()) {
              addNotification('error', 'Missing Information', 'Please provide additional information.');
              return;
            }
            setSubmittingContact(true);
            try {
              const message = `Business Name: ${contactFormData.businessName || 'N/A'}\nBusiness Type: ${contactFormData.businessType || 'N/A'}\nPhone: ${contactFormData.phone || 'N/A'}\nBusiness Address: ${contactFormData.businessAddress || 'N/A'}\n\nAdditional Information:\n${contactFormData.additionalInfo.trim()}`;
              
              await ContactService.sendContactFormToAdmins({
                name: contactFormData.contactName.trim(),
                email: contactFormData.email.trim(),
                company: contactFormData.businessName.trim() || undefined,
                budget: undefined,
                interest: contactFormData.businessType.trim() || 'General Inquiry',
                message: message
              });
              addNotification('success', 'Message Sent', 'Your message has been sent. We will get back to you within 24 business hours.');
              setContactFormData({ businessName: '', contactName: '', businessType: '', email: '', phone: '', businessAddress: '', additionalInfo: '' });
            } catch (error) {
              console.error('Contact form submission error:', error);
              addNotification('error', 'Submission Failed', 'Failed to send message. Please try again later.');
            } finally {
              setSubmittingContact(false);
            }
          }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Name</label>
              <input 
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" 
                placeholder="Your Business Name"
                value={contactFormData.businessName}
                onChange={(e) => setContactFormData({ ...contactFormData, businessName: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Name</label>
                <input 
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" 
                  placeholder="Your Name"
                  value={contactFormData.contactName}
                  onChange={(e) => setContactFormData({ ...contactFormData, contactName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Type</label>
                <select 
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]"
                  value={contactFormData.businessType}
                  onChange={(e) => setContactFormData({ ...contactFormData, businessType: e.target.value })}
                >
                  <option value="">Select a business type</option>
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
                <input 
                  type="email" 
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" 
                  placeholder="you@example.com"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                <input 
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" 
                  placeholder="(555) 555-5555"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Address</label>
              <input 
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]" 
                placeholder="Street, City, State, ZIP"
                value={contactFormData.businessAddress}
                onChange={(e) => setContactFormData({ ...contactFormData, businessAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Information</label>
              <textarea 
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none min-h-[120px]" 
                rows={4} 
                placeholder="Tell us more about your location, hours, space, or any questions you have."
                value={contactFormData.additionalInfo}
                onChange={(e) => setContactFormData({ ...contactFormData, additionalInfo: e.target.value })}
                required
              ></textarea>
            </div>
            <div className="flex justify-center sm:justify-end">
              <button 
                type="submit" 
                disabled={submittingContact}
                className="btn-primary px-6 py-3 text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingContact ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </div>
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
