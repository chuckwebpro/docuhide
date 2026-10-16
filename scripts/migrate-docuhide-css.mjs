/**
 * Download live CSS bundles into src/styles/docuhide/
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLiveText } from './lib/fetch-live.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src/styles/docuhide');

function patchImageUrls(css) {
  return css
    .replace(/\/images\/([^)'"]+)\.(jpg|jpeg|png)/gi, '/images/$1.webp')
    .replace(/url\(\s*\/images\/banners\/bg-hero\.jpg\s*\)/gi, 'url(/images/banners/bg-hero.webp)');
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  const homeHtml = await fetchLiveText('/');
  const homeCssMatch = homeHtml.match(/href="(\/css\/minified-pages\/home\/[^"]+\.css)"/);
  if (!homeCssMatch) throw new Error('Home CSS not found');
  const homeCss = patchImageUrls(await fetchLiveText(homeCssMatch[1]));
  await fs.writeFile(path.join(OUT, 'home.css'), homeCss);

  const interiorCss = patchImageUrls(await fetchLiveText('/css/interior.min.css'));
  await fs.writeFile(path.join(OUT, 'interior.css'), interiorCss);

  const newsHtml = await fetchLiveText('/news/');
  const blogCssMatch = newsHtml.match(/href="(\/css\/minified-pages\/blog\/[^"]+\.css)"/);
  if (blogCssMatch) {
    const blogCss = patchImageUrls(await fetchLiveText(blogCssMatch[1]));
    await fs.writeFile(path.join(OUT, 'blog.css'), blogCss);
  }

  let articleCss = await fetchLiveText('/css/article.min.css');
  articleCss = articleCss.replace(
    /@import url\('https:\/\/fonts\.googleapis\.com[^']*'\);\s*/i,
    '',
  );
  await fs.writeFile(path.join(OUT, 'article.css'), patchImageUrls(articleCss));

  console.log('CSS vendored to src/styles/docuhide/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
