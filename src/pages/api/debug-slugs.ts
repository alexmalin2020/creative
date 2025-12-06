import type { APIRoute } from 'astro';
import { turso } from '../../lib/db';
import { generateProductSlug } from '../../lib/csv';

export const GET: APIRoute = async () => {
  try {
    const result = await turso.execute('SELECT id, title, slug FROM products');

    const products = result.rows.map(row => {
      const title = row.title as string;
      const currentSlug = row.slug as string;
      const expectedSlug = generateProductSlug(title);

      return {
        id: row.id,
        title: title,
        currentSlug: currentSlug,
        expectedSlug: expectedSlug,
        match: currentSlug === expectedSlug
      };
    });

    return new Response(JSON.stringify({
      success: true,
      products,
      summary: {
        total: products.length,
        matching: products.filter(p => p.match).length,
        notMatching: products.filter(p => !p.match).length
      }
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to debug slugs',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
