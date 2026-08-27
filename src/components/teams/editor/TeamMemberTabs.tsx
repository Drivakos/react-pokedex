import React, { useRef, useState } from 'react';
import PokemonImage from '../../PokemonImage';
import { TeamMember } from '../../../lib/supabase';
import { GripVertical } from 'lucide-react';
import type { TeamPokemonData } from '../../../types/team-builder';

interface TeamMemberTabsProps {
  teamMembers: TeamMember[];
  pokemonData: Record<number, TeamPokemonData>;
  selectedMember: TeamMember | null;
  showMovesetEditor: boolean;
  onEditMember: (member: TeamMember) => void;
  onRemoveClick: (member: TeamMember) => void;
  onReorderMember: (member: TeamMember, targetPosition: number) => void;
  reorderingMemberId: number | null;
  onShowSearch: () => void;
  formatName: (name: string) => string;
}

export const TeamMemberTabs: React.FC<TeamMemberTabsProps> = ({
  teamMembers,
  pokemonData,
  selectedMember,
  showMovesetEditor,
  onEditMember,
  onRemoveClick,
  onReorderMember,
  reorderingMemberId,
  onShowSearch,
  formatName
}) => {
  const [draggedMemberId, setDraggedMemberId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const pointerDrag = useRef<{
    memberId: number;
    pointerId: number;
    startX: number;
    startY: number;
    targetId: number;
    active: boolean;
  } | null>(null);
  const orderedMembers = [...teamMembers].sort((a, b) => a.position - b.position);

  const clearDragState = () => {
    pointerDrag.current = null;
    setDraggedMemberId(null);
    setDropTargetId(null);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = pointerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;

    drag.active = true;
    setDraggedMemberId(drag.memberId);
    const target = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-team-member-id]');
    const targetId = Number(target?.dataset.teamMemberId);
    if (!orderedMembers.some(member => member.id === targetId)) return;
    drag.targetId = targetId;
    setDropTargetId(targetId);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const drag = pointerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const sourceMember = orderedMembers.find(member => member.id === drag.memberId);
    const targetIndex = orderedMembers.findIndex(member => member.id === drag.targetId);
    clearDragState();
    if (!drag.active || !sourceMember || targetIndex < 0 || sourceMember.id === drag.targetId) return;
    onReorderMember(sourceMember, targetIndex + 1);
  };

  return (
    <div
      className="sd-team-tabs"
      role="list"
      aria-label="Team order"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={clearDragState}
    >
      {orderedMembers.map((member, index) => {
        const pokemon = pokemonData[member.pokemon_id];
        const displayName = member.nickname || formatName(pokemon?.name || 'Unknown');
        const pokemonName = formatName(pokemon?.name || 'Pokémon');
        const isSaving = reorderingMemberId === member.id;
        return (
          <div
            key={member.id}
            className={`sd-team-tab relative group ${selectedMember?.position === member.position && showMovesetEditor ? 'sd-team-tab--active' : ''} ${draggedMemberId === member.id ? 'sd-team-tab--dragging' : ''} ${dropTargetId === member.id && draggedMemberId !== member.id ? 'sd-team-tab--drop-target' : ''} ${isSaving ? 'sd-team-tab--saving' : ''}`}
            onClick={() => onEditMember(member)}
            role="listitem"
            aria-label={`Team slot ${index + 1}: ${displayName}`}
            data-team-member-id={member.id}
          >
            <button
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveClick(member);
              }}
              title="Remove Pokemon"
            >
              <span className="text-[10px] leading-none">×</span>
            </button>
            <PokemonImage pokemonId={member.pokemon_id} alt={pokemon?.name || ''} className="w-10 h-10" />
            <span className="truncate max-w-[72px] text-center">{displayName}</span>
            <span className="sd-team-tab-order-controls">
              <button
                type="button"
                className="sd-team-tab-drag-handle"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  if (reorderingMemberId !== null) {
                    event.preventDefault();
                    return;
                  }
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  pointerDrag.current = {
                    memberId: member.id,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    targetId: member.id,
                    active: false,
                  };
                }}
                aria-label={`Drag ${pokemonName} to reorder`}
                title="Drag to reorder"
              >
                <GripVertical size={13} aria-hidden="true" />
              </button>
              <select
                className="sd-team-tab-position-select"
                value={index + 1}
                disabled={reorderingMemberId !== null}
                onClick={event => event.stopPropagation()}
                onChange={(event) => {
                  event.stopPropagation();
                  onReorderMember(member, Number(event.target.value));
                }}
                aria-label={`Move ${pokemonName} to position`}
                title="Move directly to position"
              >
                {orderedMembers.map((_, targetIndex) => (
                  <option key={targetIndex + 1} value={targetIndex + 1}>
                    #{targetIndex + 1}
                  </option>
                ))}
              </select>
            </span>
          </div>
        );
      })}
      {teamMembers.length < 6 && (
        <button className="sd-team-tab-add" onClick={onShowSearch} title="Add Pokémon">
          +
        </button>
      )}
    </div>
  );
};
