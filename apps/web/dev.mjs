import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
process.argv = [process.argv[0], nextBin, 'dev', '--port', '3000'];
await import(nextBin);
