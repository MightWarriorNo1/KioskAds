import React from 'react';

interface Step {
  number: number;
  name: string;
  current: boolean;
  completed?: boolean;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
}

export default function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <div className="mb-6 sm:mb-8 md:mb-12">
      {/* Mobile Progress - Vertical Stack */}
      <div className="block lg:hidden">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
            steps[currentStep - 1]?.current 
              ? 'bg-black text-white' 
              : steps[currentStep - 1]?.completed
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {steps[currentStep - 1]?.completed ? '✓' : steps[currentStep - 1]?.number}
          </div>
          <span className={`text-base font-semibold ${
            steps[currentStep - 1]?.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {steps[currentStep - 1]?.name}
          </span>
        </div>
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Step {currentStep} of {steps.length}
        </div>
      </div>
      
      {/* Tablet Progress - Compact Horizontal */}
      <div className="hidden lg:block xl:hidden">
        <div className="flex items-center justify-center space-x-2 overflow-x-auto px-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                step.completed 
                  ? 'bg-green-600 text-white' 
                  : step.current 
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step.completed ? '✓' : step.number}
              </div>
              <span className={`ml-2 text-xs font-medium whitespace-nowrap ${
                step.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.name.length > 12 ? step.name.substring(0, 12) + '...' : step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-4 h-1 mx-2 ${
                  step.completed ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Desktop Progress - Full Horizontal */}
      <div className="hidden xl:flex items-center justify-center space-x-6 overflow-x-hidden px-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              step.completed 
                ? 'bg-green-600 text-white' 
                : step.current 
                ? 'bg-black text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {step.completed ? '✓' : step.number}
            </div>
            <span className={`ml-3 text-sm font-medium whitespace-nowrap ${
              step.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {step.name}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-12 h-1 mx-6 ${
                step.completed ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
