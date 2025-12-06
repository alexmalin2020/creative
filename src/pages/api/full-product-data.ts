import type { APIRoute } from 'astro';
import { turso } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const result = await turso.execute('SELECT id, title, slug, optimized_title FROM products LIMIT 5');

    const products = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      optimized_title: row.optimized_title,
      slug: row.slug,
      titleLength: (row.title as string).length,
      optimizedLength: (row.optimized_title as string)?.length || 0
    }));

    return new Response(JSON.stringify({
      success: true,
      products,
      note: "slug генерируется из title (короткого), а на сайте показывается optimized_title (длинный)"
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get product data',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
