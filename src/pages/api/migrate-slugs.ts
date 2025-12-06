import type { APIRoute } from 'astro';
import { turso, initDatabase, generateUniqueSlug } from '../../lib/db';
import { generateProductSlug } from '../../lib/csv';

export const GET: APIRoute = async () => {
  try {
    // First, ensure database schema is up to date
    await initDatabase();

    // Force add slug column - try multiple times to ensure it's created
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await turso.execute('ALTER TABLE products ADD COLUMN slug TEXT');
        break; // Success, exit loop
      } catch (e) {
        // Column might already exist or other error
        if (attempt === 2) {
          console.log('Column slug should exist now or already exists');
        }
      }
    }

    // Get all products
    const result = await turso.execute('SELECT id, title FROM products');

    let updated = 0;
    let skipped = 0;
    let slugColumnExists = true;

    for (const row of result.rows) {
      const id = row.id as number;
      const title = row.title as string;

      if (!title) {
        skipped++;
        continue;
      }

      // Check if this product already has a slug (only if column exists)
      if (slugColumnExists) {
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
          // Column doesn't exist yet, mark it and continue without checking
          slugColumnExists = false;
        }
      }

      // Generate unique slug from title
      const baseSlug = generateProductSlug(title);

      // For unique slug generation, use a simpler approach if column doesn't exist
      let uniqueSlug = baseSlug;
      if (slugColumnExists) {
        try {
          uniqueSlug = await generateUniqueSlug(baseSlug);
        } catch (e) {
          // If this fails, use base slug with timestamp
          uniqueSlug = `${baseSlug}-${Date.now()}`;
        }
      } else {
        // Without column, just append timestamp to ensure uniqueness
        uniqueSlug = `${baseSlug}-${Date.now()}-${id}`;
      }

      // Update product with slug
      try {
        await turso.execute({
          sql: 'UPDATE products SET slug = ? WHERE id = ?',
          args: [uniqueSlug, id]
        });
        updated++;

        // Small delay to ensure uniqueness if using timestamps
        if (!slugColumnExists) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
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
