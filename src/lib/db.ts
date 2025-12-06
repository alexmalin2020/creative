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
  slug?: string;
  breadcrumbs: string;
  product_id: number;
  description: string;
  tags: string;
  images: string;
  category?: string;
  subcategory?: string;
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
      slug TEXT UNIQUE,
      breadcrumbs TEXT,
      product_id INTEGER,
      description TEXT,
      tags TEXT,
      images TEXT,
      category TEXT,
      subcategory TEXT,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      optimized_title TEXT,
      optimized_description TEXT
    )
  `);

  // Add category and subcategory columns if they don't exist (migration)
  try {
    await turso.execute(`ALTER TABLE products ADD COLUMN category TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    await turso.execute(`ALTER TABLE products ADD COLUMN subcategory TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    await turso.execute(`ALTER TABLE products ADD COLUMN slug TEXT UNIQUE`);
  } catch (e) {
    // Column already exists, ignore error
  }

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_search_key ON products(search_key)
  `);

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_published_at ON products(published_at DESC)
  `);

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_category ON products(category)
  `);

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_subcategory ON products(subcategory)
  `);

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_slug ON products(slug)
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

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const result = await turso.execute({
    sql: 'SELECT * FROM products WHERE slug = ?',
    args: [slug]
  });
  return result.rows[0] as unknown as Product || null;
}

export async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await getProductBySlug(slug);
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function insertProduct(product: Omit<Product, 'id' | 'published_at'>): Promise<void> {
  await turso.execute({
    sql: `INSERT INTO products
      (search_key, url, title, slug, breadcrumbs, product_id, description, tags, images, category, subcategory, optimized_title, optimized_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      product.search_key,
      product.url,
      product.title,
      product.slug || null,
      product.breadcrumbs,
      product.product_id,
      product.description,
      product.tags,
      product.images,
      product.category || null,
      product.subcategory || null,
      product.optimized_title || product.title,
      product.optimized_description || product.description,
    ]
  });
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const result = await turso.execute({
    sql: 'SELECT * FROM products WHERE category = ? ORDER BY published_at DESC',
    args: [category]
  });
  return result.rows as unknown as Product[];
}

export async function getProductsBySubcategory(subcategory: string): Promise<Product[]> {
  const result = await turso.execute({
    sql: 'SELECT * FROM products WHERE subcategory = ? ORDER BY published_at DESC',
    args: [subcategory]
  });
  return result.rows as unknown as Product[];
}

export async function getAllCategories(): Promise<string[]> {
  const result = await turso.execute('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
  return result.rows.map((row: any) => row.category as string);
}

export async function getSubcategoriesByCategory(category: string): Promise<string[]> {
  const result = await turso.execute({
    sql: 'SELECT DISTINCT subcategory FROM products WHERE category = ? AND subcategory IS NOT NULL ORDER BY subcategory',
    args: [category]
  });
  return result.rows.map((row: any) => row.subcategory as string);
}

export async function getAllSubcategories(): Promise<string[]> {
  const result = await turso.execute('SELECT DISTINCT subcategory FROM products WHERE subcategory IS NOT NULL ORDER BY subcategory');
  return result.rows.map((row: any) => row.subcategory as string);
}
