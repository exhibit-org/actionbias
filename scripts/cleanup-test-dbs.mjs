import { readdirSync, rmSync } from 'fs';
import { join } from 'path';

export default async function globalTeardown() {
  const cwd = process.cwd();
  const entries = readdirSync(cwd, { withFileTypes: true });
  const patterns = [
    /^\.pglite-adapter-test/,
    /^custom-adapter-test/,
    /^\.pglite-.*-test/,
    /^\.pglite-test-/,
    /^\.pglite$/
  ];

  for (const entry of entries) {
    if (entry.isDirectory() && patterns.some((p) => p.test(entry.name))) {
      try {
        rmSync(join(cwd, entry.name), { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${entry.name}`);
      } catch (err) {
        console.warn(`Failed to remove ${entry.name}:`, err);
      }
    }
  }
}
