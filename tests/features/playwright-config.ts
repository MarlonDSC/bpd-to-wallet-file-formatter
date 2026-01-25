/**
 * Playwright configuration for Cucumber.js BDD tests
 * Ensures consistency with E2E tests by using the same settings
 */

import { devices, type BrowserContextOptions } from '@playwright/test';

export type BrowserName = 'chromium' | 'firefox' | 'webkit';

export type BddVisualProject = {
  browserName: BrowserName;
  deviceName: string;
  platform: string;
  projectName: string;
};

function sanitizePathSegment(input: string): string {
  return input
    .trim()
    // Keep paths safe on Windows/macOS/Linux
    .replace(/[<>:"/\\|?*]/g, '_') // NOSONAR
    .replace(/\s+/g, '-') // NOSONAR
    .slice(0, 80);
}

function getBrowserNameFromEnv(): BrowserName {
  const raw = (process.env.PW_BROWSER || process.env.PLAYWRIGHT_BROWSER || 'chromium').toLowerCase();
  if (raw === 'chromium' || raw === 'firefox' || raw === 'webkit') return raw;
  return 'chromium';
}

/**
 * NOTE on "future" devices:
 * Playwright only ships a fixed device list; the devices below are approximations
 * (viewports/UA) so we can still run consistent visual baselines.
 */
const customDeviceProfiles: Record<string, BrowserContextOptions> = {
  // Apple
  'iPhone 17 Pro Max': (devices['iPhone 15 Pro Max'] as BrowserContextOptions | undefined) ?? {
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  },
  'iPhone 17 Air': (devices['iPhone 15'] as BrowserContextOptions | undefined) ?? {
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  },
  'iPad Pro 13 in': (devices['iPad Pro 12.9'] as BrowserContextOptions | undefined) ??
    (devices['iPad Pro 11'] as BrowserContextOptions | undefined) ?? {
      viewport: { width: 1024, height: 1366 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
  'MacBook Air 15': {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
  } as BrowserContextOptions,

  // Android
  'Galaxy S25 Ultra': (devices['Galaxy S9+'] as BrowserContextOptions | undefined) ?? {
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  },
  'Galaxy Z Fold4': {
    viewport: { width: 344, height: 882 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; SM-F936B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  },

  // Gaming laptop / desktop-like
  'Zephyrus Duo 15 SE': {
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 },
  } as BrowserContextOptions,
};

function getDeviceNameFromEnv(): string {
  return process.env.PW_DEVICE || 'Desktop';
}

function getDeviceContextOptions(deviceName: string): BrowserContextOptions {
  // Prefer Playwright built-ins when the name exists.
  const builtin = (devices as Record<string, BrowserContextOptions>)[deviceName];
  if (builtin) return builtin;

  const custom = customDeviceProfiles[deviceName];
  if (custom) return custom;

  // Default to Desktop Chrome (stable baseline).
  return devices['Desktop Chrome'] as BrowserContextOptions;
}

export function getBddVisualProject(): BddVisualProject {
  const browserName = getBrowserNameFromEnv();
  const deviceName = getDeviceNameFromEnv();
  const platform = process.env.PW_PLATFORM || process.platform;

  const projectName = [
    sanitizePathSegment(platform),
    sanitizePathSegment(browserName),
    sanitizePathSegment(deviceName),
  ].join('__');

  return { browserName, deviceName, platform, projectName };
}

export type PlaywrightBddOptions = {
  baseURL: string;
  contextOptions: BrowserContextOptions;
  project: BddVisualProject;
};

function sanitizeContextOptionsForBrowser(
  browserName: BrowserName,
  options: BrowserContextOptions
): BrowserContextOptions {
  // Playwright limitation: Firefox does not support `isMobile`.
  // We still want to run “mobile-sized” viewports in Firefox, so we strip unsupported flags.
  if (browserName === 'firefox') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isMobile, hasTouch, deviceScaleFactor, ...rest } = options as BrowserContextOptions & {
      isMobile?: boolean;
      hasTouch?: boolean;
      deviceScaleFactor?: number;
    };
    return rest;
  }

  return options;
}

export function getPlaywrightOptions() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  const project = getBddVisualProject();
  const deviceOptions = getDeviceContextOptions(project.deviceName);

  // Shared configuration matching playwright.config.ts (as close as possible)
  const contextOptions: BrowserContextOptions = {
    ...deviceOptions,
    baseURL,
    // Reduce screenshot flakiness across runs (animations/fonts/timezone differences).
    // Note: not all options are honored by every browser equally.
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    // Match Playwright config settings
    // @ts-expect-error - trace option exists on BrowserContext in Playwright, but not always typed here.
    trace: 'on-first-retry',
  };

  return {
    baseURL,
    contextOptions: sanitizeContextOptionsForBrowser(project.browserName, contextOptions),
    project,
  } satisfies PlaywrightBddOptions;
}
