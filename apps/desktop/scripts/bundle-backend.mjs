#!/usr/bin/env node
/**
 * Bundle the backend into a single server.mjs file for Tauri sidecar.
 * Also copies node.exe to the binaries directory with the correct platform suffix.
 */
import { build } from 'esbuild';
import { copyFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const BACKEND = resolve(ROOT, 'packages/backend');
const BINARIES = resolve(__dirname, '../src-tauri/binaries');

// Clean and recreate binaries directory (keep node.exe if already present to speed up builds)
import { rmSync } from 'fs';
const nmDir = resolve(BINARIES, 'node_modules');
const dbDir = resolve(BINARIES, 'db');
if (existsSync(nmDir)) rmSync(nmDir, { recursive: true, force: true });
if (existsSync(dbDir)) rmSync(dbDir, { recursive: true, force: true });
if (!existsSync(BINARIES)) mkdirSync(BINARIES, { recursive: true });

// 1. Build shared package first
console.log('[build] Building @crate/shared...');
execSync('npx pnpm --filter @crate/shared build', { cwd: ROOT, stdio: 'inherit' });

// 2. Bundle backend with esbuild
console.log('[build] Bundling backend with esbuild...');
await build({
  entryPoints: [resolve(BACKEND, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: resolve(BINARIES, 'server.mjs'),
  // External: native addons that must be shipped alongside + optional deps
  external: [
    'ioredis',
    'bullmq',
    // libsql has platform-specific native addons — must be external + copied
    '@libsql/client',
    'libsql',
  ],
  // Resolve workspace packages
  alias: {
    '@crate/shared': resolve(ROOT, 'packages/shared/dist'),
  },
  // CJS compat: some deps need require(). Provide it via createRequire.
  banner: {
    js: `import{createRequire as __cjsRequire}from'module';const require=__cjsRequire(import.meta.url);`,
  },
  define: {
    'process.env.QUEUE_BACKEND': '"memory"',
  },
});

console.log('[build] Backend bundled to binaries/server.mjs');

// 3. Determine platform triple for Tauri sidecar naming
const arch = process.arch === 'x64' ? 'x86_64' : process.arch === 'arm64' ? 'aarch64' : process.arch;
const platformMap = {
  win32: `${arch}-pc-windows-msvc`,
  darwin: `${arch}-apple-darwin`,
  linux: `${arch}-unknown-linux-gnu`,
};
const triple = platformMap[process.platform];
if (!triple) {
  console.error(`Unsupported platform: ${process.platform}`);
  process.exit(1);
}

// 4. Copy node.exe with the Tauri sidecar naming convention
const nodeExe = process.execPath;
const targetName = `node-${triple}${process.platform === 'win32' ? '.exe' : ''}`;
const targetPath = resolve(BINARIES, targetName);

console.log(`[build] Copying ${nodeExe} → ${targetName}`);
copyFileSync(nodeExe, targetPath);

// 5. Create a .env file for desktop mode
const envContent = `
QUEUE_BACKEND=memory
PORT=4242
DATABASE_URL=file:./crate.db
MIGRATIONS_PATH=./db/migrations
SPOTIFY_CLIENT_ID=${process.env.SPOTIFY_CLIENT_ID || ''}
SPOTIFY_CLIENT_SECRET=${process.env.SPOTIFY_CLIENT_SECRET || ''}
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4242/api/auth/spotify/callback-page
`.trim();

writeFileSync(resolve(BINARIES, '.env'), envContent);
console.log('[build] Created binaries/.env for desktop mode');

// 6. Copy @libsql native modules for the current platform
console.log('[build] Copying @libsql native modules...');
import { cpSync, readdirSync } from 'fs';

// Find the libsql packages in node_modules (handles pnpm hoisting)
// Only search the monorepo root and backend node_modules (avoid binaries/node_modules)
const nmPaths = [
  resolve(BACKEND, 'node_modules'),
  resolve(ROOT, 'node_modules'),
];

const libsqlPackages = ['@libsql/client', 'libsql'];

// Determine platform-specific native package name
const nativePackageMap = {
  'win32-x64': '@libsql/win32-x64-msvc',
  'darwin-x64': '@libsql/darwin-x64',
  'darwin-arm64': '@libsql/darwin-arm64',
  'linux-x64': '@libsql/linux-x64-gnu',
};
const nativePkg = nativePackageMap[`${process.platform}-${process.arch}`];
if (nativePkg) libsqlPackages.push(nativePkg);

const destNm = resolve(BINARIES, 'node_modules');
mkdirSync(destNm, { recursive: true });

for (const pkg of libsqlPackages) {
  for (const nmPath of nmPaths) {
    // Handle scoped packages
    const pkgDir = resolve(nmPath, pkg);
    if (existsSync(pkgDir)) {
      const destDir = resolve(destNm, pkg);
      mkdirSync(dirname(destDir), { recursive: true });
      cpSync(pkgDir, destDir, { recursive: true });
      console.log(`  Copied ${pkg}`);
      break;
    }
    // Also check pnpm virtual store
    const pnpmPath = resolve(nmPath, '.pnpm');
    if (existsSync(pnpmPath)) {
      // pnpm encodes scoped packages as @scope+name in directory names
      const pnpmPrefix = pkg.replace('/', '+');
      const entries = readdirSync(pnpmPath).filter(e => e.startsWith(pnpmPrefix));
      for (const entry of entries) {
        const nested = resolve(pnpmPath, entry, 'node_modules', pkg);
        if (existsSync(nested)) {
          const destDir = resolve(destNm, pkg);
          mkdirSync(dirname(destDir), { recursive: true });
          cpSync(nested, destDir, { recursive: true });
          console.log(`  Copied ${pkg} (from pnpm store)`);
          break;
        }
      }
    }
  }
}

// 7. Copy database migrations
console.log('[build] Copying database migrations...');
const migrationsDir = resolve(BACKEND, 'src/db/migrations');
const destMigrations = resolve(BINARIES, 'db/migrations');
if (existsSync(migrationsDir)) {
  cpSync(migrationsDir, destMigrations, { recursive: true });
  console.log('  Copied migrations to binaries/db/migrations/');
}

console.log('[build] Backend sidecar ready!');
