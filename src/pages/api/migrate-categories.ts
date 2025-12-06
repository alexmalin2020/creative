import type { APIRoute } from 'astro';
import { turso } from '../../lib/db';
import { parseCategoriesFromBreadcrumbs } from '../../lib/csv';

export const GET: APIRoute = async () => {
  try {
    // Get all products without categories
    const result = await turso.execute(
      'SELECT id, breadcrumbs FROM products WHERE category IS NULL OR subcategory IS NULL'
    );

    let updated = 0;
    for (const row of result.rows) {
      const id = row.id as number;
      const breadcrumbs = row.breadcrumbs as string;

      if (!breadcrumbs) continue;

      // Parse categories from breadcrumbs
      const { category, subcategory } = parseCategoriesFromBreadcrumbs(breadcrumbs);

      // Update product with categories
      await turso.execute({
        sql: 'UPDATE products SET category = ?, subcategory = ? WHERE id = ?',
        args: [category, subcategory, id]
      });

      updated++;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Updated ${updated} products with categories`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
