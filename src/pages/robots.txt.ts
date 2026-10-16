import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const origin = site?.origin ?? 'https://www.docuhide.com';
  const body = `User-agent: *
Allow: /

Disallow: /admin/
Disallow: /thank-you/
Disallow: /styleguide/

Sitemap: ${origin}/sitemap.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
