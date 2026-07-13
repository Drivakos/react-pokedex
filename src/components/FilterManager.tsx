import React, { useEffect, useState, useMemo } from 'react';
import { RefreshCw, X, SlidersHorizontal } from 'lucide-react';
import { FilterTabs } from './filters/FilterTabs';
import { TypesFilter } from './filters/TypesFilter';
import { MovesFilter } from './filters/MovesFilter';
import { OtherFilters } from './filters/OtherFilters';
import { useFilterStore } from '../store/filterStore';

interface FilterManagerProps {
  showDesktopFilters: boolean;
  setShowDesktopFilters: (show: boolean) => void;
  showMobileFilters: boolean;
  setShowMobileFilters: (show: boolean) => void;
}

export const FilterManager: React.FC<FilterManagerProps> = ({
  showDesktopFilters,
  setShowDesktopFilters,
  showMobileFilters,
  setShowMobileFilters,
}) => {
  const { 
    filters, 
    updateFilter, 
    resetFilters, 
    availableTypes, 
    availableMoves, 
    availableGenerations 
  } = useFilterStore();
  
  const [activeFilterTab, setActiveFilterTab] = useState<'types' | 'moves' | 'other'>('types');
  const [moveSearch, setMoveSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDesktopFilters(false);
        setShowMobileFilters(false);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [setShowDesktopFilters, setShowMobileFilters]);

  const totalFiltersCount = useMemo(() => {
    let count = 0;
    count += filters.types.length;
    count += filters.moves.length;
    if (filters.generation) count++;
    if (filters.weight.min > 0 || (filters.weight.max > 0 && filters.weight.max < 1000)) count++;
    if (filters.height.min > 0 || (filters.height.max > 0 && filters.height.max < 100)) count++;
    if (filters.hasEvolutions !== null) count++;
    return count;
  }, [filters]);

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
              updateFilter('types', newTypes);
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
              updateFilter('moves', newMoves);
            }}
          />
        );
      case 'other':
        return (
          <OtherFilters
            filters={filters}
            availableGenerations={availableGenerations}
            onGenerationChange={(generation: string) => updateFilter('generation', generation)}
            onWeightChange={(min: number | null, max: number | null) => updateFilter('weight', {
              min: min ? min * 10 : 0,
              max: max ? max * 10 : 1000
            })}
            onHeightChange={(min: number | null, max: number | null) => updateFilter('height', {
              min: min ? min * 10 : 0,
              max: max ? max * 10 : 100
            })}
          />
        );
    }
  };

  const renderDrawerContent = (isDesktop: boolean) => (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Filters</h2>
          <p className="text-sm text-gray-500">Refine your Pokédex</p>
        </div>
        <button
          type="button"
          onClick={() => isDesktop ? setShowDesktopFilters(false) : setShowMobileFilters(false)}
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close filters"
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        <FilterTabs
          activeTab={activeFilterTab}
          setActiveTab={(tab) => setActiveFilterTab(tab as 'types' | 'moves' | 'other')}
          typeCount={filters.types.length}
          moveCount={filters.moves.length}
          otherCount={totalFiltersCount - filters.types.length - filters.moves.length}
        />

        <div className="mt-5">
          {renderFilterContent()}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={() => {
            resetFilters();
            if (!isDesktop) setShowMobileFilters(false);
          }}
          disabled={isDesktop && totalFiltersCount === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          <RefreshCw size={16} />
          <span>
            {isDesktop && totalFiltersCount === 0
              ? 'No active filters'
              : `Reset all filters${totalFiltersCount > 0 ? ` (${totalFiltersCount})` : ''}`}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop filter drawer */}
      <div
        className={`fixed inset-0 z-40 hidden bg-gray-900/30 transition-opacity duration-300 md:block ${showDesktopFilters ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setShowDesktopFilters(false)}
        aria-hidden="true"
      />

      <aside
        id="desktop-filter-drawer"
        className={`fixed inset-y-0 right-0 z-50 hidden w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out md:block ${showDesktopFilters ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Pokémon filters"
        aria-hidden={!showDesktopFilters}
      >
        {renderDrawerContent(true)}
      </aside>

      {/* Mobile Filter Panel */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300 ${showMobileFilters ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowMobileFilters(false)}></div>

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-80 max-w-[calc(100vw-2rem)] transform bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${showMobileFilters ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Pokémon filters"
        aria-hidden={!showMobileFilters}
      >
        {renderDrawerContent(false)}
      </aside>

      {/* Fixed filter button for mobile */}
      <button
        type="button"
        onClick={() => setShowMobileFilters(true)}
        className="fixed bottom-4 right-4 z-20 flex items-center justify-center rounded-full bg-blue-500 p-3 text-white shadow-lg transition-colors hover:bg-blue-600 md:hidden"
        aria-label="Open filters"
        aria-expanded={showMobileFilters}
      >
        <SlidersHorizontal size={24} />
        {totalFiltersCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
            {totalFiltersCount}
          </span>
        )}
      </button>

      {/* Keep filters reachable after the desktop header scrolls away. */}
      <button
        type="button"
        onClick={() => setShowDesktopFilters(true)}
        className={`fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full bg-blue-500 px-5 py-3 font-semibold text-white shadow-lg transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:flex ${showDesktopFilters ? 'pointer-events-none translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
        aria-label="Open filters"
        aria-controls="desktop-filter-drawer"
        aria-expanded={showDesktopFilters}
      >
        <SlidersHorizontal size={18} />
        <span>Filters</span>
        {totalFiltersCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-blue-600">
            {totalFiltersCount}
          </span>
        )}
      </button>
    </>
  );
};
