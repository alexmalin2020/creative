import type { APIRoute } from 'astro';
import { getRandomProduct, getProductFolderName, parseCategoriesFromBreadcrumbs, generateProductSlug } from '../../lib/csv';
import { optimizeSEO } from '../../lib/deepseek';
import { insertProduct, getProductByUrl, generateUniqueSlug } from '../../lib/db';
import { getProductImages } from '../../lib/images';
import { notifyProductIndexed } from '../../lib/indexnow';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ message: 'Use POST to publish a product' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check if JSON data is provided in request body
    let productData = null;
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        productData = await request.json();
      } catch (e) {
        // Invalid JSON, will fall back to CSV
      }
    }

    // If JSON data provided, use it. Otherwise, get from CSV
    let product;
    let fromJSON = false;

    if (productData && productData.title && productData.url) {
      // Using JSON data from request
      fromJSON = true;
      product = {
        searchKey: productData.search_key || productData.title.toLowerCase(),
        url: productData.url,
        title: productData.title,
        breadcrumbs: productData.breadcrumbs || '',
        productId: productData.product_id || Math.floor(Math.random() * 1000000),
        description: productData.description || '',
        tags: productData.tags || '',
        imageUrls: Array.isArray(productData.images) ? productData.images : (productData.images || '').split(',')
      };
    } else {
      // Get from CSV (existing logic)
      const MAX_ATTEMPTS = 10;
      let attempts = 0;
      product = null;

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
    }

    // Check if product already exists (for JSON input)
    if (fromJSON) {
      const existing = await getProductByUrl(product.url);
      if (existing) {
        return new Response(JSON.stringify({
          error: 'Product already exists',
          slug: existing.slug
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Strip HTML tags from description for SEO optimization
    const plainDescription = product.description.replace(/<[^>]+>/g, '');

    // Optimize SEO
    const optimized = await optimizeSEO(product.title, plainDescription);

    // Get local image paths from GitHub (only for CSV products)
    let localImages: string[] = [];
    if (!fromJSON) {
      const folderName = getProductFolderName(product.url);
      localImages = await getProductImages(folderName);
    } else {
      // For JSON input, use provided images directly
      localImages = product.imageUrls;
    }

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

    // Notify IndexNow for instant indexing (Bing, Yandex)
    // Fire and forget - don't wait for response
    notifyProductIndexed(uniqueSlug).catch(err =>
      console.error('IndexNow notification failed:', err)
    );

    return new Response(JSON.stringify({
      success: true,
      source: fromJSON ? 'json' : 'csv',
      product: {
        title: product.title,
        slug: uniqueSlug,
        optimized_title: optimized.title,
        optimized_description: optimized.description,
        url: product.url,
        product_url: `https://creativestuff.vercel.app/product/${uniqueSlug}`,
        images: localImages,
        category: category || null,
        subcategory: subcategory || null
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
