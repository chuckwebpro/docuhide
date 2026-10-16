/**
 * Download DocuHide assets from production, resize to max 1920px width, emit WebP.
 * Logos/product PNGs: keep PNG + generate WebP for markup; photos become WebP primary.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { fetchLiveBuffer, fetchLiveText } from './lib/fetch-live.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MAX_WIDTH = 1920;

const PAGES = [
  '/',
  '/solutions/',
  '/news/',
  '/article/atlassian-data-leak-part-1/',
  '/article/atlassian-data-leak-part-2/',
  '/article/avemaria-info-stealer-infect-more-users/',
  '/article/critical-windows-snipping-tool-vulnerability/',
  '/article/data-breaches-in-2022-and-2023/',
  '/article/dropbox-breech--who-s-next/',
  '/article/google-pixel-flaw-allowed-recovery-of-redacted-images/',
  '/article/microsoft-baffled-how-hackers-stole-azure-ad-signing-key/',
  '/article/north-korean-ransomware-attacks-on-healthcare-/',
  '/article/document-security-and-redaction/',
];

const EXTRA_PATHS = ['/favicon/favicon.ico', '/images/og.jpg'];

const KEEP_PNG = new Set([
  '/images/logo-main.png',
  '/images/uploads/docuhide-complete.png',
  '/images/uploads/docuhide-milspec.png',
  '/images/uploads/docuhide-lite.png',
  '/images/uploads/icon-hero-large.png',
  '/images/uploads/doc-hero-large.png',
  '/images/uploads/big-box.png',
]);

function extractAssetPaths(html, cssText = '') {
  const combined = html + cssText;
  const paths = new Set();
  const re =
    /(?:\/images\/[^\s"'<>)]+\.(?:png|jpe?g|gif|webp|svg|ico)|\/favicon\/[^\s"'<>)]+\.(?:ico|png))/gi;
  for (const m of combined.matchAll(re)) {
    let p = m[0].split('?')[0];
    if (p.startsWith('/')) paths.add(p);
  }
  const urlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  for (const m of combined.matchAll(urlRe)) {
    const raw = m[1];
    if (raw.startsWith('/images/')) paths.add(raw.split('?')[0]);
  }
  return paths;
}

async function collectAllPaths() {
  const paths = new Set(EXTRA_PATHS);
  let homeCss = '';
  for (const page of PAGES) {
    const html = await fetchLiveText(page);
    extractAssetPaths(html).forEach((p) => paths.add(p));
    if (page === '/') {
      const cssMatch = html.match(/href="(\/css\/minified-pages\/home\/[^"]+\.css)"/);
      if (cssMatch) {
        homeCss = await fetchLiveText(cssMatch[1]);
        extractAssetPaths('', homeCss).forEach((p) => paths.add(p));
      }
    }
  }
  const interiorCss = await fetchLiveText('/css/interior.min.css');
  extractAssetPaths('', interiorCss).forEach((p) => paths.add(p));
  extractAssetPaths('', homeCss).forEach((p) => paths.add(p));
  return [...paths].sort();
}

async function processImage(relPath) {
  const outDir = path.join(ROOT, 'public', path.dirname(relPath.slice(1)));
  await fs.mkdir(outDir, { recursive: true });

  const ext = path.extname(relPath).toLowerCase();
  if (ext === '.ico' || ext === '.svg') {
    const buf = await fetchLiveBuffer(relPath);
    const dest = path.join(ROOT, 'public', relPath.slice(1));
    await fs.writeFile(dest, buf);
    return { source: relPath, outputs: [relPath] };
  }

  const buf = await fetchLiveBuffer(relPath);
  const baseName = path.basename(relPath, ext);
  const dirRel = path.dirname(relPath);
  const outputs = [];

  let pipeline = sharp(buf);
  const meta = await pipeline.metadata();
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = sharp(buf).resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  const webpRel = `${dirRel}/${baseName}.webp`.replace(/\\/g, '/');
  const webpDest = path.join(ROOT, 'public', webpRel.slice(1));
  await sharp(await (meta.width && meta.width > MAX_WIDTH ? pipeline.toBuffer() : buf))
    .webp({ quality: 85 })
    .toFile(webpDest);
  outputs.push(webpRel);

  if (KEEP_PNG.has(relPath) && ext === '.png') {
    const pngDest = path.join(ROOT, 'public', relPath.slice(1));
    if (meta.width && meta.width > MAX_WIDTH) {
      await sharp(buf).resize({ width: MAX_WIDTH, withoutEnlargement: true }).png().toFile(pngDest);
    } else {
      await fs.writeFile(pngDest, buf);
    }
    outputs.push(relPath);
  } else if (ext !== '.webp') {
    // For JPG banners etc., WebP is primary; also keep resized original extension if needed for CSS until patched
    const origDest = path.join(ROOT, 'public', relPath.slice(1));
    if (meta.width && meta.width > MAX_WIDTH) {
      await sharp(buf).resize({ width: MAX_WIDTH, withoutEnlargement: true }).toFile(origDest);
    } else {
      await fs.writeFile(origDest, buf);
    }
    outputs.push(relPath);
  }

  return { source: relPath, outputs };
}

async function main() {
  console.log('Collecting asset paths from live site…');
  const paths = await collectAllPaths();
  console.log(`Found ${paths.length} assets`);

  const manifest = {};
  for (const relPath of paths) {
    try {
      console.log('Processing', relPath);
      const entry = await processImage(relPath);
      manifest[relPath] = entry.outputs;
    } catch (err) {
      console.error('Failed', relPath, err.message);
    }
  }

  const manifestPath = path.join(ROOT, 'scripts/docuhide-image-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest to', manifestPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
