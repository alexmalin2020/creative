import type { APIRoute } from 'astro';
import { turso, initDatabase, generateUniqueSlug } from '../../lib/db';
import { generateProductSlug } from '../../lib/csv';

export const GET: APIRoute = async () => {
  try {
    // First, ensure database schema is up to date
    await initDatabase();

    // Double-check: try to add slug column again in case it wasn't created
    try {
      await turso.execute('ALTER TABLE products ADD COLUMN slug TEXT UNIQUE');
    } catch (e) {
      // Column already exists or other error, continue
    }

    // Get all products
    const result = await turso.execute('SELECT id, title FROM products');

    let updated = 0;
    let skipped = 0;

    for (const row of result.rows) {
      const id = row.id as number;
      const title = row.title as string;

      if (!title) {
        skipped++;
        continue;
      }

      // Check if this product already has a slug
      const checkResult = await turso.execute({
        sql: 'SELECT slug FROM products WHERE id = ?',
        args: [id]
      });

      const currentSlug = checkResult.rows[0]?.slug as string | undefined;
      if (currentSlug && currentSlug.length > 0) {
        skipped++;
        continue;
      }

      // Generate unique slug from title
      const baseSlug = generateProductSlug(title);
      const uniqueSlug = await generateUniqueSlug(baseSlug);

      // Update product with slug
      try {
        await turso.execute({
          sql: 'UPDATE products SET slug = ? WHERE id = ?',
          args: [uniqueSlug, id]
        });
        updated++;
      } catch (e) {
        console.error(`Failed to update product ${id}:`, e);
        skipped++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Updated ${updated} products with SEO-friendly slugs (${skipped} skipped)`
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
