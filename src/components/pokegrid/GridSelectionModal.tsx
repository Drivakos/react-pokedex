import React from 'react';
import { WeeklyStats } from './WeeklyStats';

interface GridSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGridDate: Date;
  onDateSelect: (date: Date) => void;
}

export const GridSelectionModal: React.FC<GridSelectionModalProps> = ({
  isOpen,
  onClose,
  currentGridDate,
  onDateSelect,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Select Grid</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Choose a grid to play from the last 7 days
            </p>
          </div>

          {/* Content */}
          <div className="p-4">
            <WeeklyStats
              currentGridDate={currentGridDate}
              onDateSelect={(date) => {
                onDateSelect(date);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
