/**
 * Cucumber.js configuration for Playwright integration
 */

export default {
  default: {
    require: [
      'tests/features/step-definitions/**/*.ts',
    ],
    requireModule: ['ts-node/esm'],
    format: [
      '@cucumber/pretty-formatter',
      'json:tests/reports/cucumber-report.json',
      'html:tests/reports/cucumber-report.html',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    publishQuiet: true,
    tags: process.env.CUCUMBER_TAGS || '',
    paths: ['tests/features/**/*.feature'],
  },
};
