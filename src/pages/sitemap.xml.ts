import type { APIRoute } from 'astro';
import { getAllProducts, getAllCategories, getAllSubcategories } from '../lib/db';

export const GET: APIRoute = async () => {
  try {
    const products = await getAllProducts();
    const categories = await getAllCategories();
    const subcategories = await getAllSubcategories();

    const baseUrl = 'https://creativestuff.vercel.app';

    // Build sitemap XML
    const urls: string[] = [];

    // Homepage
    urls.push(`
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

    // Static pages
    urls.push(`
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`);

    urls.push(`
  <url>
    <loc>${baseUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`);

    // Product pages (with lastmod from published_at)
    for (const product of products) {
      const lastmod = product.published_at
        ? new Date(product.published_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      urls.push(`
  <url>
    <loc>${baseUrl}/product/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // Category pages
    for (const category of categories) {
      const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
      urls.push(`
  <url>
    <loc>${baseUrl}/category/${categorySlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    // Subcategory pages
    for (const subcategory of subcategories) {
      const subcategorySlug = subcategory.toLowerCase().replace(/\s+/g, '-');
      // Note: We'd need category info to build proper URLs
      // For now, just using subcategory slug
      urls.push(`
  <url>
    <loc>${baseUrl}/category/fonts/${subcategorySlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
};
