import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'battle-balance-'));
  const output = join(temporaryDirectory, 'runner.mjs');

  try {
    await build({
      entryPoints: [new URL('./simulate-battle-balance-entry.ts', import.meta.url).pathname],
      outfile: output,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      logLevel: 'silent',
    });
    await import(pathToFileURL(output).href);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

void main();
