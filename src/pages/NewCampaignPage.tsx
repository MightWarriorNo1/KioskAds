import React from 'react';
import { Users, Settings, Phone, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layouts/DashboardLayout';
import ProgressSteps from '../components/shared/ProgressSteps';

export default function NewCampaignPage() {
  const navigate = useNavigate();
  
  const steps = [
    { number: 1, name: 'Setup Service', current: true },
    { number: 2, name: 'Select Kiosk', current: false },
    { number: 3, name: 'Choose Weeks', current: false },
    { number: 4, name: 'Add Media & Duration', current: false },
    { number: 5, name: 'Review & Submit', current: false }
  ];

  const handleSelfSetup = () => {
    navigate('/client/kiosk-selection');
  };

  return (
    <DashboardLayout
      title="Create New Campaign"
      subtitle=""
      showBreadcrumb={false}
    >
      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4">
        {/* Progress Indicator */}
        <ProgressSteps steps={steps} currentStep={1} />

        {/* Setup Service Section */}
        <div className="mb-6 sm:mb-8 md:mb-12 px-2 sm:px-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-center lg:text-left">Setup Service</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base text-center lg:text-left">Choose how you'd like to set up your campaign.</p>
          
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight">How would you like to proceed?</h3>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">Choose whether you'd like our experts to handle your campaign setup or create it yourself.</p>
          </div>

          {/* Setup Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Full-Service Setup */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Users className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Full-Service Setup</h3>
                  <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-3 py-1 rounded-full font-medium">Recommended</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Let our advertising experts handle everything from strategy to execution.</p>
              </div>
            
              <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 md:mb-8">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Custom strategy development</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Professional content creation</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Campaign optimization</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Ongoing management</span>
                </li>
              </ul>

              <div className="mb-4 sm:mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center lg:text-left">Contact our team:</p>
                <div className="space-y-2 sm:space-y-3">
                  <button className="w-full bg-black dark:bg-gray-900 text-white py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">Call (951) 216-3657</span>
                  </button>
                  <button className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">Email sales@ezkioskads.com</span>
                  </button>
                  <button 
                    onClick={() => navigate('/client/contact')}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    <span>Contact Form</span>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  </button>
                </div>
              </div>
          </div>

            {/* Self-Service Setup */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Settings className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">Self-Service Setup</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Create and manage your campaign using our easy-to-use platform.</p>
              </div>
              
              <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 md:mb-8">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Step-by-step campaign builder</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Real-time availability checker</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Instant campaign preview</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Complete control over your ads</span>
                </li>
              </ul>

              <button 
                onClick={handleSelfSetup}
                className="w-full bg-black dark:bg-gray-900 text-white py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>Continue with Self-Setup</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="text-center px-2 sm:px-4 mt-6 sm:mt-8">
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Not sure which option is right for you?{' '}
            <button 
              onClick={() => navigate('/contact')}
              className="text-gray-900 dark:text-white underline hover:no-underline font-medium break-words"
            >
              Contact us
            </button>
            {' '}for a free consultation.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
