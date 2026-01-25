/**
 * Central list of devices/browsers for BDD visual regression runs.
 *
 * Keep this list in-repo so CI can run a single command
 * (no device list duplication in GitHub Actions YAML).
 */
export const bddVisualBrowsers = ['chromium', 'firefox', 'webkit'] as const;

export const bddVisualDevices = [
  // Apple
  'iPhone 17 Pro Max',
  'iPhone 17 Air',
  'iPad Pro 13 in',
  'MacBook Air 15',

  // Android / others
  'Galaxy S25 Ultra',
  'Galaxy Z Fold4',
  'Zephyrus Duo 15 SE',
] as const;

export type BddVisualBrowser = (typeof bddVisualBrowsers)[number];
export type BddVisualDevice = (typeof bddVisualDevices)[number];

