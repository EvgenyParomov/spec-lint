import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  target: 'es2024',
  dts: true,
  clean: true,
  sourcemap: true,
});
