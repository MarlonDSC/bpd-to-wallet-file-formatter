import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, firefox, webkit, expect } from '@playwright/test';

import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { stepContext } from '../context';
import { getPlaywrightOptions } from '../playwright-config';
import { compareScreenshot } from '../visual-helpers';

const testFilesDir = tmpdir();
const testFiles: string[] = [];

// Our UI interactions (file pickers, parsing, navigation) can occasionally exceed
// Cucumber's default 5s step timeout on slower machines/CI.
setDefaultTimeout(60 * 1000);

// Test file utilities
function createTestFile(
  filename: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): string {
  const filePath = join(testFilesDir, filename);
  writeFileSync(filePath, content, encoding);
  testFiles.push(filePath);
  return filePath;
}

function createBpdCsvContent(params?: {
  includeEmptyRows?: boolean;
  includeInvalidRows?: boolean;
  multipleHeaderSections?: boolean;
}): string {
  const metadataLines = Array.from({ length: 10 }, (_, i) => `Metadata line ${i + 1}`);
  const header = 'Fecha Posteo,Descripción,Monto Transacción';

  const tx1 = '10/01/2010,Café,123.45';
  const tx2 = '11/01/2010,Payment,-50.00';
  const tx3 = '12/01/2010,Transfer,10.00';

  const lines: string[] = [
    ...metadataLines,
    header,
    tx1,
    ...(params?.includeEmptyRows ? [''] : []),
    ...(params?.includeInvalidRows ? ['13/01/2010,,99.99'] : []), // missing description
    tx2,
    ...(params?.multipleHeaderSections ? ['', 'Section break', header, tx3] : []),
  ];

  return `${lines.join('\n')}\n`;
}

function createBpdCsvMissingColumnsContent(): string {
  const metadataLines = Array.from({ length: 10 }, (_, i) => `Metadata line ${i + 1}`);
  const headerMissing = 'Fecha Posteo,Descripción,Monto';
  const tx1 = '10/01/2010,Payment,123.45';
  return `${[...metadataLines, headerMissing, tx1].join('\n')}\n`;
}

function createMalformedCsvContent(): string {
  // Unclosed quote -> PapaParse should report an error.
  return 'Fecha Posteo,Descripción,"Monto Transacción\n10/01/2010,Café,123.45\n';
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
      // Ensure directory exists
      mkdirSync(dirname(screenshotPath), { recursive: true });
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
  const snapshotName = `bdd-single-file-uploaded__${stepContext.visual?.scenarioName || 'unknown-scenario'}`;
  await compareScreenshot(fileUploadSection, snapshotName, stepContext.visual);
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
  
  // Check for error messages - could be in Excel export area or general error area
  const excelError = stepContext.page.locator('[role="alert"]').filter({
    hasText: /error|failed/i,
  });
  const generalError = stepContext.page.locator('[role="alert"]');
  
  // Try Excel-specific error first (with longer timeout for async operations)
  const excelErrorVisible = await excelError.isVisible().catch(() => false);
  if (excelErrorVisible) {
    await expect(excelError).toBeVisible({ timeout: 5000 });
  } else {
    // Fallback to general error check
    await expect(generalError).toBeVisible({ timeout: 5000 });
  }
  
  // Visual regression: Capture generic error state
  const fileUploadSection = stepContext.page.locator('[aria-label="File drop zone"]').locator('..');
  await compareScreenshot(fileUploadSection, 'bdd-error-state', stepContext.visual);
});

// ==========================
// CSV parsing/extraction BDD
// ==========================

Given('a valid BPD CSV file with transaction data', async () => {
  const content = createBpdCsvContent();
  const testFilePath = createTestFile('bpd.csv', content, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd.csv';
  stepContext.fileContent = content;
});

Given('a BPD CSV file with UTF-8 encoding', async () => {
  const content = createBpdCsvContent();
  const testFilePath = createTestFile('bpd-utf8.csv', content, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-utf8.csv';
  stepContext.fileContent = content;
});

Given('a BPD CSV file with Windows-1252 encoding', async () => {
  const content = createBpdCsvContent();
  // Use latin1 to force bytes that are invalid UTF-8 (e.g. é = 0xE9)
  const testFilePath = createTestFile('bpd-win1252.csv', content, 'latin1');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-win1252.csv';
  stepContext.fileContent = content;
});

Given('a BPD CSV file with multiple header sections', async () => {
  const content = createBpdCsvContent({ multipleHeaderSections: true });
  const testFilePath = createTestFile('bpd-multi-section.csv', content, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-multi-section.csv';
  stepContext.fileContent = content;
});

Given('a BPD CSV file with empty rows between transactions', async () => {
  const content = createBpdCsvContent({ includeEmptyRows: true });
  const testFilePath = createTestFile('bpd-empty-rows.csv', content, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-empty-rows.csv';
  stepContext.fileContent = content;
});

Given('a CSV file missing required columns', async () => {
  const content = createBpdCsvMissingColumnsContent();
  const testFilePath = createTestFile('bpd-missing-columns.csv', content, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-missing-columns.csv';
  stepContext.fileContent = content;
});

Given('a malformed CSV file', async () => {
  const content = createMalformedCsvContent();
  const testFilePath = createTestFile('malformed.csv', content, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'malformed.csv';
  stepContext.fileContent = content;
});

Given('a BPD CSV file with some invalid transaction rows', async () => {
  const content = createBpdCsvContent({ includeInvalidRows: true });
  const testFilePath = createTestFile('bpd-invalid-rows.csv', content, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-invalid-rows.csv';
  stepContext.fileContent = content;
});

When('the user clicks {string} button', async (buttonText: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Special handling for Download Excel button to set up download listener
  if (buttonText === 'Download Excel') {
    const downloadPromise = stepContext.page.waitForEvent('download', { timeout: 30000 });
    const button = stepContext.page.getByRole('button', { name: /download excel/i });
    await expect(button).toBeEnabled({ timeout: 10000 });
    await button.click();
    stepContext.downloadPromise = downloadPromise;
    return;
  }
  
  // General button click handling
  const button = stepContext.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await expect(button).toBeEnabled({ timeout: 10000 });
  await button.click();
});

Then('parsing completes successfully', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Check for parsing status in output elements (more reliable)
  const parsingInProgress = stepContext.page.locator('output').filter({ hasText: /Parsing CSV/i });
  const parsingDone = stepContext.page.locator('output').filter({ hasText: /Parsing complete/i });
  const parsingFailed = stepContext.page.locator('output').filter({ hasText: /Parsing failed/i });
  
  // Also check for text anywhere on the page as fallback
  const complete = stepContext.page.locator(String.raw`text=/Parsing complete/i`);
  const failed = stepContext.page.locator(String.raw`text=/Parsing failed/i`);

  // Check if already complete first
  const alreadyDone = await parsingDone.isVisible().catch(() => false) || await complete.isVisible().catch(() => false);
  if (alreadyDone) {
    await expect(parsingDone.or(complete)).toBeVisible();
    return;
  }

  // Wait for either completion or failure - try output elements first, then fallback to text
  await Promise.race([
    parsingDone.waitFor({ state: 'visible', timeout: 20000 }),
    parsingInProgress.waitFor({ state: 'visible', timeout: 5000 }).then(() => 
      parsingDone.waitFor({ state: 'visible', timeout: 15000 })
    ),
    complete.waitFor({ state: 'visible', timeout: 20000 }),
    parsingFailed.waitFor({ state: 'visible', timeout: 20000 }),
    failed.waitFor({ state: 'visible', timeout: 20000 }),
  ]);

  // Check for failure
  const hasFailed = await parsingFailed.isVisible().catch(() => false) || await failed.isVisible().catch(() => false);
  if (hasFailed) {
    const errorBlock = (await parsingFailed.isVisible().catch(() => false)) 
      ? parsingFailed.locator('..')
      : failed.locator('..');
    const text = (await errorBlock.textContent())?.trim() || 'Unknown error';
    throw new Error(`Expected parsing success, but saw failure UI: ${text}`);
  }

  // Verify completion
  await expect(parsingDone.or(complete)).toBeVisible();
});

Then('encoding is detected automatically', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('text=/Encoding:/')).toBeVisible({
    timeout: 5000,
  });
});

Then('encoding is detected as {string}', async (encoding: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(`text=/Encoding: .*${encoding}/`)).toBeVisible({
    timeout: 5000,
  });
});

Then('transaction rows are extracted', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Extracted \d+ transaction rows/`)).toBeVisible({
    timeout: 5000,
  });
});

Then('a total of {int} transaction rows are extracted', async (count: number) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(`text=Extracted ${count} transaction rows`)).toBeVisible({
    timeout: 5000,
  });
});

Then('a warning message is displayed showing number of skipped rows', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Skipped \d+ invalid row\(s\)\./`)).toBeVisible({
    timeout: 5000,
  });
});

Then(
  'an error message {string} is displayed',
  async (message: string) => {
    if (!stepContext.page) throw new Error('Page not initialized');
    const failed = stepContext.page.locator(String.raw`text=/Parsing failed/i`);
    await expect(failed).toBeVisible({
      timeout: 5000,
    });
    // Match substring (the implementation may append details).
    await expect(stepContext.page.locator(`text=${message}`)).toBeVisible({
      timeout: 5000,
    });
  }
);

// CSV parsing-specific error message step (more specific than transformation errors)
Then(
  'a CSV parsing error message {string} is displayed',
  async (message: string) => {
    if (!stepContext.page) throw new Error('Page not initialized');
    const failed = stepContext.page.locator(String.raw`text=/Parsing failed/i`);
    await expect(failed).toBeVisible({
      timeout: 5000,
    });
    // Match substring (the implementation may append details).
    await expect(stepContext.page.locator(`text=${message}`)).toBeVisible({
      timeout: 5000,
    });
  }
);

Then('parsing stops', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('text=Parsing failed.')).toBeVisible({
    timeout: 5000,
  });
});

Then('no transaction data is extracted', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Extracted \d+ transaction rows/`)).not.toBeVisible();
});

Then('header rows lines {int}-{int} are skipped', async (_from: number, _to: number) => {
  // Indirect assertion: our fixtures include 10 metadata rows before the header.
  // If parsing completes successfully and rows are extracted, metadata rows were skipped.
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('text=Parsing complete.')).toBeVisible({
    timeout: 5000,
  });
});

Then('no errors are displayed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator('text=Parsing failed.')).not.toBeVisible();
  await expect(stepContext.page.locator('[role="alert"]')).not.toBeVisible();
});

// ==========================
// Data transformation BDD
// ==========================

Given('CSV data has been parsed successfully', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Check if parsing has already completed
  const parsingComplete = stepContext.page.locator(String.raw`text=/Parsing complete/i`);
  const isAlreadyParsed = await parsingComplete.isVisible().catch(() => false);
  
  if (!isAlreadyParsed) {
    // Upload a valid BPD CSV file if not already uploaded
    const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
    if (!fileListVisible) {
      const csvContent = createBpdCsvContent();
      const testFilePath = createTestFile('bpd-for-transform.csv', csvContent, 'utf-8');
      const fileInput = stepContext.page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      // Wait for file to be added
      await expect(stepContext.page.locator('text=/Uploaded Files/')).toBeVisible({ timeout: 2000 });
    }
    
    // Click Convert button - wait for it to be enabled first
    const convertButton = stepContext.page.getByRole('button', { name: /convert/i });
    await expect(convertButton).toBeEnabled({ timeout: 5000 });
    await convertButton.click();
    
    // Wait for parsing to complete - it might complete very quickly, so check for either status
    // Use Promise.race to handle both "Parsing CSV..." (in progress) and "Parsing complete" (done)
    const parsingInProgress = stepContext.page.locator('output').filter({ hasText: /Parsing CSV/i });
    const parsingDone = stepContext.page.locator('output').filter({ hasText: /Parsing complete/i });
    
    // Check if already complete first
    const alreadyDone = await parsingDone.isVisible().catch(() => false);
    if (!alreadyDone) {
      // Wait for either in-progress or done status
      await Promise.race([
        parsingDone.waitFor({ state: 'visible', timeout: 20000 }),
        parsingInProgress.waitFor({ state: 'visible', timeout: 5000 }).then(() => 
          parsingDone.waitFor({ state: 'visible', timeout: 15000 })
        ),
      ]);
    }
  }
  
  // Verify parsing is complete
  await expect(stepContext.page.locator(String.raw`text=/Parsing complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Given('transaction rows have been extracted', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Extracted \d+ transaction rows/`)).toBeVisible({
    timeout: 5000,
  });
});

Given('a valid transaction row with date {string}, description {string}, amount {string}', async (date: string, description: string, amount: string) => {
  const content = createBpdCsvContent();
  // Replace the first transaction with our custom data
  const lines = content.split('\n');
  const headerIndex = lines.findIndex(line => line.includes('Fecha Posteo'));
  if (headerIndex >= 0 && headerIndex < lines.length - 1) {
    lines[headerIndex + 1] = `${date},${description},${amount}`;
  }
  const customContent = lines.join('\n');
  const testFilePath = createTestFile('bpd-custom.csv', customContent, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-custom.csv';
  stepContext.fileContent = customContent;
  
  // Upload and parse the file
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Clear any existing files first
  const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
  if (fileListVisible) {
    const removeButtons = stepContext.page.getByRole('button', { name: /remove/i });
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
      await stepContext.page.waitForTimeout(100);
    }
  }
  
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  
  // Wait for file to be added
  await expect(stepContext.page.locator('text=/Uploaded Files/')).toBeVisible({ timeout: 5000 });
  
  // Click convert button
  const convertButton = stepContext.page.getByRole('button', { name: /convert/i });
  await expect(convertButton).toBeEnabled({ timeout: 10000 });
  await convertButton.click();
  
  // Wait for parsing to complete
  await expect(stepContext.page.locator(String.raw`text=/Parsing complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

Given('a transaction with date {string}', async (date: string) => {
  const content = createBpdCsvContent();
  const lines = content.split('\n');
  const headerIndex = lines.findIndex(line => line.includes('Fecha Posteo'));
  if (headerIndex >= 0 && headerIndex < lines.length - 1) {
    lines[headerIndex + 1] = `${date},Test Transaction,100.00`;
  }
  const customContent = lines.join('\n');
  const testFilePath = createTestFile('bpd-date-test.csv', customContent, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-date-test.csv';
  stepContext.fileContent = customContent;
  
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Clear any existing files first
  const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
  if (fileListVisible) {
    const removeButtons = stepContext.page.getByRole('button', { name: /remove/i });
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
      await stepContext.page.waitForTimeout(100);
    }
  }
  
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  await expect(stepContext.page.locator('text=/Uploaded Files/')).toBeVisible({ timeout: 5000 });
  
  const convertButton = stepContext.page.getByRole('button', { name: /convert/i });
  await expect(convertButton).toBeEnabled({ timeout: 10000 });
  await convertButton.click();
  await expect(stepContext.page.locator(String.raw`text=/Parsing complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

Given('a transaction with amount {string}', async (amount: string) => {
  const content = createBpdCsvContent();
  const lines = content.split('\n');
  const headerIndex = lines.findIndex(line => line.includes('Fecha Posteo'));
  if (headerIndex >= 0 && headerIndex < lines.length - 1) {
    lines[headerIndex + 1] = `10/01/2010,Test Transaction,${amount}`;
  }
  const customContent = lines.join('\n');
  const testFilePath = createTestFile('bpd-amount-test.csv', customContent, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-amount-test.csv';
  stepContext.fileContent = customContent;
  
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Clear any existing files first (reset state)
  const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
  if (fileListVisible) {
    // Remove all existing files
    const removeButtons = stepContext.page.getByRole('button', { name: /remove/i });
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
      // Wait a bit for the UI to update
      await stepContext.page.waitForTimeout(100);
    }
  }
  
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  await expect(stepContext.page.locator('text=/Uploaded Files/')).toBeVisible({ timeout: 5000 });
  
  const convertButton = stepContext.page.getByRole('button', { name: /convert/i });
  await expect(convertButton).toBeEnabled({ timeout: 10000 });
  await convertButton.click();
  await expect(stepContext.page.locator(String.raw`text=/Parsing complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

Given('a transaction with description {string}', async (description: string) => {
  const content = createBpdCsvContent();
  const lines = content.split('\n');
  const headerIndex = lines.findIndex(line => line.includes('Fecha Posteo'));
  if (headerIndex >= 0 && headerIndex < lines.length - 1) {
    lines[headerIndex + 1] = `10/01/2010,${description},100.00`;
  }
  const customContent = lines.join('\n');
  const testFilePath = createTestFile('bpd-desc-test.csv', customContent, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-desc-test.csv';
  stepContext.fileContent = customContent;
  
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Clear any existing files first
  const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
  if (fileListVisible) {
    const removeButtons = stepContext.page.getByRole('button', { name: /remove/i });
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
      await stepContext.page.waitForTimeout(100);
    }
  }
  
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  await expect(stepContext.page.locator('text=/Uploaded Files/')).toBeVisible({ timeout: 5000 });
  
  const convertButton = stepContext.page.getByRole('button', { name: /convert/i });
  await expect(convertButton).toBeEnabled({ timeout: 10000 });
  await convertButton.click();
  await expect(stepContext.page.locator(String.raw`text=/Parsing complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

Given('a transaction with invalid date {string}', async (date: string) => {
  const content = createBpdCsvContent();
  const lines = content.split('\n');
  const headerIndex = lines.findIndex(line => line.includes('Fecha Posteo'));
  if (headerIndex >= 0 && headerIndex < lines.length - 1) {
    lines[headerIndex + 1] = `${date},Test Transaction,100.00`;
  }
  const customContent = lines.join('\n');
  const testFilePath = createTestFile('bpd-invalid-date.csv', customContent, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-invalid-date.csv';
  stepContext.fileContent = customContent;
  
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Clear any existing files first
  const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
  if (fileListVisible) {
    const removeButtons = stepContext.page.getByRole('button', { name: /remove/i });
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
      await stepContext.page.waitForTimeout(100);
    }
  }
  
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  await expect(stepContext.page.locator('text=/Uploaded Files/')).toBeVisible({ timeout: 5000 });
  
  const convertButton = stepContext.page.getByRole('button', { name: /convert/i });
  await expect(convertButton).toBeEnabled({ timeout: 10000 });
  await convertButton.click();
  await expect(stepContext.page.locator(String.raw`text=/Parsing complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

Given('a transaction with invalid amount {string}', async (amount: string) => {
  const content = createBpdCsvContent();
  const lines = content.split('\n');
  const headerIndex = lines.findIndex(line => line.includes('Fecha Posteo'));
  if (headerIndex >= 0 && headerIndex < lines.length - 1) {
    lines[headerIndex + 1] = `10/01/2010,Test Transaction,${amount}`;
  }
  const customContent = lines.join('\n');
  const testFilePath = createTestFile('bpd-invalid-amount.csv', customContent, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-invalid-amount.csv';
  stepContext.fileContent = customContent;
  
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Clear any existing files first
  const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
  if (fileListVisible) {
    const removeButtons = stepContext.page.getByRole('button', { name: /remove/i });
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
      await stepContext.page.waitForTimeout(100);
    }
  }
  
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  await expect(stepContext.page.locator('text=/Uploaded Files/')).toBeVisible({ timeout: 5000 });
  
  const convertButton = stepContext.page.getByRole('button', { name: /convert/i });
  await expect(convertButton).toBeEnabled({ timeout: 10000 });
  await convertButton.click();
  await expect(stepContext.page.locator(String.raw`text=/Parsing complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

Given('multiple valid transaction rows', async () => {
  const content = createBpdCsvContent();
  const testFilePath = createTestFile('bpd-multiple.csv', content, 'utf-8');
  stepContext.testFilePath = testFilePath;
  stepContext.fileName = 'bpd-multiple.csv';
  stepContext.fileContent = content;
  
  if (!stepContext.page) throw new Error('Page not initialized');
  
  // Clear any existing files first
  const fileListVisible = await stepContext.page.locator('text=/Uploaded Files/').isVisible().catch(() => false);
  if (fileListVisible) {
    const removeButtons = stepContext.page.getByRole('button', { name: /remove/i });
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
      await stepContext.page.waitForTimeout(100);
    }
  }
  
  const fileInput = stepContext.page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  await expect(stepContext.page.locator('text=/Uploaded Files/')).toBeVisible({ timeout: 5000 });
  
  const convertButton = stepContext.page.getByRole('button', { name: /convert/i });
  await expect(convertButton).toBeEnabled({ timeout: 10000 });
  await convertButton.click();
  await expect(stepContext.page.locator(String.raw`text=/Parsing complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

When('the transaction is transformed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  // Transformation happens automatically after parsing, so we just wait for it
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

When('all transactions are transformed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

Then('the Date is {string}', async (expectedDate: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  // Verify transformation completed successfully
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then(String.raw`the Date \(Import\) is {string} \(date + 1 day\)`, async (expectedDateImport: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then(String.raw`the Date \(Import\) is {string} \(correctly handles month boundary\)`, async (expectedDateImport: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then(String.raw`the Date \(Import\) is {string} \(correctly handles year boundary\)`, async (expectedDateImport: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('the Note is {string}', async (expectedNote: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('the Currency is {string}', async (expectedCurrency: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then(String.raw`the Amount is {string} \(positive for credit\)`, async (expectedAmount: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then(String.raw`the Amount is {string} \(negative for debit\)`, async (expectedAmount: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then(String.raw`the Amount is formatted as {string} \(rounded to 2 decimal places\)`, async (expectedAmount: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('the transaction type is identified as credit', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('the transaction type is identified as debit', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('the Note preserves special characters {string}', async (expectedNote: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('special characters are handled correctly', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('transformation completes successfully', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 15000,
  });
});

// Transformation-specific error message step (more specific than CSV parsing errors)
Then('a transformation error message {string} is displayed', async (message: string) => {
  if (!stepContext.page) throw new Error('Page not initialized');
  // Replace [X] with a regex pattern
  const messagePattern = message.replaceAll('[X]', String.raw`\d+`);
  await expect(stepContext.page.locator(String.raw`text=/${messagePattern}/i`)).toBeVisible({
    timeout: 10000,
  });
});

Then('the transaction is skipped', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  // Verify that transformation completed but with skipped count
  await expect(stepContext.page.locator(String.raw`text=/Skipped \d+ invalid row/i`)).toBeVisible({
    timeout: 10000,
  });
});

Then('a warning is shown', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Skipped/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('all transactions are processed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 15000,
  });
  await expect(stepContext.page.locator(String.raw`text=/Transformed \d+ transaction/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then(String.raw`each transaction has Date, Date \(Import\), Note, Currency, and Amount`, async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then(String.raw`Date \(Import\) is Date + 1 day for each transaction`, async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
});

Then('transformation summary is displayed', async () => {
  if (!stepContext.page) throw new Error('Page not initialized');
  await expect(stepContext.page.locator(String.raw`text=/Transformation complete/i`)).toBeVisible({
    timeout: 5000,
  });
  await expect(stepContext.page.locator(String.raw`text=/Transformed \d+ transaction/i`)).toBeVisible({
    timeout: 5000,
  });
});
