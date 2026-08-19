import PokemonImage from '../PokemonImage';
import type { TeamMember } from '../../lib/supabase';

export function TeamRosterPreview({ members = [] }: { members?: TeamMember[] }) {
  const memberByPosition = new Map(members.map(member => [member.position, member]));

  return (
    <div className="mt-3 grid grid-cols-6 gap-1.5" aria-label="Team preview">
      {[1, 2, 3, 4, 5, 6].map(position => {
        const member = memberByPosition.get(position);
        return (
          <span
            key={position}
            className={`flex aspect-square min-w-0 items-center justify-center rounded-lg border ${
              member ? 'border-slate-200 bg-slate-50' : 'border-dashed border-slate-200 bg-slate-50/50'
            }`}
            title={member ? `Position ${position}: Pokémon #${member.pokemon_id}` : `Position ${position}: Empty`}
          >
            {member ? (
              <PokemonImage
                pokemonId={member.pokemon_id}
                alt={`Pokémon in position ${position}`}
                className="h-10 w-10 max-w-full object-contain sm:h-12 sm:w-12"
              />
            ) : (
              <span className="text-[10px] font-bold text-slate-300">{position}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
