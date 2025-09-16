import React from 'react';

export interface GridConstraint {
  id: string;
  type: string;
  value: string | number;
  label: string;
  description: string;
  icon: string;
}

interface ConstraintHeaderProps {
  constraint: GridConstraint;
  type: 'row' | 'column';
}

export const ConstraintHeader: React.FC<ConstraintHeaderProps> = ({ constraint, type }) => {
  const getHeaderStyle = () => {
    if (type === 'row') {
      return 'bg-gradient-to-br from-green-500 to-green-600';
    }
    return 'bg-gradient-to-br from-blue-500 to-blue-600';
  };

  const getBorderStyle = () => {
    if (type === 'row') {
      return 'border-t border-white/20';
    }
    return 'border-l border-white/20';
  };

  return (
    <div className={`aspect-square ${getBorderStyle()}`}>
      <div className={`w-full h-full flex flex-col items-center justify-center text-white text-center p-2 ${getHeaderStyle()}`}>
        <div className="text-xl mb-1">{constraint.icon}</div>
        <div className="text-xs font-semibold leading-tight whitespace-pre-line">
          {constraint.label}
        </div>
      </div>
    </div>
  );
};
