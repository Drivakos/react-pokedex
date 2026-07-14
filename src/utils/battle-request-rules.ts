interface ActiveTrapState {
  trapped?: boolean;
  maybeTrapped?: boolean;
}

export function isSwitchingBlocked(active: ActiveTrapState | null | undefined): boolean {
  return active?.trapped === true;
}
