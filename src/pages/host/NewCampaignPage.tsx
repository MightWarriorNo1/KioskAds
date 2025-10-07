import { Palette, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProgressSteps from '../../components/shared/ProgressSteps';

export default function HostNewCampaignPage() {
  const navigate = useNavigate();

  const steps = [
    { number: 1, name: 'Choose Ad Type', current: true },
    { number: 2, name: 'Select Kiosk', current: false },
    { number: 3, name: 'Choose Weeks', current: false },
    { number: 4, name: 'Add Media & Duration', current: false },
    { number: 5, name: 'Review & Submit', current: false }
  ];

  const handleCreateCustomAd = () => {
    navigate('/host/custom-ads');
  };

  const handleUploadAd = () => {
    navigate('/host/kiosk-selection');
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Create New Campaign
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Choose how you'd like to create your vertical ad campaign
        </p>
      </div>

      {/* Progress Indicator */}
      <ProgressSteps steps={steps} currentStep={1} />

        {/* Vertical Ad Options Section */}
        <div className="mb-6 sm:mb-8 md:mb-12 px-2 sm:px-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-center lg:text-left">Create Vertical Ad</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base text-center lg:text-left">Choose how you'd like to create your vertical ad campaign.</p>
          
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight">How would you like to proceed?</h3>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">Choose whether you'd like our team to design your ad or upload your own.</p>
          </div>

          {/* Vertical Ad Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Create Custom Vertical Ad */}
            <div className="bg-gray-900 dark:bg-gray-800 rounded-xl p-6 sm:p-8 md:p-10 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Palette className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-gray-900" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">Create Custom Vertical Ad</h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">Let our team design and manage your ad from start to finish.</p>
              </div>
            
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-white text-sm sm:text-base">Tailored ad strategy</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-white text-sm sm:text-base">Eye-catching custom design</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-white text-sm sm:text-base">Optimized for maximum impact</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-white text-sm sm:text-base">Expert setup & ongoing support</span>
                </li>
              </ul>

              <button 
                onClick={handleCreateCustomAd}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-4 sm:py-5 rounded-lg font-bold text-sm sm:text-base uppercase transition-colors flex items-center justify-center"
              >
                CLICK HERE TO Create Custom Ad
              </button>
            </div>

            {/* Upload Your Own Vertical Ad */}
            <div className="bg-gray-900 dark:bg-gray-800 rounded-xl p-6 sm:p-8 md:p-10 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Upload className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-gray-900" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">Upload Your Own Vertical Ad</h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">Have an ad ready? Upload it and start running today.</p>
              </div>
              
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-white text-sm sm:text-base">Simple upload process</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-white text-sm sm:text-base">Check kiosk availability instantly</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-white text-sm sm:text-base">Preview ads before launch</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-white text-sm sm:text-base">Full control over your schedule</span>
                </li>
              </ul>

              <button 
                onClick={handleUploadAd}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 sm:py-5 rounded-lg font-bold text-sm sm:text-base uppercase transition-colors flex items-center justify-center"
              >
                CLICK HERE TO UPLOAD AD →
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
  );
}