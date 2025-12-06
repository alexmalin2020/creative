import type { APIRoute } from 'astro';
import { turso, initDatabase, generateUniqueSlug } from '../../lib/db';
import { generateProductSlug } from '../../lib/csv';

export const GET: APIRoute = async () => {
  try {
    // First, ensure database schema is up to date
    await initDatabase();

    // Get all products without slugs
    const result = await turso.execute(
      'SELECT id, title FROM products WHERE slug IS NULL'
    );

    let updated = 0;
    for (const row of result.rows) {
      const id = row.id as number;
      const title = row.title as string;

      if (!title) continue;

      // Generate unique slug from title
      const baseSlug = generateProductSlug(title);
      const uniqueSlug = await generateUniqueSlug(baseSlug);

      // Update product with slug
      await turso.execute({
        sql: 'UPDATE products SET slug = ? WHERE id = ?',
        args: [uniqueSlug, id]
      });

      updated++;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Updated ${updated} products with SEO-friendly slugs`
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
