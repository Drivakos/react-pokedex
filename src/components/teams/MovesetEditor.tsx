import React from 'react';
import { CheckCircle2, Copy, Save, Upload, UserRound, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatName } from '../../utils/helpers';
import PokemonImage from '../PokemonImage';
import {
  EV_PRESETS,
  formatMoveName,
  getTypeColor,
  type MovesetEditorProps,
  POKEMON_TYPES,
  type PokemonBuild,
} from './moveset-editor-model';
import { MoveCatalogue } from './MoveCatalogue';
import { useMovesetEditor } from './useMovesetEditor';
import './ShowdownStyles.css';

const MovesetEditorContent: React.FC<MovesetEditorProps> = ({ pokemon, teamId, initialBuild, onSave }) => {
  const {
    selectedMoves,
    availableMoves,
    moveDetails,
    validationErrors,
    premadeBuilds,
    showPremadeBuilds,
    setShowPremadeBuilds,
    premadeBuildsLoading,
    loading,
    pokemonBuild,
    setPokemonBuild,
    availableNatures,
    availableAbilities,
    hasGenderDifference,
    abilityDescriptions,
    itemDescriptions,
    handleSaveBuild,
    exportCurrentPokemon,
    handleMoveToggle,
    handleAbilityChange,
    handleRemoveMove,
    handlePremadeBuildsToggle,
    handleApplyPremadeBuild,
    availableHeldItems,
    statBarClass,
    statLabelShort,
    totalEVs,
    remainingEVs,
    handleEVChange,
    handleIVChange,
  } = useMovesetEditor({ pokemon, teamId, initialBuild, onSave });
  if (loading) {
    return (
      <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p style={{ marginTop: 12, color: '#666' }}>Loading moves...</p>
      </div>
    );
  }

  return (
    <>
      {/* Compact Build Summary Card */}
      <div className="sd-panel">
        {/* Action bar */}
        <div className="sd-actions" style={{ borderTop: 'none', borderBottom: '1px solid #ddd' }}>
          <button
            className="sd-action-btn sd-action-btn--autofill"
            onClick={handlePremadeBuildsToggle}
            disabled={premadeBuildsLoading}
            aria-expanded={showPremadeBuilds}
          >
            <Wand2 size={12} aria-hidden="true" />
            {premadeBuildsLoading ? 'Finding builds…' : 'Auto-fill'}
          </button>
          <button className="sd-action-btn" onClick={exportCurrentPokemon}>
            <Copy size={12} /> Copy
          </button>
          <button className="sd-action-btn" onClick={exportCurrentPokemon}>
            <Upload size={12} aria-hidden="true" /> Import/Export
          </button>
          <button className="sd-action-btn" onClick={handleSaveBuild} style={{ color: '#2a8c2a', fontWeight: 'bold' }}>
            <Save size={12} /> Save
          </button>
        </div>

        {showPremadeBuilds && (
          <section className="sd-premade-picker" aria-label="Premade builds">
            <div className="sd-premade-picker__header">
              <div>
                <strong>Choose a build</strong>
                <span>Applying a build replaces moves and battle settings, but does not save it.</span>
              </div>
              <button type="button" onClick={() => setShowPremadeBuilds(false)} aria-label="Close premade builds">×</button>
            </div>
            <div className="sd-premade-grid">
              {premadeBuilds.map(build => (
                <button
                  type="button"
                  key={build.id}
                  className="sd-premade-card"
                  onClick={() => handleApplyPremadeBuild(build)}
                >
                  <span className="sd-premade-card__title">{build.name}</span>
                  <span className="sd-premade-card__meta">
                    {build.source === 'smogon' ? build.format.toUpperCase() : 'Random Battle role'}
                    {build.item ? ` · ${build.item}` : ''}
                  </span>
                  <span className="sd-premade-card__moves">{build.moves.map(formatMoveName).join(' · ')}</span>
                </button>
              ))}
            </div>
            <p className="sd-premade-attribution">
              Competitive sets from <a href="https://www.smogon.com/" target="_blank" rel="noreferrer">Smogon</a>;
              fallback roles from <a href="https://github.com/pkmn/randbats" target="_blank" rel="noreferrer">Pokémon Showdown Random Battles</a>.
            </p>
          </section>
        )}

        <div className="sd-build-card">
          {/* Sprite */}
          <div className="sd-build-sprite">
            <PokemonImage pokemonId={pokemon.id} alt={formatName(pokemon.name)} className="w-20 h-20" />
          </div>

          {/* Top row: Nickname/Details | Moves | Stats */}
          <div className="sd-build-top">
            <div>
              <div className="sd-field-group">
                <span className="sd-field-label">Nickname</span>
                <input
                  className="sd-field-input"
                  value={pokemonBuild.nickname}
                  onChange={(e) => setPokemonBuild(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder={formatName(pokemon.name)}
                />
              </div>
              <div className="sd-details-row" style={{ marginTop: 4 }}>
                <div><label>Level</label> <strong>100</strong></div>
                <div>
                  <label>Gender</label>{' '}
                  <strong className="inline-flex items-center gap-1">
                    {pokemonBuild.gender ? <UserRound size={11} aria-hidden="true" /> : null}
                    {pokemonBuild.gender ? formatName(pokemonBuild.gender) : '—'}
                  </strong>
                </div>
                <div>
                  <label>Shiny</label>
                  <input
                    type="checkbox"
                    checked={pokemonBuild.isShiny}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, isShiny: e.target.checked }))}
                    style={{ marginLeft: 2 }}
                  />
                </div>
                <div>
                  <label>Tera Type</label>
                  <select
                    className="sd-field-select"
                    style={{ width: 'auto', marginLeft: 2 }}
                    value={pokemonBuild.teraType}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, teraType: e.target.value }))}
                  >
                    <option value="">—</option>
                    {POKEMON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {/* Type badges */}
              <div style={{ marginTop: 4, display: 'flex', gap: 3 }}>
                {pokemon.types.map((type) => (
                  <span key={type.type.name} className="sd-type-badge" style={{ backgroundColor: getTypeColor(type.type.name) }}>
                    {type.type.name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className={`sd-field-group${validationErrors.moves ? ' sd-field-group--invalid' : ''}`}>
                <span className="sd-field-label">Moves <span aria-hidden="true">*</span></span>
                <div
                  className="sd-moves-list"
                  aria-invalid={Boolean(validationErrors.moves)}
                  aria-describedby={validationErrors.moves ? 'moves-validation-error' : undefined}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="sd-move-slot">
                      <span className="sd-move-slot-input" style={{ background: selectedMoves[i] ? '#fff' : '#f8f8f8' }}>
                        {selectedMoves[i] ? formatMoveName(selectedMoves[i]) : ''}
                      </span>
                      {selectedMoves[i] && (
                        <button
                          className="sd-move-slot-remove"
                          onClick={() => handleRemoveMove(selectedMoves[i])}
                          title="Remove move"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {validationErrors.moves && (
                  <span id="moves-validation-error" className="sd-field-error" role="alert">
                    {validationErrors.moves}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="sd-stats-grid sd-stats-grid--with-ivs">
                <span></span>
                <span></span>
                <span className="sd-ev-header">EV</span>
                <span className="sd-iv-header">IV</span>
                {Object.entries(pokemonBuild.evs).map(([stat, value]) => (
                  <React.Fragment key={stat}>
                    <span className="sd-stat-label">{statLabelShort(stat)}</span>
                    <div className="sd-stat-bar-container">
                      <div
                        className={`sd-stat-bar ${statBarClass(stat)}`}
                        style={{ width: `${Math.min(100, (value / 252) * 100)}%` }}
                      />
                    </div>
                    <span className="sd-stat-value">{value || ''}</span>
                    <span className="sd-iv-value" style={{ color: pokemonBuild.ivs[stat as keyof PokemonBuild['ivs']] < 31 ? '#e53e3e' : '#888' }}>
                      {pokemonBuild.ivs[stat as keyof PokemonBuild['ivs']]}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row: Pokemon, Item, Ability */}
          <div className="sd-build-bottom">
            <div className="sd-field-group">
              <span className="sd-field-label">Pokémon</span>
              <span className="sd-field-input" style={{ background: '#f8f8f8', fontWeight: 'bold' }}>
                {formatName(pokemon.name)}
              </span>
            </div>
            <div className="sd-field-group">
              <span className="sd-field-label">Item</span>
              <select
                className="sd-field-select"
                value={pokemonBuild.heldItem}
                onChange={(e) => setPokemonBuild(prev => ({ ...prev, heldItem: e.target.value }))}
              >
                <option value="">None</option>
                {availableHeldItems.map((item) => (
                  <option key={item} value={item}>
                    {formatName(item)}
                    {itemDescriptions[item] && ` - ${itemDescriptions[item]}`}
                  </option>
                ))}
              </select>
            </div>
            <div className={`sd-field-group${validationErrors.ability ? ' sd-field-group--invalid' : ''}`}>
              <span className="sd-field-label">Ability <span aria-hidden="true">*</span></span>
              <select
                className="sd-field-select"
                value={pokemonBuild.ability}
                onChange={(e) => handleAbilityChange(e.target.value)}
                aria-invalid={Boolean(validationErrors.ability)}
                aria-describedby={validationErrors.ability ? 'ability-validation-error' : undefined}
              >
                <option value="">Select</option>
                {availableAbilities.map((ability) => (
                  <option key={ability} value={ability}>
                    {formatName(ability)}
                    {abilityDescriptions[ability] && ` - ${abilityDescriptions[ability]}`}
                  </option>
                ))}
              </select>
              {validationErrors.ability && (
                <span id="ability-validation-error" className="sd-field-error" role="alert">
                  {validationErrors.ability}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nature + Gender row */}
        <div style={{ padding: '4px 8px', borderTop: '1px solid #ddd', display: 'flex', gap: 12, alignItems: 'center', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="sd-field-label">Nature</span>
            <select
              className="sd-field-select"
              style={{ width: 'auto' }}
              value={pokemonBuild.nature}
              onChange={(e) => setPokemonBuild(prev => ({ ...prev, nature: e.target.value }))}
            >
              {availableNatures.map((nature) => (
                <option key={nature.name} value={nature.name}>
                  {formatName(nature.name)} - {nature.description}
                </option>
              ))}
            </select>
          </div>
          {hasGenderDifference && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="sd-field-label">Gender</span>
              <select
                className="sd-field-select"
                style={{ width: 'auto' }}
                value={pokemonBuild.gender || ''}
                onChange={(e) => setPokemonBuild(prev => ({ ...prev, gender: e.target.value || null }))}
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          )}
        </div>

        {/* EVs / IVs Panel */}
        <div style={{ borderTop: '1px solid #ddd' }}>
          <div className="sd-eviv-row">
            <div className="sd-ev-panel" style={{ borderRight: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 'bold', color: '#555' }}>EVs ({totalEVs}/510)</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Object.entries(EV_PRESETS).slice(0, 4).map(([name, evs]) => (
                    <button
                      key={name}
                      className="sd-preset-btn"
                      onClick={() => setPokemonBuild(prev => ({ ...prev, evs }))}
                      title={name}
                    >
                      {name.replace(' Attacker', '').replace(' Wall', '')}
                    </button>
                  ))}
                </div>
              </div>
              {Object.entries(pokemonBuild.evs).map(([stat, value]) => (
                <div key={stat} className="sd-ev-row">
                  <label>{statLabelShort(stat)}</label>
                  <input
                    type="number"
                    min="0"
                    max="252"
                    value={value}
                    onChange={(e) => handleEVChange(stat as keyof PokemonBuild['evs'], e.target.value)}
                  />
                  <div className="sd-ev-bar-bg">
                    <div
                      className={`sd-stat-bar ${statBarClass(stat)}`}
                      style={{ width: `${Math.min(100, (value / 252) * 100)}%`, height: '100%', borderRadius: 2 }}
                    />
                  </div>
                </div>
              ))}
              <div className="sd-ev-total">
                {remainingEVs} remaining
                {remainingEVs === 0 && (
                  <span style={{ color: '#2a8c2a', marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <CheckCircle2 size={12} aria-hidden="true" /> Fully trained
                  </span>
                )}
              </div>
            </div>

            {/* IVs Panel */}
            <div className="sd-ev-panel" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 'bold', color: '#555' }}>IVs</span>
                <button
                  className="sd-preset-btn"
                  onClick={() => setPokemonBuild(prev => ({
                    ...prev,
                    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
                  }))}
                >
                  Max All
                </button>
              </div>
              {Object.entries(pokemonBuild.ivs).map(([stat, value]) => (
                <div key={stat} className="sd-ev-row">
                  <label>{statLabelShort(stat)}</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={value}
                    onChange={(e) => handleIVChange(stat as keyof PokemonBuild['ivs'], e.target.value)}
                  />
                  <div className="sd-ev-bar-bg">
                    <div
                      className={`sd-stat-bar ${statBarClass(stat)}`}
                      style={{ width: `${Math.min(100, (value / 31) * 100)}%`, height: '100%', borderRadius: 2 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <MoveCatalogue
        availableMoves={availableMoves}
        moveDetails={moveDetails}
        selectedMoves={selectedMoves}
        onToggle={handleMoveToggle}
      />
    </>
  );
};

// Error boundary wrapper for MovesetEditor component
const MovesetEditor: React.FC<MovesetEditorProps> = ({ pokemon, teamId, onBack, initialBuild, onSave }) => {
  try {
    return <MovesetEditorContent pokemon={pokemon} teamId={teamId} onBack={onBack} initialBuild={initialBuild} onSave={onSave} />;
  } catch (error) {
    console.error('MovesetEditor component error:', error);
    toast.error(`Error loading moveset editor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Moveset Editor</h1>
            <p className="text-gray-600 mb-4">
              Failed to load the moveset editor. Please try again.
            </p>
            <button
              onClick={onBack}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default MovesetEditor;
