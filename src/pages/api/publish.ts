import type { APIRoute } from 'astro';
import { getRandomProduct, getProductFolderName } from '../../lib/csv';
import { optimizeSEO } from '../../lib/deepseek';
import { insertProduct, getProductByUrl } from '../../lib/db';
import { join } from 'path';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get random product from CSV
    const csvPath = join(process.cwd(), 'data.csv');
    const product = getRandomProduct(csvPath);

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

    // Download images from GitHub and save to public/images
    const folderName = getProductFolderName(product.url);
    const localImages: string[] = [];

    for (let i = 0; i < product.imageUrls.length; i++) {
      const imageUrl = product.imageUrls[i];
      const githubRawUrl = `https://raw.githubusercontent.com/alexmalin2020/creative/main/images/${folderName}/${i}.jpg`;
      localImages.push(`/images/${folderName}/${i}.jpg`);

      // Note: Images should be already in public/images or downloaded separately
      // For now, we'll store GitHub URLs as fallback
    }

    // Insert into database
    await insertProduct({
      search_key: product.searchKey,
      url: product.url,
      title: product.title,
      breadcrumbs: product.breadcrumbs,
      product_id: product.productId,
      description: product.description,
      tags: product.tags,
      images: localImages.length > 0 ? localImages.join(',') : product.imageUrls.join(','),
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
        images: localImages
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
