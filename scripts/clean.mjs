import { rmSync } from 'node:fs';
// Fixed project-relative build outputs only.
rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
