import { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import SiteHeader from '../components/layouts/SiteHeader';
import Footer from '../components/shared/Footer';

interface FAQSection {
  id: string;
  title: string;
  content: string;
}

export default function FAQsPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [faqSections, setFaqSections] = useState<FAQSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('key', 'faqs_content')
        .eq('is_public', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        try {
          // Handle both cases: value might be an object (from JSONB) or a string (legacy)
          let parsed;
          if (typeof data.value === 'string') {
            parsed = JSON.parse(data.value);
          } else {
            parsed = data.value;
          }
          setFaqSections(Array.isArray(parsed) ? parsed : []);
        } catch {
          // If parsing fails, use default
          setFaqSections([]);
        }
      } else {
        // Default FAQs if none exist - empty array, will show empty state
        setFaqSections([]);
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
      // Use empty array on error
      setFaqSections([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <SiteHeader />
      <div className="max-w-4xl mx-auto py-8 px-4">
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
      <Footer />
    </div>
  );
}

