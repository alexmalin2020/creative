import { createClient } from '@libsql/client';

export const turso = createClient({
  url: import.meta.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL!,
  authToken: import.meta.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN!,
});

export interface Product {
  id?: number;
  search_key: string;
  url: string;
  title: string;
  breadcrumbs: string;
  product_id: number;
  description: string;
  tags: string;
  images: string;
  published_at?: string;
  optimized_title?: string;
  optimized_description?: string;
}

export async function initDatabase() {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_key TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      breadcrumbs TEXT,
      product_id INTEGER,
      description TEXT,
      tags TEXT,
      images TEXT,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      optimized_title TEXT,
      optimized_description TEXT
    )
  `);

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_search_key ON products(search_key)
  `);

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_published_at ON products(published_at DESC)
  `);
}

export async function getAllProducts(): Promise<Product[]> {
  const result = await turso.execute('SELECT * FROM products ORDER BY published_at DESC');
  return result.rows as unknown as Product[];
}

export async function getProductByUrl(url: string): Promise<Product | null> {
  const result = await turso.execute({
    sql: 'SELECT * FROM products WHERE url = ?',
    args: [url]
  });
  return result.rows[0] as unknown as Product || null;
}

export async function insertProduct(product: Omit<Product, 'id' | 'published_at'>): Promise<void> {
  await turso.execute({
    sql: `INSERT INTO products
      (search_key, url, title, breadcrumbs, product_id, description, tags, images, optimized_title, optimized_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      product.search_key,
      product.url,
      product.title,
      product.breadcrumbs,
      product.product_id,
      product.description,
      product.tags,
      product.images,
      product.optimized_title || product.title,
      product.optimized_description || product.description,
    ]
  });
}
