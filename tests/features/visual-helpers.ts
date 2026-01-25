/**
 * Visual regression helpers for BDD tests
 * Since toHaveScreenshot() requires Playwright test context, we use page.screenshot()
 * and manual comparison using pixelmatch (same library Playwright uses internally)
 */

import { Locator, Page } from '@playwright/test';
import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

function sanitizePathSegment(input: string): string {
  return input
    .trim()
    // Keep paths safe on Windows/macOS/Linux
    .replace(/[<>:"/\\|?*]/g, '_') // NOSONAR
    .replace(/\s+/g, '-') // NOSONAR
    .slice(0, 80);
}

function normalizeSnapshotBaseName(name: string): string {
  const trimmed = name.trim();
  return trimmed.toLowerCase().endsWith('.png') ? trimmed.slice(0, -4) : trimmed;
}

/**
 * Takes a screenshot and compares it to a baseline
 * @param locator Playwright locator or page for screenshot
 * @param snapshotName Name of the snapshot file (without extension)
 * @param options Screenshot comparison options
 */
export async function compareScreenshot(
  locator: Locator | Page,
  snapshotName: string,
  options?: {
    featureName?: string;
    platform?: string;
    browserName?: string;
    deviceName?: string;
    threshold?: number;
    maxDiffPixels?: number;
  }
): Promise<void> {
  const featureName = sanitizePathSegment(options?.featureName || 'unknown-feature');
  const platform = sanitizePathSegment(options?.platform || process.platform);
  const browserName = sanitizePathSegment(options?.browserName || process.env.PW_BROWSER || 'chromium');
  const deviceName = sanitizePathSegment(options?.deviceName || process.env.PW_DEVICE || 'Desktop');

  // Layout: feature -> platform -> browser -> device
  const snapshotDir = join(
    process.cwd(),
    'tests',
    'features',
    '__screenshots__',
    featureName,
    platform,
    browserName,
    deviceName
  );

  // Ensure snapshot directory exists
  if (!existsSync(snapshotDir)) {
    mkdirSync(snapshotDir, { recursive: true });
  }

  const baseName = sanitizePathSegment(normalizeSnapshotBaseName(snapshotName));

  const expectedPath = join(snapshotDir, `${baseName}.png`);
  const actualPath = join(snapshotDir, `${baseName}-actual.png`);
  const diffPath = join(snapshotDir, `${baseName}-diff.png`);

  // Take screenshot
  const buffer = await locator.screenshot();

  // Update mode: overwrite baselines (similar to Playwright --update-snapshots)
  const updateSnapshots =
    process.env.PW_UPDATE_SNAPSHOTS === '1' ||
    process.env.PW_UPDATE_SNAPSHOTS === 'true' ||
    process.env.UPDATE_SNAPSHOTS === '1' ||
    process.env.UPDATE_SNAPSHOTS === 'true';

  // If baseline doesn't exist, save it and return (first run)
  if (updateSnapshots || !existsSync(expectedPath)) {
    writeFileSync(expectedPath, buffer);
    console.log(`✓ Updated baseline screenshot: ${expectedPath}`);
    return;
  }

  // Compare screenshots using pixelmatch (same as Playwright)
  const expected = PNG.sync.read(readFileSync(expectedPath));
  const actual = PNG.sync.read(buffer);

  if (expected.width !== actual.width || expected.height !== actual.height) {
    // Save actual for debugging
    writeFileSync(actualPath, buffer);
    throw new Error(
      `Screenshot dimensions mismatch: expected ${expected.width}x${expected.height}, got ${actual.width}x${actual.height}`
    );
  }

  const diff = new PNG({ width: expected.width, height: expected.height });
  
  // pixelmatch threshold is per-pixel color difference (0-1)
  // A threshold of 0.1 means pixels are different if color difference > 10% of max
  // Playwright's threshold of 0.2 is for overall image difference, not per-pixel
  // We use a reasonable per-pixel threshold and then check total diff pixels
  const colorThreshold = 0.1; // Per-pixel color difference threshold
  
  const numDiffPixels = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    expected.width,
    expected.height,
    {
      threshold: colorThreshold,
    }
  );

  const maxDiffPixels = options?.maxDiffPixels ?? 100;

  if (numDiffPixels > maxDiffPixels) {
    // Save actual and diff images for debugging
    writeFileSync(actualPath, buffer);
    const diffBuffer = PNG.sync.write(diff);
    writeFileSync(diffPath, diffBuffer);

    throw new Error(
      `Screenshot mismatch: ${numDiffPixels} pixels differ (max allowed: ${maxDiffPixels}). ` +
        `Expected: ${expectedPath}, Actual: ${actualPath}, Diff: ${diffPath}`
    );
  }

  // Screenshots match - clean up actual and diff files if they exist
  try {
    if (existsSync(actualPath)) {
      unlinkSync(actualPath);
    }
    if (existsSync(diffPath)) {
      unlinkSync(diffPath);
    }
  } catch {
    // Ignore cleanup errors
  }
}
