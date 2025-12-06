import type { APIRoute } from 'astro';
import { generateProductSlug } from '../../lib/csv';

export const GET: APIRoute = async () => {
  const testTitles = [
    "Festive Christmas Holiday Font - Merry Christmas Display Font",
    "Christmas Shades Elegant Serif Font – Festive Holiday Typography",
    "Christmas Tree Font - Festive Handwritten Script for Crafts & Cards",
    "Vintage Christmas Handwritten Font - Festive Holiday Display Typeface for Cards & Crafts",
    "Short Title",
    "Medium Length Christmas Font for Festive Designs"
  ];

  const results = testTitles.map(title => {
    const slug = generateProductSlug(title);
    return {
      title,
      titleLength: title.length,
      slug,
      slugLength: slug.length,
      truncated: slug.length < title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').replace(/-+/g, '-').length
    };
  });

  return new Response(JSON.stringify({
    success: true,
    maxSlugLength: 50,
    note: "Slugs are truncated at word boundaries (hyphens) to stay under 50 characters",
    results
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
