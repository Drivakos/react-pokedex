import type { RunRouteId } from '../../types/battle-run';
import { getRunSector } from '../../utils/battle-run-rules';

export type RunArenaThemeId = 'opening-circuit' | 'pressure-circuit' | 'summit-circuit';

export interface RunArenaTheme {
  id: RunArenaThemeId;
  skyClass: string;
  horizonClass: string;
  fieldClass: string;
  platformClass: string;
  lightClass: string;
  beamClass: string;
  badgeClass: string;
  routeFrameClass: string;
  routeAccentClass: string;
}

const sectorThemes: Record<1 | 2 | 3, Omit<RunArenaTheme, 'routeFrameClass' | 'routeAccentClass'>> = {
  1: {
    id: 'opening-circuit',
    skyClass: 'from-sky-500 via-cyan-300 to-cyan-100',
    horizonClass: 'bg-slate-900/80',
    fieldClass: 'from-emerald-400 via-teal-500 to-teal-950',
    platformClass: 'border-cyan-100/35 bg-teal-950/25 shadow-[inset_0_12px_28px_rgba(6,78,59,0.28)]',
    lightClass: 'bg-cyan-100',
    beamClass: 'bg-cyan-200/10',
    badgeClass: 'border-cyan-200/30 bg-slate-950/80 text-cyan-200',
  },
  2: {
    id: 'pressure-circuit',
    skyClass: 'from-indigo-950 via-violet-700 to-rose-300',
    horizonClass: 'bg-violet-950/90',
    fieldClass: 'from-violet-600 via-indigo-800 to-slate-950',
    platformClass: 'border-violet-200/30 bg-indigo-950/35 shadow-[inset_0_12px_28px_rgba(46,16,101,0.42)]',
    lightClass: 'bg-fuchsia-200',
    beamClass: 'bg-fuchsia-300/10',
    badgeClass: 'border-violet-200/30 bg-violet-950/85 text-violet-200',
  },
  3: {
    id: 'summit-circuit',
    skyClass: 'from-slate-950 via-indigo-950 to-amber-700',
    horizonClass: 'bg-black/80',
    fieldClass: 'from-slate-700 via-red-950 to-slate-950',
    platformClass: 'border-amber-200/35 bg-red-950/30 shadow-[inset_0_12px_28px_rgba(69,10,10,0.46)]',
    lightClass: 'bg-amber-200',
    beamClass: 'bg-amber-300/10',
    badgeClass: 'border-amber-200/35 bg-slate-950/90 text-amber-200',
  },
};

const routeClasses: Record<RunRouteId, Pick<RunArenaTheme, 'routeFrameClass' | 'routeAccentClass'>> = {
  trail: {
    routeFrameClass: 'border-emerald-300/20 shadow-[inset_0_0_70px_rgba(16,185,129,0.08)]',
    routeAccentClass: 'bg-emerald-400 text-emerald-950',
  },
  rival: {
    routeFrameClass: 'border-sky-300/25 shadow-[inset_0_0_80px_rgba(14,165,233,0.12)]',
    routeAccentClass: 'bg-sky-400 text-sky-950',
  },
  apex: {
    routeFrameClass: 'border-red-400/35 shadow-[inset_0_0_90px_rgba(239,68,68,0.18)]',
    routeAccentClass: 'bg-red-500 text-white',
  },
};

export function getRunArenaTheme(stage: number, routeId: RunRouteId = 'trail'): RunArenaTheme {
  const sector = getRunSector(stage);
  return { ...sectorThemes[sector.number], ...routeClasses[routeId] };
}
