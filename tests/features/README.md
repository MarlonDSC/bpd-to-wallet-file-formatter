# BDD Tests with Cucumber.js

This directory contains Behavior-Driven Development (BDD) tests using Gherkin feature files and Cucumber.js.

## Structure

```
tests/features/
├── file-upload.feature          # Gherkin feature file with scenarios
├── step-definitions/            # Step definition implementations
│   └── file-upload.steps.ts     # TypeScript step definitions
├── __screenshots__/             # Visual baselines (committed) + diffs/actual (ignored)
├── tsconfig.json                # TypeScript configuration for features
└── README.md                    # This file
```

## Running BDD Tests

**Important:** Make sure the development server is running before executing BDD tests:

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run BDD tests
npm run test:bdd
```

### Available Commands

```bash
# Run all BDD tests (excluding @manual tests)
npm run test:bdd -- --tags "not @manual"

# Run all BDD tests including manual tests
npm run test:bdd

# Run with specific tags (e.g., only smoke tests)
npm run test:bdd -- --tags "@smoke"

# Run with multiple tags
npm run test:bdd -- --tags "@success and not @validation"

# Run only manual tests (for local testing)
npm run test:bdd -- --tags "@manual"

# Dry run (check if all steps are defined without executing)
npm run test:bdd -- --dry-run

# Run specific feature file
npm run test:bdd -- tests/features/file-upload.feature
```

**Note:** Cucumber.js doesn't support `--watch` mode. For continuous testing, use the regular Playwright E2E tests with `npm run test:e2e` which supports watch mode.

### Test Tags

- `@success` - Successful scenarios
- `@failure` - Failure/error scenarios
- `@validation` - Validation-related scenarios
- `@smoke` - Critical smoke tests
- `@manual` - Tests that require manual verification or are difficult to automate reliably (e.g., drag-and-drop with files)

**CI Behavior:** The CI pipeline automatically excludes `@manual` tagged tests using `--tags "not @manual"`. These tests should be run manually during development and before releases.

**Manual Tests:** The following scenarios are tagged as `@manual` due to the complexity of simulating drag-and-drop file operations:
- "Upload file via drag-and-drop" - Requires complex file drag simulation
- "Drag non-CSV file" - Requires drag-and-drop error state validation

These tests can still be run locally with: `npm run test:bdd -- --tags "@manual"`

## Feature Files

Feature files (`.feature`) contain Gherkin syntax scenarios that describe the behavior of the application in plain language. These are written by product owners, business analysts, or developers in collaboration with stakeholders.

## Step Definitions

Step definitions (`.steps.ts`) contain the actual test code that implements each step in the feature files. They use Playwright to interact with the browser and verify the expected behavior.

## Current Status

The BDD test infrastructure is set up with:
- ✅ Cucumber.js installed and configured
- ✅ Feature file created (`file-upload.feature`)
- ✅ Step definitions created (`file-upload.steps.ts`)
- ✅ ESM/CommonJS module compatibility issue resolved (using `tsx`)
- ✅ All 7 scenarios and 55 steps recognized and working
- ✅ CI integration configured (excludes `@manual` tests)
- ✅ **Playwright integration** - Uses Playwright's configuration and best practices
- ✅ **Screenshot support** - Automatic screenshots on test failures
- ✅ **Consistent settings** - Matches E2E test configuration (baseURL, viewport, etc.)

## Playwright Integration

The BDD tests are fully integrated with Playwright:

- **Configuration**: Uses shared Playwright settings via `tests/features/playwright-config.ts` (baseURL + device profile)
- **Browser Management**: Supports `chromium`, `firefox`, `webkit` via env (`PW_BROWSER`)
- **Screenshots**: Automatic screenshots on test failures (saved to `tests/screenshots/`)
- **Timeouts**: Uses Playwright's default timeout settings (30 seconds)
- **Consistency**: Same browser settings as E2E tests for consistent behavior
- **Visual Regression Testing**: BDD tests include visual assertions using a custom `compareScreenshot()` helper (pixelmatch)

The integration is handled through `playwright-config.ts`, which ensures BDD tests use the same configuration as the E2E tests.

### Visual Regression in BDD Tests

The BDD step definitions include visual regression assertions that capture screenshots at key points:
- ✅ Initial state (empty drop zone)
- ✅ Single file uploaded state
- ✅ Multiple files uploaded state
- ✅ File list item appearance
- ✅ Error states (invalid file type, file too large)
- ✅ State after file removal

This means you don't need separate visual regression tests - the BDD scenarios verify both behavior AND visual appearance!

**Updating Visual Snapshots:**
```bash
# Option A (recommended): update baselines automatically
npm run test:bdd:matrix:update-snapshots

# Option B: delete specific snapshot file(s) from tests/features/__screenshots__/ and re-run
npm run test:bdd -- --tags "not @manual"
```

Visual snapshots are stored in `tests/features/__screenshots__/` and are committed to version control.

### Running the full visual matrix (one command)

To run all configured browser/device combinations (same command CI uses):

```bash
npm run test:bdd:matrix
```

To run a subset:

```bash
PW_BROWSERS="chromium,webkit" PW_DEVICES="MacBook Air 15,iPhone 17 Pro Max" npm run test:bdd:matrix
```

**Note:** The visual comparison uses `pixelmatch` (same library Playwright uses internally) for pixel-level comparison. Since `toHaveScreenshot()` requires Playwright's test context (not available in Cucumber.js), we use a custom `compareScreenshot()` helper that:
- Takes screenshots using `page.screenshot()`
- Compares them using `pixelmatch` (same algorithm as Playwright)
- Automatically creates baselines on first run
- Generates diff images when mismatches occur

## Notes

The project uses ES modules (`"type": "module"` in package.json), which requires special configuration for Cucumber.js with TypeScript. The step definitions are written in TypeScript and use Playwright for browser automation.

**Playwright Fixtures**: While Cucumber.js doesn't natively support Playwright's test fixtures, we've implemented a similar pattern using:
- Shared configuration (`playwright-config.ts`)
- Proper browser lifecycle management in `Before`/`After` hooks
- Context isolation per scenario

## Alternative: TypeScript BDD-style Tests

If you prefer to keep using the existing TypeScript BDD-style tests (in `tests/e2e/file-upload.spec.ts`), those are fully functional and follow BDD principles with Given-When-Then structure in comments, even without Gherkin feature files.
