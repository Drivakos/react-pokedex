import React, { useState } from 'react';
import { RefreshCw, X, SlidersHorizontal } from 'lucide-react';
import { FilterTabs } from './filters/FilterTabs';
import { TypesFilter } from './filters/TypesFilter';
import { MovesFilter } from './filters/MovesFilter';
import { OtherFilters } from './filters/OtherFilters';
import { Filters } from '../types/pokemon';

interface FilterManagerProps {
  showDesktopFilters: boolean;
  showMobileFilters: boolean;
  setShowMobileFilters: (show: boolean) => void;
  filters: Filters;
  handleFilterChange: (filters: Filters) => void;
  availableTypes: string[];
  availableMoves: string[];
  availableGenerations: string[];
  totalFiltersCount: number;
  resetFilters: () => void;
}

export const FilterManager: React.FC<FilterManagerProps> = ({
  showDesktopFilters,
  showMobileFilters,
  setShowMobileFilters,
  filters,
  handleFilterChange,
  availableTypes,
  availableMoves,
  availableGenerations,
  totalFiltersCount,
  resetFilters,
}) => {
  const [activeFilterTab, setActiveFilterTab] = useState<'types' | 'moves' | 'other'>('types');
  const [moveSearch, setMoveSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');

  const renderFilterContent = () => {
    switch (activeFilterTab) {
      case 'types':
        return (
          <TypesFilter
            availableTypes={availableTypes}
            selectedTypes={filters.types}
            searchTerm={typeSearch}
            onSearchChange={setTypeSearch}
            onTypeToggle={(type: string) => {
              const newTypes = filters.types.includes(type)
                ? filters.types.filter(t => t !== type)
                : [...filters.types, type];
              handleFilterChange({ ...filters, types: newTypes });
            }}
          />
        );
      case 'moves':
        return (
          <MovesFilter
            availableMoves={availableMoves}
            selectedMoves={filters.moves}
            searchTerm={moveSearch}
            onSearchChange={setMoveSearch}
            onMoveToggle={(move: string) => {
              const newMoves = filters.moves.includes(move)
                ? filters.moves.filter(m => m !== move)
                : [...filters.moves, move];
              handleFilterChange({ ...filters, moves: newMoves });
            }}
          />
        );
      case 'other':
        return (
          <OtherFilters
            filters={filters}
            availableGenerations={availableGenerations}
            onGenerationChange={(generation: string) => handleFilterChange({ ...filters, generation })}
            onWeightChange={(min: number | null, max: number | null) => handleFilterChange({
              ...filters,
              weight: {
                min: min ? min * 10 : 0,
                max: max ? max * 10 : 1000
              }
            })}
            onHeightChange={(min: number | null, max: number | null) => handleFilterChange({
              ...filters,
              height: {
                min: min ? min * 10 : 0,
                max: max ? max * 10 : 100
              }
            })}
          />
        );
    }
  };

  return (
    <>
      {/* Desktop Filters */}
      {showDesktopFilters && (
        <div className="hidden md:block w-full">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Filters</h2>
              {totalFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <FilterTabs
              activeTab={activeFilterTab}
              setActiveTab={(tab) => setActiveFilterTab(tab as any)}
              typeCount={filters.types.length}
              moveCount={filters.moves.length}
              otherCount={totalFiltersCount - filters.types.length - filters.moves.length}
            />

            <div className="mt-4">
              {renderFilterContent()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Panel */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300 ${showMobileFilters ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowMobileFilters(false)}></div>

      <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-lg z-50 md:hidden transform transition-transform duration-300 ease-in-out ${showMobileFilters ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <FilterTabs
              activeTab={activeFilterTab}
              setActiveTab={(tab) => setActiveFilterTab(tab as any)}
              typeCount={filters.types.length}
              moveCount={filters.moves.length}
              otherCount={totalFiltersCount - filters.types.length - filters.moves.length}
            />

            <div className="mt-4">
              {renderFilterContent()}
            </div>
          </div>

          <div className="p-4 border-t">
            <button
              onClick={() => {
                resetFilters();
                setShowMobileFilters(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200"
            >
              <RefreshCw size={16} />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fixed filter button for mobile */}
      <button
        onClick={() => setShowMobileFilters(true)}
        className="fixed bottom-4 right-4 z-20 p-3 bg-blue-500 text-white rounded-full shadow-lg md:hidden flex items-center justify-center">
        <SlidersHorizontal size={24} />
        {totalFiltersCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
            {totalFiltersCount}
          </span>
        )}
      </button>
    </>
  );
};
