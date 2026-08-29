const fs = require('fs');
const path = require('path');

describe('Showdown desktop layout', () => {
  it('keeps the absolutely positioned battle log inside its desktop column', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/components/battle-game/showdown-stage.css'),
      'utf8',
    );

    const logColumnRule = css.match(/\.showdown-log-col\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(logColumnRule).toMatch(/position:\s*relative/);
  });
});
