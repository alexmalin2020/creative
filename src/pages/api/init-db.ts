import type { APIRoute } from 'astro';
import { initDatabase } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    await initDatabase();
    return new Response(JSON.stringify({ success: true, message: 'Database initialized' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
