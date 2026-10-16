/**
 * @astrojs/sitemap emits sitemap-index.xml + sitemap-0.xml. Production uses sitemap.xml (legacy URL).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const chunkPath = path.join(dist, 'sitemap-0.xml');
const outPath = path.join(dist, 'sitemap.xml');
const indexPath = path.join(dist, 'sitemap-index.xml');

try {
  await fs.access(chunkPath);
} catch {
  console.warn('finalize-sitemap: sitemap-0.xml not found, skipping');
  process.exit(0);
}

const extraChunks = (await fs.readdir(dist)).filter(
  (name) => /^sitemap-\d+\.xml$/.test(name) && name !== 'sitemap-0.xml',
);
if (extraChunks.length > 0) {
  console.error(
    'finalize-sitemap: multiple sitemap chunks detected; update this script before deploying.',
  );
  process.exit(1);
}

await fs.copyFile(chunkPath, outPath);
await fs.unlink(chunkPath);
await fs.unlink(indexPath).catch(() => {});

console.log('✓ sitemap → dist/sitemap.xml');
