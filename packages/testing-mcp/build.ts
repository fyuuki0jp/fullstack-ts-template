import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

async function build() {
  const outdir = 'dist';
  
  // Clean dist directory
  await fs.rm(outdir, { recursive: true, force: true });
  await fs.mkdir(outdir, { recursive: true });

  // Build the main entry point
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outdir,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    sourcemap: true,
    external: ['@modelcontextprotocol/sdk'],
    banner: {
      js: `#!/usr/bin/env node`,
    },
  });

  // Make the output executable
  const outputPath = path.join(outdir, 'index.js');
  await fs.chmod(outputPath, 0o755);
  
  console.log('Build completed successfully');
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});