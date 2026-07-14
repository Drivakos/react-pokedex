import { getRunArenaTheme } from '../arena-themes';

describe('Battle Run arena themes', () => {
  it('moves through a distinct visual circuit every five stages', () => {
    expect(getRunArenaTheme(1).id).toBe('opening-circuit');
    expect(getRunArenaTheme(6).id).toBe('pressure-circuit');
    expect(getRunArenaTheme(15).id).toBe('summit-circuit');
  });

  it('adds route-specific pressure framing without changing the sector', () => {
    const trail = getRunArenaTheme(8, 'trail');
    const apex = getRunArenaTheme(8, 'apex');

    expect(trail.id).toBe(apex.id);
    expect(trail.routeFrameClass).not.toBe(apex.routeFrameClass);
    expect(apex.routeAccentClass).toContain('bg-red-500');
  });
});
