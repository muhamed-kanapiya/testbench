import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/testbench';
if (basePath && !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('Use an empty base path or one path segment, e.g. /testbench.');
const staging = await mkdtemp(path.join(root, '.pages-build-'));
const output = path.join(root, 'out');

async function removeBuildDirectory(target) {
  const absolute = path.resolve(target);
  if (path.dirname(absolute) !== root || (absolute !== output && !path.basename(absolute).startsWith('.pages-build-'))) throw new Error('Refusing to remove a path outside the build workspace.');
  await rm(absolute, { recursive: true, force: true });
}
try {
  // An isolated copy keeps the running local API/dev server intact. Never copy .env files.
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts']) await cp(path.join(root, file), path.join(staging, file));
  await cp(path.join(root, 'public'), path.join(staging, 'public'), { recursive: true });
  await cp(path.join(root, 'src'), path.join(staging, 'src'), { recursive: true, filter: src => src !== path.join(root, 'src/app/api') && src !== path.join(root, 'src/lib/meta.ts') });
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', staging, '--webpack'], {
    cwd: root, stdio: 'inherit', env: { ...process.env, MODEL_API_KEY: '', TESTBENCH_STATIC_EXPORT: '1', NEXT_PUBLIC_DEMO_MODE: 'true', NEXT_PUBLIC_BASE_PATH: basePath, NEXT_TELEMETRY_DISABLED: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Static demo build failed.');
  const built = path.join(staging, 'out');
  const entries = await readdir(built);
  if (!entries.includes('index.html') || !entries.includes('studio') || entries.includes('api')) throw new Error('Unexpected static export routes.');
  const html = await readFile(path.join(built, 'studio/index.html'), 'utf8');
  if (!html.includes('Demo workspace') || !html.includes(basePath + '/assets/product.png')) throw new Error('Demo mode or asset paths were not compiled correctly.');
  await removeBuildDirectory(output);
  await cp(built, output, { recursive: true });
  await writeFile(path.join(output, '.nojekyll'), '');
  console.log(`Static demo ready in out/ at ${basePath || '/'}. No API routes or credentials are included.`);
} finally {
  await removeBuildDirectory(staging);
}
