import React from 'react';

export interface GridConstraint {
  id: string;
  type: string;
  value: string | number;
  label: string;
  description: string;
  icon: string;
  svgIcon?: string;
}

interface ConstraintHeaderProps {
  constraint: GridConstraint;
  type: 'row' | 'column';
}

export const ConstraintHeader: React.FC<ConstraintHeaderProps> = ({ constraint, type }) => {
  const getBorderStyle = () => {
    if (type === 'row') {
      return 'border-t border-white/20 vertical-wrapper';
    }
    return 'border-l border-white/20';
  };

  // Get CSS classes for type headers using the Pokemon type styles
  const getHeaderClasses = () => {
    if (type === 'row' && constraint.type === 'type') {
      // Use original Pokemon type classes with header variant
      return `icon header ${constraint.value}`;
    }
    // Transparent background for column headers with centered content
    return 'w-full h-full flex flex-col items-center justify-center text-gray-800 text-center p-2';
  };

  // Render content for type vs non-type headers
  const renderContent = () => {
    if (type === 'row' && constraint.type === 'type' && constraint.svgIcon) {
      // For type headers, use the original structure
      return (
        <>
          <img
            src={constraint.svgIcon}
            alt={constraint.label}
            title={constraint.label}
          />
          <div className="absolute bottom-1 left-0 right-0 text-xs font-semibold text-white text-center">
            {constraint.label}
          </div>
        </>
      );
    }
    
    // For non-type headers, use the original structure
    return (
      <>
        {constraint.icon && <div className="text-sm font-bold mb-1">{constraint.icon}</div>}
        <div className="text-xs font-semibold leading-tight whitespace-pre-line">
          {constraint.label}
        </div>
      </>
    );
  };

  return (
    <div className={`aspect-square ${getBorderStyle()} relative`}>
      <div className={getHeaderClasses()}>
        {renderContent()}
      </div>
    </div>
  );
};
