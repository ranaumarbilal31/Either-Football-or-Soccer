import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
process.env.NODE_ENV = 'production';
await import('../dist/server.cjs');
