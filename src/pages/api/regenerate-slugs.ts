import type { APIRoute } from 'astro';
import { turso, generateUniqueSlug } from '../../lib/db';
import { generateProductSlug } from '../../lib/csv';

export const GET: APIRoute = async () => {
  try {
    // Get all products with their optimized titles
    const result = await turso.execute('SELECT id, title, optimized_title, slug FROM products');

    let updated = 0;
    let skipped = 0;
    const changes: Array<{id: number, oldSlug: string, newSlug: string}> = [];

    for (const row of result.rows) {
      const id = row.id as number;
      const title = row.title as string;
      const optimizedTitle = row.optimized_title as string | null;
      const currentSlug = row.slug as string | null;

      // Use optimized title if available, otherwise fall back to regular title
      const titleForSlug = optimizedTitle || title;

      if (!titleForSlug) {
        skipped++;
        continue;
      }

      // Generate new slug from optimized title
      const baseSlug = generateProductSlug(titleForSlug);

      // Check if new slug would be different
      if (currentSlug === baseSlug) {
        skipped++;
        continue; // Slug already correct
      }

      let uniqueSlug: string;
      try {
        uniqueSlug = await generateUniqueSlug(baseSlug);
      } catch (e) {
        console.warn(`Failed to generate unique slug for product ${id}, using timestamp fallback`);
        uniqueSlug = `${baseSlug}-${Date.now()}-${id}`;
        await new Promise(resolve => setTimeout(resolve, 2));
      }

      // Update product with new slug
      try {
        await turso.execute({
          sql: 'UPDATE products SET slug = ? WHERE id = ?',
          args: [uniqueSlug, id]
        });

        changes.push({
          id,
          oldSlug: currentSlug || 'NULL',
          newSlug: uniqueSlug
        });

        updated++;
      } catch (e) {
        console.error(`Failed to update product ${id}:`, e);
        skipped++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Regenerated ${updated} slugs from optimized titles (${skipped} skipped)`,
      changes: changes.slice(0, 10), // Show first 10 changes
      totalChanges: changes.length
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Regeneration error:', error);
    return new Response(JSON.stringify({
      error: 'Slug regeneration failed',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
