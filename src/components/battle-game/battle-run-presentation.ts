export const typeClasses: Record<string, string> = {
  Bug: 'bg-lime-600', Dark: 'bg-slate-700', Dragon: 'bg-indigo-600', Electric: 'bg-yellow-500',
  Fairy: 'bg-pink-400', Fighting: 'bg-red-700', Fire: 'bg-orange-500', Flying: 'bg-sky-400',
  Ghost: 'bg-purple-700', Grass: 'bg-green-600', Ground: 'bg-amber-700', Ice: 'bg-cyan-500',
  Normal: 'bg-stone-400', Poison: 'bg-violet-600', Psychic: 'bg-pink-600', Rock: 'bg-yellow-800',
  Steel: 'bg-slate-500', Water: 'bg-blue-600',
};

export function getEffectivenessPresentation(effectiveness: number | null): {
  label: string;
  shortLabel: string;
  classes: string;
} {
  if (effectiveness === null) {
    return {
      label: 'Status move · no damage multiplier',
      shortLabel: '—',
      classes: 'border-slate-200 bg-slate-100 text-slate-600',
    };
  }
  if (effectiveness === 0) {
    return {
      label: 'No effect · 0×',
      shortLabel: 'x0',
      classes: 'border-slate-300 bg-slate-200 text-slate-700',
    };
  }
  if (effectiveness > 1) {
    return {
      label: `Super effective · ${effectiveness}×`,
      shortLabel: `x${effectiveness}`,
      classes: 'border-emerald-200 bg-emerald-100 text-emerald-800',
    };
  }
  if (effectiveness < 1) {
    return {
      label: `Not very effective · ${effectiveness}×`,
      shortLabel: `x${effectiveness}`,
      classes: 'border-amber-200 bg-amber-100 text-amber-800',
    };
  }
  return {
    label: 'Neutral damage · 1×',
    shortLabel: 'x1',
    classes: 'border-blue-200 bg-blue-50 text-blue-700',
  };
}
