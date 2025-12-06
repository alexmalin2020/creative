import type { APIRoute } from 'astro';
import { getRandomProduct, getProductFolderName, parseCategoriesFromBreadcrumbs, generateProductSlug } from '../../lib/csv';
import { optimizeSEO } from '../../lib/deepseek';
import { insertProduct, getProductByUrl, generateUniqueSlug } from '../../lib/db';
import { getProductImages } from '../../lib/images';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ message: 'Use POST to publish a product' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async () => {
  try {
    const MAX_ATTEMPTS = 10;
    let attempts = 0;
    let product = null;

    // Try to find an unpublished product
    while (attempts < MAX_ATTEMPTS) {
      product = await getRandomProduct();

      if (!product) {
        return new Response(JSON.stringify({ error: 'No products available in CSV' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if product already exists
      const existing = await getProductByUrl(product.url);
      if (!existing) {
        // Found unpublished product, break the loop
        break;
      }

      // Product already published, try again
      attempts++;
      product = null;
    }

    if (!product) {
      return new Response(JSON.stringify({ error: 'All products from CSV are already published' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Strip HTML tags from description for SEO optimization
    const plainDescription = product.description.replace(/<[^>]+>/g, '');

    // Optimize SEO
    const optimized = await optimizeSEO(product.title, plainDescription);

    // Get local image paths from GitHub
    const folderName = getProductFolderName(product.url);
    const localImages = await getProductImages(folderName);

    // Parse categories from breadcrumbs
    const { category, subcategory } = parseCategoriesFromBreadcrumbs(product.breadcrumbs);

    // Generate unique SEO-friendly slug from OPTIMIZED title (not short title from CSV)
    const baseSlug = generateProductSlug(optimized.title);
    const uniqueSlug = await generateUniqueSlug(baseSlug);

    // Insert into database
    await insertProduct({
      search_key: product.searchKey,
      url: product.url,
      title: product.title,
      slug: uniqueSlug,
      breadcrumbs: product.breadcrumbs,
      product_id: product.productId,
      description: product.description,
      tags: product.tags,
      images: localImages.length > 0 ? localImages.join(',') : product.imageUrls.join(','),
      category: category || undefined,
      subcategory: subcategory || undefined,
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
