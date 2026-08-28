import { Sparkles } from 'lucide-react';
import PokemonImage from '../PokemonImage';
import type { TeamMember } from '../../lib/supabase';
import type { AbilityPreviewDetails } from '../../services/api/abilities.api';
import type { MovePreviewDetails } from '../../services/api/moves.api';
import type { Pokemon } from '../../types/pokemon';
import { formatName, formatPokemonId } from '../../utils/helpers';
import { getTypeColor, getTypeColorWithOpacity } from '../../utils/pokemonTypeColors';

const statOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const;
const statLabels: Record<(typeof statOrder)[number], string> = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  'special-attack': 'SpA',
  'special-defense': 'SpD',
  speed: 'Spe',
};

const defaultEvs = {
  hp: 0,
  attack: 0,
  defense: 0,
  'special-attack': 0,
  'special-defense': 0,
  speed: 0,
};

const defaultIvs = {
  hp: 31,
  attack: 31,
  defense: 31,
  'special-attack': 31,
  'special-defense': 31,
  speed: 31,
};

interface TeamRosterPreviewProps {
  members?: TeamMember[];
  pokemonById?: Record<number, Pokemon>;
  movesByName?: Record<string, MovePreviewDetails>;
  abilitiesByName?: Record<string, AbilityPreviewDetails>;
  showBuildDetails?: boolean;
}

function PokemonBuildPreview({
  member,
  pokemon,
  movesByName,
  abilitiesByName,
}: {
  member: TeamMember;
  pokemon?: Pokemon;
  movesByName: Record<string, MovePreviewDetails>;
  abilitiesByName: Record<string, AbilityPreviewDetails>;
}) {
  const evs = member.evs ?? defaultEvs;
  const ivs = member.ivs ?? defaultIvs;
  const moves = member.moves?.filter(Boolean) ?? [];
  const abilityDetails = member.ability ? abilitiesByName[member.ability.trim().toLowerCase()] : undefined;
  const displayName = member.nickname?.trim() || (pokemon ? formatName(pokemon.name) : `Pokémon ${formatPokemonId(member.pokemon_id)}`);

  return (
    <div className="w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-3 text-left text-slate-700 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{displayName}</p>
          {member.nickname && pokemon && (
            <p className="truncate text-[11px] font-semibold text-slate-500">{formatName(pokemon.name)}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {pokemon?.types.map(type => (
            <span
              key={type}
              className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white"
              style={{ backgroundColor: getTypeColor(type) }}
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div className="flex min-w-0 gap-1"><dt className="text-slate-400">Item</dt><dd className="truncate font-bold">{member.item ? formatName(member.item) : 'None'}</dd></div>
        <div className="flex min-w-0 gap-1"><dt className="text-slate-400">Nature</dt><dd className="truncate font-bold">{formatName(member.nature || 'hardy')}</dd></div>
        <div className="flex min-w-0 gap-1"><dt className="text-slate-400">Tera</dt><dd className="truncate font-bold">{member.tera_type ? formatName(member.tera_type) : 'Default'}</dd></div>
      </dl>

      <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="shrink-0 text-violet-600" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-wider text-violet-500">Ability</span>
          <span className="min-w-0 truncate text-[11px] font-black text-violet-900">
            {member.ability ? formatName(member.ability) : 'Not set'}
          </span>
        </div>
        {member.ability && (
          <p className="mt-1 text-[10px] leading-relaxed text-violet-800">
            {abilityDetails?.description || 'Ability description unavailable.'}
          </p>
        )}
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Moves</p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map(index => (
            <MovePreview
              key={index}
              moveName={moves[index]}
              details={moves[index] ? movesByName[moves[index].trim().toLowerCase()] : undefined}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[2.1rem_repeat(6,minmax(0,1fr))] bg-slate-50 text-center text-[9px] font-black text-slate-400">
          <span className="px-1 py-1" />
          {statOrder.map(stat => <span key={stat} className="px-1 py-1">{statLabels[stat]}</span>)}
        </div>
        {pokemon?.stats && (
          <div className="grid grid-cols-[2.1rem_repeat(6,minmax(0,1fr))] border-t border-slate-100 text-center text-[10px]">
            <span className="bg-slate-50 px-1 py-1 text-left font-bold text-slate-400">Base</span>
            {statOrder.map(stat => <span key={stat} className="px-1 py-1 font-bold">{pokemon.stats?.[stat]}</span>)}
          </div>
        )}
        <div className="grid grid-cols-[2.1rem_repeat(6,minmax(0,1fr))] border-t border-slate-100 text-center text-[10px]">
          <span className="bg-slate-50 px-1 py-1 text-left font-bold text-slate-400">EV</span>
          {statOrder.map(stat => <span key={stat} className="px-1 py-1 font-bold">{evs[stat]}</span>)}
        </div>
        <div className="grid grid-cols-[2.1rem_repeat(6,minmax(0,1fr))] border-t border-slate-100 text-center text-[10px]">
          <span className="bg-slate-50 px-1 py-1 text-left font-bold text-slate-400">IV</span>
          {statOrder.map(stat => <span key={stat} className="px-1 py-1 font-bold">{ivs[stat]}</span>)}
        </div>
      </div>

      <p className="mt-2 text-[10px] font-semibold text-slate-400">Saved Lv. {member.level ?? 50} · VS battles use Lv. 50</p>
    </div>
  );
}

function MovePreview({ moveName, details }: { moveName?: string; details?: MovePreviewDetails }) {
  if (!moveName) {
    return <span className="rounded border border-slate-100 bg-slate-50 px-2 py-2 text-[11px] text-slate-400">—</span>;
  }

  const category = details ? formatName(details.damageClass) : null;
  const typeColor = details ? getTypeColor(details.type) : '#94a3b8';
  return (
    <span
      className="min-w-0 rounded-lg border px-2 py-1.5"
      style={{
        backgroundColor: details ? getTypeColorWithOpacity(details.type, 0.12) : '#f8fafc',
        borderColor: details ? getTypeColorWithOpacity(details.type, 0.45) : '#e2e8f0',
      }}
    >
      <span className="flex min-w-0 items-center justify-between gap-1.5">
        <span className="truncate text-[11px] font-black text-slate-800">{formatName(moveName)}</span>
        {details && (
          <span className="inline-flex shrink-0" title={`${category} move`} aria-label={`${category} move`}>
            <img
              src={`/ps/sprites/categories/${category}.png`}
              alt=""
              className="h-3 w-7 object-contain"
              aria-hidden="true"
            />
          </span>
        )}
      </span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white"
          style={{ backgroundColor: typeColor }}
        >
          {details ? details.type : 'Loading'}
        </span>
        {details && (
          <span className="text-[9px] font-bold text-slate-500">
            {details.damageClass === 'status' ? 'Status' : `${details.power ?? '—'} BP`}
          </span>
        )}
      </span>
    </span>
  );
}

export function TeamRosterPreview({
  members = [],
  pokemonById = {},
  movesByName = {},
  abilitiesByName = {},
  showBuildDetails = false,
}: TeamRosterPreviewProps) {
  const memberByPosition = new Map(members.map(member => [member.position, member]));

  return (
    <div className="mt-3 grid grid-cols-6 gap-1.5" aria-label="Team preview">
      {[1, 2, 3, 4, 5, 6].map((position, index) => {
        const member = memberByPosition.get(position);
        const tooltipPosition = index < 2
          ? 'left-0'
          : index > 3
            ? 'right-0'
            : 'left-1/2 -translate-x-1/2';
        return (
          <div
            key={position}
            className={`group/member relative flex aspect-square min-w-0 items-center justify-center rounded-lg border ${
              member ? 'border-slate-200 bg-slate-50' : 'border-dashed border-slate-200 bg-slate-50/50'
            }`}
            title={member
              ? `Position ${position}: Pokémon ${formatPokemonId(member.pokemon_id)}${showBuildDetails ? ' — hover for build details' : ''}`
              : `Position ${position}: Empty`}
          >
            {member ? (
              <>
                <PokemonImage
                  pokemonId={member.pokemon_id}
                  alt={pokemonById[member.pokemon_id]?.name ? formatName(pokemonById[member.pokemon_id].name) : `Pokémon in position ${position}`}
                  className="h-10 w-10 max-w-full object-contain transition-transform group-hover/member:scale-110 sm:h-12 sm:w-12"
                />
                {showBuildDetails && (
                  <div
                    aria-hidden="true"
                    className={`invisible absolute top-full z-30 mt-2 opacity-0 transition-opacity group-hover/member:visible group-hover/member:opacity-100 max-sm:hidden ${tooltipPosition}`}
                  >
                    <PokemonBuildPreview
                      member={member}
                      pokemon={pokemonById[member.pokemon_id]}
                      movesByName={movesByName}
                      abilitiesByName={abilitiesByName}
                    />
                  </div>
                )}
              </>
            ) : (
              <span className="text-[10px] font-bold text-slate-300">{position}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
