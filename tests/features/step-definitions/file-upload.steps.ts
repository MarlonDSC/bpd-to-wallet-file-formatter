import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { chromium, firefox, webkit, expect } from '@playwright/test';

import { writeFileSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { stepContext } from '../context';
import { getPlaywrightOptions } from '../playwright-config';
import { compareScreenshot } from '../visual-helpers';

const testFilesDir = tmpdir();
const testFiles: string[] = [];

// Test file utilities
function createTestFile(filename: string, content: string): string {
  const filePath = join(testFilesDir, filename);
  writeFileSync(filePath, content, 'utf-8');
  testFiles.push(filePath);
  return filePath;
}

function createLargeCsvFile(sizeInMB: number): string {
  const header = 'Date,Description,Amount\n';
  const row = '2024-01-01,Test Transaction,100.00\n';
  const rowSize = row.length;
  const targetSize = sizeInMB * 1024 * 1024;
  const rowsNeeded = Math.ceil((targetSize - header.length) / rowSize);
  
  let content = header;
  for (let i = 0; i < rowsNeeded; i++) {
    content += row;
  }
  
  const filename = `large-${sizeInMB}mb.csv`;
  return createTestFile(filename, content);
}

function cleanupTestFiles(): void {
  testFiles.forEach((filePath) => {
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore cleanup errors
    }
  });
  testFiles.length = 0;
}

Before(async (scenario) => {
  // Get Playwright configuration for consistency with E2E tests
  const options = getPlaywrightOptions();

  const browserName = options.project.browserName;
  const browserType = (() => {
    if (browserName === 'firefox') return firefox;
    if (browserName === 'webkit') return webkit;
    return chromium;
  })();

  const featureNameFromUri =
    scenario?.pickle?.uri ? basename(String(scenario.pickle.uri)).replace(/\.feature$/i, '') : 'unknown-feature';

  stepContext.visual = {
    featureName: featureNameFromUri,
    scenarioName: scenario?.pickle?.name || 'unknown-scenario',
    browserName: options.project.browserName,
    deviceName: options.project.deviceName,
    platform: options.project.platform,
    projectName: options.project.projectName,
  };
  
  // Launch browser with Playwright's recommended settings
  // Headless mode in CI, headed in local development (unless HEADED env var is set)
  stepContext.browser = await browserType.launch({
    headless: process.env.CI === 'true' || !process.env.HEADED,
  });
  
  // Create context with Playwright config options (viewport, userAgent, etc.)
  // This matches the settings from playwright.config.ts
  stepContext.context = await stepContext.browser.newContext(options.contextOptions);
  
  // Create page with Playwright's test-like isolation
  stepContext.page = await stepContext.context.newPage();
  
  // Set default timeouts to match Playwright's expectations (30 seconds)
  stepContext.page.setDefaultTimeout(30000);
  stepContext.page.setDefaultNavigationTimeout(30000);

  // Stabilize visual regression screenshots across runs:
  // - Disable CSS animations/transitions (including possible error-state transitions)
  // - Hide caret to avoid blinking cursor diffs
  await stepContext.page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
    `,
  });
});

After(async (scenario) => {
  // Take screenshot on failure (matches Playwright's screenshot: 'only-on-failure')
  if (stepContext.page && scenario.result?.status === 'FAILED') {
    try {
      const screenshotPath = `tests/screenshots/${scenario.pickle.name}-${Date.now()}.png`;
      await stepContext.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      console.log(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      // Ignore screenshot errors
      console.warn('Failed to take screenshot:', error);
    }
  }
  
  cleanupTestFiles();
  
  // Close context and browser (Playwright-style cleanup)
  if (stepContext.context) {
    await stepContext.context.close();
  }
  if (stepContext.browser) {
    await stepContext.browser.close();
  }
  
  // Reset context for next scenario
  Object.keys(stepContext).forEach((key) => {
    delete (stepContext as Record<string, unknown>)[key];
  });
});

// Background steps
Given('the application is loaded', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const options = getPlaywrightOptions();
  // Use baseURL from Playwright config for consistency
  await stepContext.page.goto(options.baseURL || '/');
});

Given('the user is on the converter page', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('h1')).toContainText('BPD to Wallet File Formatter');
  await expect(stepContext.page.locator('text=Upload BPD CSV Files')).toBeVisible();
  
  // Visual regression: Capture initial state
  const fileUploadSection = stepContext.page.locator('[aria-label="File drop zone"]').locator('..');
  await compareScreenshot(fileUploadSection, 'bdd-initial-state', stepContext.visual);
});

// Given steps
Given('the user has a valid CSV file', async () => {
  const csvContent = 'Date,Description,Amount\n2024-01-01,Test Transaction,100.00\n';
  const testFilePath = createTestFile('test.csv', csvContent);
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'test.csv';
  stepContext.fileContent = csvContent;
});

Given('the user has multiple valid CSV files', async () => {
  const csvContent1 = 'Date,Description,Amount\n2024-01-01,Transaction 1,100.00\n';
  const csvContent2 = 'Date,Description,Amount\n2024-01-02,Transaction 2,200.00\n';
  const csvContent3 = 'Date,Description,Amount\n2024-01-03,Transaction 3,300.00\n';
  
  const testFile1 = createTestFile('test1.csv', csvContent1);
  const testFile2 = createTestFile('test2.csv', csvContent2);
  const testFile3 = createTestFile('test3.csv', csvContent3);
  
  stepContext.testFiles = [testFile1, testFile2, testFile3];
  stepContext.fileNames = ['test1.csv', 'test2.csv', 'test3.csv'];
});

Given('the user has a non-CSV file', async () => {
  const txtContent = 'This is a text file, not a CSV file.';
  const testFilePath = createTestFile('test.txt', txtContent);
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'test.txt';
  stepContext.fileContent = txtContent;
});

Given('the user has a CSV file larger than 10MB', async () => {
  const largeFilePath = createLargeCsvFile(11); // 11MB file
  stepContext.testFilePath = largeFilePath;
  stepContext.fileName = 'large-11mb.csv';
});

Given('the user has uploaded a file', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const csvContent = 'Date,Description,Amount\n2024-01-01,Test Transaction,100.00\n';
  const testFilePath = createTestFile('uploaded-test.csv', csvContent);
  
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  
  stepContext.uploadedFileName = 'uploaded-test.csv';
});

Given('the file is displayed in the upload queue', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('text=Uploaded Files (1)')).toBeVisible();
  await expect(stepContext.page.locator(`text=${stepContext.uploadedFileName}`)).toBeVisible();
});

// When steps
When('the user clicks the {string} button', async (buttonText: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  if (buttonText === 'Choose Files') {
    stepContext.fileChooserPromise = stepContext.page.waitForEvent('filechooser');
    await stepContext.page.getByRole('button', { name: /choose files/i }).click();
  }
});

When('the user selects a CSV file', async () => {
  if (!stepContext.fileChooserPromise || !stepContext.testFilePath) throw new Error('File chooser or test file not initialized');
  const fileChooser = await stepContext.fileChooserPromise;
  await fileChooser.setFiles(stepContext.testFilePath);
});

When('the user selects multiple CSV files', async () => {
  if (!stepContext.fileChooserPromise || !stepContext.testFiles) throw new Error('File chooser or test files not initialized');
  const fileChooser = await stepContext.fileChooserPromise;
  await fileChooser.setFiles(stepContext.testFiles);
});

When('the user drags the file over the drop zone', async () => {
  // Manual test - implementation to be built as specified in feature file
});

When('the user drops the file', async () => {
  // Manual test - implementation to be built as specified in feature file
});

When('the user attempts to upload the file', async () => {
  if (!stepContext.page || !stepContext.testFilePath) throw new Error('Page or test file not initialized');
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(stepContext.testFilePath);
});

When('the user clicks the {string} button next to the file', async (buttonText: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  if (buttonText === 'Remove') {
    const removeButton = stepContext.page.getByRole('button', { name: /remove/i }).first();
    await removeButton.click();
  }
});

// Then steps
Then('the file is added to the upload queue', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('text=Uploaded Files (1)')).toBeVisible({ timeout: 2000 });
  
  // Visual regression: Capture state with single file
  const fileUploadSection = stepContext.page.locator('[aria-label="File drop zone"]').locator('..');
  await compareScreenshot(fileUploadSection, 'bdd-single-file-uploaded', stepContext.visual);
});

Then('the file name is displayed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const fileName = stepContext.fileName || stepContext.uploadedFileName || 'test.csv';
  await expect(stepContext.page.locator(`text=${fileName}`)).toBeVisible();
});

Then('the file size is displayed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const fileItem = stepContext.page.locator('li').filter({ hasText: stepContext.fileName || 'test.csv' });
  await expect(fileItem.locator(String.raw`text=/\d+(\.\d+)? (B|KB|MB)/`)).toBeVisible();
  
  // Visual regression: Capture file list item
  await compareScreenshot(fileItem, 'bdd-file-list-item', stepContext.visual);
});

Then('no error messages are shown', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('[role="alert"]')).not.toBeVisible();
});

Then('all files are added to the upload queue', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('text=Uploaded Files (3)')).toBeVisible({ timeout: 2000 });
  
  // Visual regression: Capture state with multiple files
  const fileUploadSection = stepContext.page.locator('[aria-label="File drop zone"]').locator('..');
  await compareScreenshot(fileUploadSection, 'bdd-multiple-files-uploaded', stepContext.visual);
});

Then('all file names are displayed in a list', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const fileNames = stepContext.fileNames || ['test1.csv', 'test2.csv', 'test3.csv'];
  for (const fileName of fileNames) {
    await expect(stepContext.page.locator(`text=${fileName}`)).toBeVisible();
  }
});

Then('the file count is shown', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const fileListTitle = stepContext.page.locator(String.raw`text=/Uploaded Files \(3\)/`);
  await expect(fileListTitle).toBeVisible();
});

Then('the drop zone is highlighted', async () => {
  // Manual test - implementation to be built as specified in feature file
});

Then('visual feedback is shown', async () => {
  // Manual test - implementation to be built as specified in feature file
});

Then('the file is removed from the upload queue', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const fileName = stepContext.uploadedFileName || 'uploaded-test.csv';
  await expect(stepContext.page.locator(`text=${fileName}`)).not.toBeVisible();
});

Then('the file list is updated', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('text=/Uploaded Files/')).not.toBeVisible();
  
  // Visual regression: Capture state after file removal
  const fileUploadSection = stepContext.page.locator('[aria-label="File drop zone"]').locator('..');
  await compareScreenshot(fileUploadSection, 'bdd-after-file-removal', stepContext.visual);
});

Then('an error message about invalid file type is displayed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const errorContainer = stepContext.page.locator('[role="alert"]');
  await expect(errorContainer).toBeVisible({ timeout: 2000 });
  const errorText = await errorContainer.textContent();
  expect(errorText).toMatch(/csv|invalid|file type/i);
  
  // Visual regression: Capture error state for invalid file type
  const fileUploadSection = stepContext.page.locator('[aria-label="File drop zone"]').locator('..');
  // Firefox can have slightly different font/AA rendering, allow more pixel diff for this state.
  const maxDiffPixels = stepContext.visual?.browserName === 'firefox' ? 2000 : 100;
  await compareScreenshot(fileUploadSection, 'bdd-error-invalid-file-type', {
    ...stepContext.visual,
    maxDiffPixels,
  });
});

Then('the file is not added to the upload queue', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const fileName = stepContext.fileName || 'test.txt';
  await expect(stepContext.page.locator(`text=${fileName}`)).not.toBeVisible();
  const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
  expect(fileListVisible).toBe(false);
});

Then('the error message is highlighted', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const errorContainer = stepContext.page.locator('[role="alert"]');
  await expect(errorContainer).toHaveClass(/error/);
});

Then('an error message about file size limit is displayed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const errorContainer = stepContext.page.locator('[role="alert"]');
  await expect(errorContainer).toBeVisible({ timeout: 5000 });
  const errorText = await errorContainer.textContent();
  expect(errorText).toMatch(/10MB|size|exceeds|limit|too large/i);
  
  // Visual regression: Capture error state for file too large
  const fileUploadSection = stepContext.page.locator('[aria-label="File drop zone"]').locator('..');
  await compareScreenshot(fileUploadSection, 'bdd-error-file-too-large', stepContext.visual);
});

Then('the drop zone shows an error state', async () => {
  // Manual test - implementation to be built as specified in feature file
});

Then('an error message is displayed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  const errorContainer = stepContext.page.locator('[role="alert"]');
  await expect(errorContainer).toBeVisible({ timeout: 2000 });
  
  // Visual regression: Capture generic error state
  const fileUploadSection = stepContext.page.locator('[aria-label="File drop zone"]').locator('..');
  await compareScreenshot(fileUploadSection, 'bdd-error-state', stepContext.visual);
});
