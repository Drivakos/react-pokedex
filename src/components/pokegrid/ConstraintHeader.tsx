import React from 'react';
import { TYPE_COLORS } from '../../types/pokemon';

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

  // Get CSS classes for headers
  const getHeaderClasses = () => {
    if (constraint.type === 'type') {
      // Use Pokemon type classes for both row and column type constraints
      return `icon header ${constraint.value}`;
    }
    // Standard styling for non-type constraints
    return 'w-full h-full flex flex-col items-center justify-center text-gray-800 text-center p-2';
  };

  // Render content for different constraint types
  const renderContent = () => {
    // For type constraints (Fire, Water, etc.)
    if (constraint.type === 'type' && constraint.svgIcon) {
      // Row constraints (left side) - keep original styling
      if (type === 'row') {
        return (
          <>
            <img
              src={constraint.svgIcon}
              alt={constraint.label}
              title={constraint.description}
            />
            <div className="absolute bottom-0.5 md:bottom-1 left-0 right-0 text-xs font-semibold text-black text-center leading-tight hidden md:block">
              {constraint.label}
            </div>
          </>
        );
      }
      
      // Column constraints (top) - use colored round backgrounds
      const typeColor = TYPE_COLORS[constraint.value as string] || 'bg-gray-400';
      return (
        <>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${typeColor} flex items-center justify-center mx-auto mb-1 shadow-md`}>
            <img
              src={constraint.svgIcon}
              alt={constraint.label}
              title={constraint.description}
              className="w-5 h-5 sm:w-6 sm:h-6 filter brightness-0 invert"
            />
          </div>
          <div className="text-xs font-semibold text-center leading-tight text-white px-1">
            {constraint.label}
          </div>
        </>
      );
    }
    
    // For type effectiveness constraints with SVG icons
    if (constraint.type === 'type-effectiveness' && constraint.svgIcon) {
      // Extract the type from the constraint value (e.g., 'weak-fire' -> 'fire')
      const typeValue = (constraint.value as string).split('-').pop() || '';
      const typeColor = TYPE_COLORS[typeValue] || 'bg-gray-400';
      
      return (
        <>
          <div className="flex items-center justify-center mb-1">
            <span className="text-xs font-bold mr-0.5 sm:mr-1 text-white bg-black/50 px-1 sm:px-1.5 py-0.5 rounded">
              {constraint.icon}
            </span>
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${typeColor} flex items-center justify-center shadow-sm`}>
              <img
                src={constraint.svgIcon}
                alt={constraint.label}
                title={constraint.description}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 filter brightness-0 invert"
              />
            </div>
          </div>
          <div className="text-xs font-semibold text-center leading-tight">
            {constraint.label}
          </div>
        </>
      );
    }
    
    // For all other constraints
    return (
      <>
        <div className="text-sm font-bold mb-1 text-center">
          {constraint.icon || '•'}
        </div>
        <div className="text-xs font-semibold leading-tight text-center whitespace-pre-line">
          {constraint.label}
        </div>
      </>
    );
  };

  return (
    <div className={`${getBorderStyle()} relative`}>
      <div className={getHeaderClasses()}>
        {renderContent()}
      </div>
    </div>
  );
};
