/**
 * IndexNow API - Instant indexing for Bing and Yandex
 * https://www.indexnow.org/
 */

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const INDEXNOW_KEY = '4a7c8b9d3e2f1g6h5i4j3k2l1m0n9o8p'; // Generate your own at https://www.indexnow.org/

/**
 * Notify search engines about new/updated URLs
 */
export async function notifyIndexNow(urls: string | string[]): Promise<boolean> {
  try {
    const urlList = Array.isArray(urls) ? urls : [urls];

    // IndexNow API call
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: 'creativestuff.vercel.app',
        key: INDEXNOW_KEY,
        keyLocation: `https://creativestuff.vercel.app/${INDEXNOW_KEY}.txt`,
        urlList: urlList,
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(`✅ IndexNow: Successfully notified ${urlList.length} URL(s)`);
      return true;
    } else {
      console.error(`❌ IndexNow failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('IndexNow error:', error);
    return false;
  }
}

/**
 * Notify about product page
 */
export async function notifyProductIndexed(slug: string): Promise<boolean> {
  const url = `https://creativestuff.vercel.app/product/${slug}`;
  return notifyIndexNow(url);
}

/**
 * Notify about multiple products (batch)
 */
export async function notifyProductsBatch(slugs: string[]): Promise<boolean> {
  const urls = slugs.map(slug => `https://creativestuff.vercel.app/product/${slug}`);
  return notifyIndexNow(urls);
}
