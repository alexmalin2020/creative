import type { APIRoute } from 'astro';
import { turso, initDatabase, generateUniqueSlug } from '../../lib/db';
import { generateProductSlug } from '../../lib/csv';

export const GET: APIRoute = async () => {
  try {
    // First, ensure database schema is up to date
    await initDatabase();

    // Wait a moment for schema changes to propagate (Turso replication)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if slug column exists by querying schema
    let hasSlugColumn = false;
    try {
      const schemaCheck = await turso.execute(`PRAGMA table_info(products)`);
      hasSlugColumn = schemaCheck.rows.some(row => row.name === 'slug');
    } catch (e) {
      console.error('Failed to check schema:', e);
    }

    if (!hasSlugColumn) {
      return new Response(JSON.stringify({
        error: 'Slug column does not exist',
        details: 'Database schema is not up to date. Please run /api/init-db first.',
        suggestion: 'Visit /api/check-schema to verify the schema'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
      try {
        const checkResult = await turso.execute({
          sql: 'SELECT slug FROM products WHERE id = ?',
          args: [id]
        });

        const currentSlug = checkResult.rows[0]?.slug as string | undefined;
        if (currentSlug && currentSlug.length > 0) {
          skipped++;
          continue;
        }
      } catch (e) {
        console.error(`Failed to check slug for product ${id}:`, e);
        skipped++;
        continue;
      }

      // Generate unique slug from title
      const baseSlug = generateProductSlug(title);
      let uniqueSlug: string;

      try {
        uniqueSlug = await generateUniqueSlug(baseSlug);
      } catch (e) {
        // If unique slug generation fails, use base slug with timestamp
        console.warn(`Failed to generate unique slug for "${title}", using timestamp fallback`);
        uniqueSlug = `${baseSlug}-${Date.now()}-${id}`;
        await new Promise(resolve => setTimeout(resolve, 2)); // Small delay for uniqueness
      }

      // Update product with slug
      try {
        await turso.execute({
          sql: 'UPDATE products SET slug = ? WHERE id = ?',
          args: [uniqueSlug, id]
        });
        updated++;
      } catch (e) {
        console.error(`Failed to update product ${id} with slug "${uniqueSlug}":`, e);
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
