/**
 * Cucumber.js configuration file
 * Using .cjs extension for CommonJS compatibility
 */

module.exports = {
  default: {
    import: ['tests/features/step-definitions/**/*.ts'],
    loader: ['ts-node/esm'],
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
