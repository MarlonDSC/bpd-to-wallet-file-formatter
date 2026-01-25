/**
 * ESM loader registration for Cucumber.js with TypeScript
 */

import { register } from 'ts-node';

register({
  transpileOnly: true,
  compilerOptions: {
    module: 'ESNext',
    moduleResolution: 'node',
    esModuleInterop: true,
  },
});
