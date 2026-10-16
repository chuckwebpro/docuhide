/**
 * Rewrite absolute URLs in static files copied to dist for the build origin.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ORIGIN = 'https://www.docuhide.com';
const origin = (process.env.SITE_URL || DEFAULT_ORIGIN).replace(/\/$/, '');

if (origin === DEFAULT_ORIGIN) {
  process.exit(0);
}

const distLlms = path.join('dist', 'llms.txt');
try {
  let llms = await fs.readFile(distLlms, 'utf8');
  llms = llms.replaceAll(DEFAULT_ORIGIN, origin);
  await fs.writeFile(distLlms, llms);
  console.log(`✓ llms.txt → ${origin}`);
} catch {
  /* llms optional */
}
