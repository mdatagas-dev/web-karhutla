import { defineConfig } from 'vitest/config';

/**
 * The unit tests cover the pure parts of the app: the scene model, the frame
 * buffer and the tier ladder. They need neither a DOM nor the React plugin, so
 * they run in a plain node environment.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/content/**', 'src/stage/frameBuffer.ts', 'src/stage/tiers.ts'],
    },
  },
});
