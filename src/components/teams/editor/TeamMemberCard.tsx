import React from 'react';
import PokemonImage from '../../PokemonImage';
import { TeamMember } from '../../../lib/supabase';
import { CopyPlus, Pencil, Trash2, UserRound } from 'lucide-react';
import type { TeamPokemonData } from '../../../store/teamStore';

interface TeamMemberCardProps {
  member: TeamMember;
  pokemon: TeamPokemonData;
  onEdit: (member: TeamMember) => void;
  onRemoveClick: (member: TeamMember) => void;
  onCopy: (member: TeamMember, pokemon: TeamPokemonData) => void;
  formatName: (name: string) => string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  pokemon,
  onEdit,
  onRemoveClick,
  onCopy,
  formatName
}) => {
  const evs = member.evs || { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
  const ivs = member.ivs || { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 };

  const getTypeColor = (typeName: string) => {
    const typeColors: Record<string, string> = {
      normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
      grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
      ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
      rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
      steel: '#B8B8D0', fairy: '#EE99AC',
    };
    return typeColors[typeName] || '#68A090';
  };

  const statBarClass = (stat: string) => {
    const map: Record<string, string> = {
      hp: 'sd-stat-bar--hp', attack: 'sd-stat-bar--atk', defense: 'sd-stat-bar--def',
      'special-attack': 'sd-stat-bar--spa', 'special-defense': 'sd-stat-bar--spd', speed: 'sd-stat-bar--spe',
    };
    return map[stat] || '';
  };

  const statLabel = (stat: string) => {
    const map: Record<string, string> = {
      hp: 'HP', attack: 'Atk', defense: 'Def',
      'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
    };
    return map[stat] || stat;
  };

  return (
    <div className="sd-panel relative">
      {/* Action buttons */}
      <div className="sd-actions">
        <button className="sd-action-btn" onClick={() => onCopy(member, pokemon)}>
          <CopyPlus size={12} aria-hidden="true" /> Copy
        </button>
        <button className="sd-action-btn" onClick={() => onEdit(member)}><Pencil size={12} aria-hidden="true" /> Edit</button>
        <button className="sd-action-btn sd-action-btn--danger" onClick={() => onRemoveClick(member)}><Trash2 size={12} aria-hidden="true" /> Delete</button>
      </div>

      {/* Build card body */}
      <div className="sd-build-card">
        {/* Sprite */}
        <div className="sd-build-sprite">
          <PokemonImage pokemonId={pokemon.id} alt={pokemon.name} className="w-20 h-20" />
        </div>

        {/* Top row: Nickname/Pokemon/Item | Details | Moves */}
        <div className="sd-build-top">
          <div>
            <div className="sd-field-group">
              <span className="sd-field-label">Nickname</span>
              <span className="sd-field-input" style={{ background: '#f8f8f8' }}>{member.nickname || '—'}</span>
            </div>
            <div className="sd-details-row" style={{ marginTop: 4 }}>
              <div><label>Level</label> <strong>{member.level || 100}</strong></div>
              <div>
                <label>Gender</label>{' '}
                <strong className="inline-flex items-center gap-1">
                  {member.gender ? <UserRound size={11} aria-hidden="true" /> : null}
                  {member.gender ? formatName(member.gender) : '—'}
                </strong>
              </div>
              <div><label>Shiny</label> <strong>{member.is_shiny ? 'Yes' : 'No'}</strong></div>
              <div><label>Tera</label> <strong>{member.tera_type ? formatName(member.tera_type) : '—'}</strong></div>
            </div>
            {/* Type badges */}
            <div style={{ marginTop: 4, display: 'flex', gap: 3 }}>
              {pokemon.types.map((type, i: number) => (
                <span key={i} className="sd-type-badge" style={{ backgroundColor: getTypeColor(type.type.name) }}>
                  {type.type.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="sd-field-group">
              <span className="sd-field-label">Moves</span>
              <div className="sd-moves-list">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="sd-move-slot">
                    <span className="sd-move-slot-input" style={{ background: '#f8f8f8' }}>
                      {member.moves?.[i] ? formatName(member.moves[i]) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="sd-stats-grid sd-stats-grid--with-ivs">
              <span></span>
              <span></span>
              <span className="sd-ev-header">EV</span>
              <span className="sd-iv-header">IV</span>
              {Object.entries(evs).map(([stat, value]) => (
                <React.Fragment key={stat}>
                  <span className="sd-stat-label">{statLabel(stat)}</span>
                  <div className="sd-stat-bar-container">
                    <div
                      className={`sd-stat-bar ${statBarClass(stat)}`}
                      style={{ width: `${Math.min(100, ((value as number) / 252) * 100)}%` }}
                    />
                  </div>
                  <span className="sd-stat-value">{value as number || ''}</span>
                  <span className="sd-iv-value" style={{ color: (ivs as Record<string, number>)[stat] < 31 ? '#e53e3e' : '#888' }}>{(ivs as Record<string, number>)[stat]}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Pokemon name, Item, Ability */}
        <div className="sd-build-bottom">
          <div className="sd-field-group">
            <span className="sd-field-label">Pokémon</span>
            <span className="sd-field-input" style={{ background: '#f8f8f8', fontWeight: 'bold' }}>{formatName(pokemon.name)}</span>
          </div>
          <div className="sd-field-group">
            <span className="sd-field-label">Item</span>
            <span className="sd-field-input" style={{ background: '#f8f8f8' }}>{member.item ? formatName(member.item) : '—'}</span>
          </div>
          <div className="sd-field-group">
            <span className="sd-field-label">Ability</span>
            <span className="sd-field-input" style={{ background: '#f8f8f8' }}>{member.ability ? formatName(member.ability) : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
