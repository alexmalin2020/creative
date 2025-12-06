import type { APIRoute } from 'astro';
import { turso } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    // Check table schema
    const result = await turso.execute(`PRAGMA table_info(products)`);

    const columns = result.rows.map(row => ({
      name: row.name,
      type: row.type,
      notnull: row.notnull,
      dflt_value: row.dflt_value,
      pk: row.pk
    }));

    const hasSlugColumn = columns.some(col => col.name === 'slug');

    // Try to query slug column if it exists
    let sampleSlug = null;
    if (hasSlugColumn) {
      try {
        const slugTest = await turso.execute('SELECT slug FROM products LIMIT 1');
        sampleSlug = slugTest.rows[0]?.slug || 'NULL';
      } catch (e) {
        sampleSlug = `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      hasSlugColumn,
      sampleSlug,
      columns,
      totalColumns: columns.length
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Schema check error:', error);
    return new Response(JSON.stringify({
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
