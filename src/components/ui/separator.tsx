import React from 'react';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const Separator: React.FC<SeparatorProps> = ({ 
  className = '', 
  orientation = 'horizontal' 
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const orientationClasses = {
    horizontal: 'h-px w-full',
    vertical: 'w-px h-full'
  };

  return (
    <div 
      className={`${baseClasses} ${orientationClasses[orientation]} ${className}`}
    />
  );
};

export default Separator;

