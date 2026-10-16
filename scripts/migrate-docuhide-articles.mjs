/**
 * Scrape article pages into src/data/news/*.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLiveText } from './lib/fetch-live.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/news');

const ARTICLES = [
  'atlassian-data-leak-part-1',
  'atlassian-data-leak-part-2',
  'avemaria-info-stealer-infect-more-users',
  'critical-windows-snipping-tool-vulnerability',
  'data-breaches-in-2022-and-2023',
  'dropbox-breech--who-s-next',
  'google-pixel-flaw-allowed-recovery-of-redacted-images',
  'microsoft-baffled-how-hackers-stole-azure-ad-signing-key',
  'north-korean-ransomware-attacks-on-healthcare-',
  'document-security-and-redaction',
];

function decodeHtml(s) {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractMeta(html, name) {
  const re = new RegExp(`name="${name}"\\s+content="([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? decodeHtml(m[1]) : '';
}

function extractTitle(html) {
  const m = html.match(/<title>\s*([^<]+)\s*<\/title>/i);
  return m ? decodeHtml(m[1].trim()) : '';
}

function normalizeContent(html) {
  let body = html;
  const articleMatch = html.match(/<article[^>]*id="articleContent"[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    body = articleMatch[1];
  }

  return body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/srcset="\/images\/([^"]+)\.(jpg|jpeg|png)"/gi, 'srcset="/images/$1.webp"')
    .replace(/src="\/images\/([^"]+)\.(jpg|jpeg|png)"/gi, 'src="/images/$1.webp"')
    .replace(/href="\/article\/([^"]+?)"/gi, 'href="/article/$1/"')
    .replace(/href="\/(solutions|news)"/gi, 'href="/$1/"')
    .trim();
}

async function scrapeArticle(slug) {
  const url = `/article/${slug}/`;
  const html = await fetchLiveText(url);

  const rawTitle = extractTitle(html);
  const title = rawTitle.replace(/^News\s*-\s*/i, '').trim();
  const description = extractMeta(html, 'description');

  const bannerMatch = html.match(/src="(\/images\/news-images\/banner\/[^"]+)"/i);
  let heroImage = bannerMatch ? bannerMatch[1] : '';
  heroImage = heroImage.replace(/\.(jpg|jpeg|png)$/i, '.webp');

  return {
    slug,
    title,
    description,
    publishedDate: '2022-12-29',
    heroImage,
    bodyHtml: normalizeContent(html),
  };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const all = [];
  for (const slug of ARTICLES) {
    console.log('Scraping', slug);
    all.push(await scrapeArticle(slug));
  }
  await fs.writeFile(path.join(OUT, 'articles.json'), JSON.stringify(all, null, 2));
  console.log('Wrote src/data/news/articles.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
