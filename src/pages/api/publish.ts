import type { APIRoute } from 'astro';
import { getRandomProduct, getProductFolderName } from '../../lib/csv';
import { optimizeSEO } from '../../lib/deepseek';
import { insertProduct, getProductByUrl } from '../../lib/db';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ message: 'Use POST to publish a product' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async () => {
  try {
    // Get random product from CSV (GitHub)
    const product = await getRandomProduct();

    if (!product) {
      return new Response(JSON.stringify({ error: 'No products available in CSV' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if product already exists
    const existing = await getProductByUrl(product.url);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Product already published', product: existing }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Strip HTML tags from description for SEO optimization
    const plainDescription = product.description.replace(/<[^>]+>/g, '');

    // Optimize SEO
    const optimized = await optimizeSEO(product.title, plainDescription);

    // Insert into database
    await insertProduct({
      search_key: product.searchKey,
      url: product.url,
      title: product.title,
      breadcrumbs: product.breadcrumbs,
      product_id: product.productId,
      description: product.description,
      tags: product.tags,
      images: product.imageUrls.join(','),
      optimized_title: optimized.title,
      optimized_description: optimized.description
    });

    return new Response(JSON.stringify({
      success: true,
      product: {
        title: product.title,
        optimized_title: optimized.title,
        optimized_description: optimized.description,
        url: product.url,
        images: product.imageUrls
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error publishing product:', error);
    return new Response(JSON.stringify({
      error: 'Failed to publish product',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
