/**
 * Runs the BDD suite across a browser/device matrix.
 *
 * Usage:
 *   npm run test:bdd:matrix
 *
 * Optional env overrides:
 *   PW_BROWSERS="chromium,webkit"
 *   PW_DEVICES="MacBook Air 15,iPhone 17 Pro Max"
 *
 * Notes:
 * - This is intentionally a single command for CI.
 * - The dev server must already be running (CI job starts it).
 */
import { spawn } from 'node:child_process';

import { bddVisualBrowsers, bddVisualDevices, type BddVisualBrowser, type BddVisualDevice } from './visual-matrix.config';

function parseCsvEnv(envValue: string | undefined): string[] | undefined {
  if (!envValue) return undefined;
  const parts = envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    // On Windows, spawning npm with args can throw EINVAL depending on quoting.
    // Using a shell avoids CreateProcess quoting edge-cases for .cmd shims.
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

const selectedBrowsers = (parseCsvEnv(process.env.PW_BROWSERS) as BddVisualBrowser[] | undefined) ?? [
  ...bddVisualBrowsers,
];
const selectedDevices = (parseCsvEnv(process.env.PW_DEVICES) as BddVisualDevice[] | undefined) ?? [...bddVisualDevices];

let failures = 0;

async function main(): Promise<void> {
  for (const browser of selectedBrowsers) {
    for (const device of selectedDevices) {
      // eslint-disable-next-line no-console
      console.log(`\n=== BDD Visual: ${browser} | ${device} ===\n`);

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PW_BROWSER: browser,
        PW_DEVICE: device,
        // Ensure deterministic output in CI
        CI: process.env.CI ?? 'true',
      };

      // Run: npm run test:bdd -- --tags "not @manual"
      // Use plain "npm" (shell:true on Windows handles the shim).
      const npmCmd = 'npm';
      const tagExpr = process.platform === 'win32' ? '"not @manual"' : 'not @manual';
      const code = await run(npmCmd, ['run', 'test:bdd', '--', '--tags', tagExpr], env);
      if (code !== 0) failures += 1;
    }
  }

  if (failures > 0) {
    // eslint-disable-next-line no-console
    console.error(`\nBDD visual matrix finished with ${failures} failing run(s).\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

