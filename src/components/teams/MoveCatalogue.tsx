import { useMemo, useState } from 'react';
import { formatName } from '../../utils/helpers';
import { formatMoveName, getTypeColor, type MoveCategoryFilter, type MoveDetails, type MoveSortKey, type SortDirection } from './moveset-editor-model';

interface MoveCatalogueProps {
  availableMoves: string[];
  moveDetails: Record<string, MoveDetails>;
  selectedMoves: string[];
  onToggle: (moveName: string) => void;
}

const getCategoryLabel = (category: string) => {
  if (category === 'physical') return 'Phys';
  if (category === 'special') return 'Spec';
  return 'Stat';
};

const getCategoryClass = (category: string) => {
  if (category === 'physical') return 'sd-cat-icon--physical';
  if (category === 'special') return 'sd-cat-icon--special';
  return 'sd-cat-icon--status';
};

export function MoveCatalogue({ availableMoves, moveDetails, selectedMoves, onToggle }: MoveCatalogueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<MoveCategoryFilter>('all');
  const [sortKey, setSortKey] = useState<MoveSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedOnly, setSelectedOnly] = useState(false);

  const availableMoveTypes = useMemo(() => (
    [...new Set(availableMoves
      .map(moveName => moveDetails[moveName]?.type.name)
      .filter((typeName): typeName is string => Boolean(typeName)))]
      .sort((a, b) => a.localeCompare(b))
  ), [availableMoves, moveDetails]);

  const filteredMoves = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = availableMoves.filter(moveName => {
      const details = moveDetails[moveName];
      return (!normalizedSearch || formatMoveName(moveName).toLowerCase().includes(normalizedSearch))
        && (typeFilter === 'all' || details?.type.name === typeFilter)
        && (categoryFilter === 'all' || details?.damage_class.name === categoryFilter)
        && (!selectedOnly || selectedMoves.includes(moveName));
    });

    return filtered.sort((aName, bName) => {
      const a = moveDetails[aName];
      const b = moveDetails[bName];
      let comparison = 0;

      if (sortKey === 'name') {
        comparison = formatMoveName(aName).localeCompare(formatMoveName(bName));
      } else if (sortKey === 'type' || sortKey === 'category') {
        const aValue = sortKey === 'type' ? a?.type.name : a?.damage_class.name;
        const bValue = sortKey === 'type' ? b?.type.name : b?.damage_class.name;
        comparison = (aValue || '').localeCompare(bValue || '');
      } else {
        const aValue = a?.[sortKey];
        const bValue = b?.[sortKey];
        if (aValue == null && bValue != null) return 1;
        if (aValue != null && bValue == null) return -1;
        comparison = (aValue || 0) - (bValue || 0);
      }

      if (comparison === 0) {
        comparison = formatMoveName(aName).localeCompare(formatMoveName(bName));
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [availableMoves, categoryFilter, moveDetails, searchTerm, selectedMoves, selectedOnly, sortDirection, sortKey, typeFilter]);

  const hasMoveFilters = searchTerm.trim() !== ''
    || typeFilter !== 'all'
    || categoryFilter !== 'all'
    || selectedOnly;

  const resetMoveFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSelectedOnly(false);
  };

  const handleMoveSort = (nextSortKey: MoveSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === 'name' || nextSortKey === 'type' || nextSortKey === 'category' ? 'asc' : 'desc');
  };

  const sortIndicator = (column: MoveSortKey) => sortKey === column
    ? (sortDirection === 'asc' ? ' ↑' : ' ↓')
    : '';

  return (
    <div className="sd-panel">
      <div className="sd-section-header">
        <span>Moves</span>
        <span className="sd-move-count">
          {filteredMoves.length} of {availableMoves.length} · {selectedMoves.length}/4 selected
        </span>
      </div>
      <div className="sd-move-toolbar">
        <label className="sd-move-search">
          <span className="sr-only">Search moves</span>
          <input className="sd-search-input" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search moves..." />
        </label>
        <label className="sd-move-filter">
          <span>Type</span>
          <select aria-label="Move type" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
            <option value="all">All types</option>
            {availableMoveTypes.map(typeName => <option key={typeName} value={typeName}>{formatName(typeName)}</option>)}
          </select>
        </label>
        <label className="sd-move-filter">
          <span>Category</span>
          <select aria-label="Move category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as MoveCategoryFilter)}>
            <option value="all">All categories</option>
            <option value="physical">Physical</option>
            <option value="special">Special</option>
            <option value="status">Status</option>
          </select>
        </label>
        <label className="sd-move-filter">
          <span>Sort</span>
          <select aria-label="Sort moves by" value={sortKey} onChange={event => handleMoveSort(event.target.value as MoveSortKey)}>
            <option value="name">Name</option>
            <option value="type">Type</option>
            <option value="category">Category</option>
            <option value="power">Power</option>
            <option value="accuracy">Accuracy</option>
            <option value="pp">PP</option>
          </select>
        </label>
        <button type="button" className="sd-move-toolbar-btn" onClick={() => setSortDirection(current => current === 'asc' ? 'desc' : 'asc')} aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`} title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}>
          {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
        <button type="button" className={`sd-move-toolbar-btn${selectedOnly ? ' sd-move-toolbar-btn--active' : ''}`} onClick={() => setSelectedOnly(current => !current)} aria-pressed={selectedOnly}>
          Selected only
        </button>
        {hasMoveFilters && <button type="button" className="sd-move-reset" onClick={resetMoveFilters}>Clear filters</button>}
      </div>
      <div className="sd-moves-scroll">
        <table className="sd-moves-table">
          <thead>
            <tr>
              <th><button type="button" className="sd-sort-header" onClick={() => handleMoveSort('name')}>Name{sortIndicator('name')}</button></th>
              <th><button type="button" className="sd-sort-header" onClick={() => handleMoveSort('type')}>Type{sortIndicator('type')}</button></th>
              <th><button type="button" className="sd-sort-header" onClick={() => handleMoveSort('category')}>Cat{sortIndicator('category')}</button></th>
              <th><button type="button" className="sd-sort-header" onClick={() => handleMoveSort('power')}>Pow{sortIndicator('power')}</button></th>
              <th><button type="button" className="sd-sort-header" onClick={() => handleMoveSort('accuracy')}>Acc{sortIndicator('accuracy')}</button></th>
              <th><button type="button" className="sd-sort-header" onClick={() => handleMoveSort('pp')}>PP{sortIndicator('pp')}</button></th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            {filteredMoves.map(moveName => {
              const move = moveDetails[moveName];
              const isSelected = selectedMoves.includes(moveName);
              return (
                <tr key={moveName} className={isSelected ? 'sd-move-selected' : ''} onClick={() => onToggle(moveName)}>
                  <td className="sd-move-name">{formatMoveName(moveName)}</td>
                  <td>{move && <span className="sd-type-badge" style={{ backgroundColor: getTypeColor(move.type.name) }}>{move.type.name}</span>}</td>
                  <td>{move && <span className={`sd-cat-icon ${getCategoryClass(move.damage_class.name)}`}>{getCategoryLabel(move.damage_class.name)}</span>}</td>
                  <td style={{ textAlign: 'right' }}>{move?.power || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{move?.accuracy ? `${move.accuracy}%` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{move?.pp || '—'}</td>
                  <td className="sd-move-effect">{move?.flavor_text_entries?.find(entry => entry.language.name === 'en')?.flavor_text?.replace(/\n/g, ' ') || ''}</td>
                </tr>
              );
            })}
            {filteredMoves.length === 0 && (
              <tr className="sd-moves-empty">
                <td colSpan={7}>
                  <strong>No moves match these filters.</strong>
                  {hasMoveFilters && <button type="button" onClick={resetMoveFilters}>Clear filters</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
