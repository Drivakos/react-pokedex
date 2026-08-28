import { useEffect, useState } from 'react';
import type { TeamWithJoinedMembers } from '../../lib/supabase';
import type { AbilityPreviewDetails } from '../../services/api/abilities.api';
import type { MovePreviewDetails } from '../../services/api/moves.api';
import type { Pokemon } from '../../types/pokemon';
import { TeamRosterPreview } from '../teams/TeamRosterPreview';

export function VsTeamPicker({
  teams,
  selectedTeamId,
  onSelect,
  disabled = false,
}: {
  teams: TeamWithJoinedMembers[];
  selectedTeamId: number | null;
  onSelect: (teamId: number) => void;
  disabled?: boolean;
}) {
  const [pokemonById, setPokemonById] = useState<Record<number, Pokemon>>({});
  const [movesByName, setMovesByName] = useState<Record<string, MovePreviewDetails>>({});
  const [abilitiesByName, setAbilitiesByName] = useState<Record<string, AbilityPreviewDetails>>({});
  const pokemonIdKey = [...new Set(
    teams.flatMap(team => team.team_members?.map(member => member.pokemon_id) ?? []),
  )].join(',');
  const moveNameKey = [...new Set(
    teams.flatMap(team => team.team_members?.flatMap(member => member.moves ?? []) ?? [])
      .map(move => move.trim().toLowerCase())
      .filter(Boolean),
  )].sort().join(',');
  const abilityNameKey = [...new Set(
    teams.flatMap(team => team.team_members?.map(member => member.ability ?? '') ?? [])
      .map(ability => ability.trim().toLowerCase())
      .filter(Boolean),
  )].sort().join(',');

  useEffect(() => {
    let cancelled = false;
    if (!pokemonIdKey) {
      setPokemonById(previous => Object.keys(previous).length === 0 ? previous : {});
      return undefined;
    }
    const pokemonIds = pokemonIdKey.split(',').map(Number);

    void import('../../services/pokemon.service')
      .then(({ PokemonService }) => PokemonService.getBatch(pokemonIds))
      .then(pokemon => {
        if (!cancelled) setPokemonById(Object.fromEntries(pokemon.map(entry => [entry.id, entry])));
      })
      .catch(() => {
        // The saved build remains useful if optional species metadata cannot load.
        if (!cancelled) setPokemonById({});
      });

    return () => {
      cancelled = true;
    };
  }, [pokemonIdKey]);

  useEffect(() => {
    let cancelled = false;
    if (!moveNameKey) {
      setMovesByName(previous => Object.keys(previous).length === 0 ? previous : {});
      return undefined;
    }
    const moveNames = moveNameKey.split(',');

    void import('../../services/api/moves.api')
      .then(({ fetchMovePreviewDetails }) => fetchMovePreviewDetails(moveNames))
      .then(moves => {
        if (!cancelled) setMovesByName(Object.fromEntries(moves.map(move => [move.name, move])));
      })
      .catch(() => {
        if (!cancelled) setMovesByName({});
      });

    return () => {
      cancelled = true;
    };
  }, [moveNameKey]);

  useEffect(() => {
    let cancelled = false;
    if (!abilityNameKey) {
      setAbilitiesByName(previous => Object.keys(previous).length === 0 ? previous : {});
      return undefined;
    }
    const abilityNames = abilityNameKey.split(',');

    void import('../../services/api/abilities.api')
      .then(({ fetchAbilityPreviewDetails }) => fetchAbilityPreviewDetails(abilityNames))
      .then(abilities => {
        if (!cancelled) setAbilitiesByName(Object.fromEntries(abilities.map(ability => [ability.name, ability])));
      })
      .catch(() => {
        if (!cancelled) setAbilitiesByName({});
      });

    return () => {
      cancelled = true;
    };
  }, [abilityNameKey]);

  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
        You do not have a saved team yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {teams.map(team => {
        const count = team.team_members?.length ?? 0;
        const selected = selectedTeamId === team.id;
        return (
          <button
            key={team.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(team.id)}
            className={`rounded-xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-red-500 bg-red-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <span className="block font-bold text-slate-900">{team.name}</span>
            <span className="mt-1 block text-sm text-slate-500">
              {count} Pokémon · Level 50 rules
            </span>
            <TeamRosterPreview
              members={team.team_members}
              pokemonById={pokemonById}
              movesByName={movesByName}
              abilitiesByName={abilitiesByName}
              showBuildDetails
            />
          </button>
        );
      })}
    </div>
  );
}
