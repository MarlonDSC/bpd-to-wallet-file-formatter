/**
 * Shared context for Cucumber steps
 * Using a simple object instead of World constructor to avoid ESM issues
 */

import { Page, Browser, BrowserContext } from '@playwright/test';

export interface StepContext {
  page?: Page;
  browser?: Browser;
  context?: BrowserContext;
  visual?: {
    featureName: string;
    scenarioName: string;
    browserName: string;
    deviceName: string;
    platform: string;
    projectName: string;
  };
  testFilePath?: string;
  testFiles?: string[];
  fileName?: string;
  fileNames?: string[];
  fileContent?: string;
  uploadedFileName?: string;
  fileChooserPromise?: Promise<{ setFiles: (files: string | string[]) => Promise<void> }>;
  dropZone?: { dispatchEvent: (event: string) => Promise<void> };
}

// Global context object shared across all steps
export const stepContext: StepContext = {};
