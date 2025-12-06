export interface CSVProduct {
  searchKey: string;
  url: string;
  title: string;
  breadcrumbs: string;
  productId: number;
  description: string;
  tags: string;
  imageUrls: string[];
}

export function parseCSVLine(line: string): CSVProduct | null {
  const parts = line.split(';');

  if (parts.length < 8) {
    return null;
  }

  return {
    searchKey: parts[0],
    url: parts[1],
    title: parts[2],
    breadcrumbs: parts[3],
    productId: parseInt(parts[4], 10),
    description: parts[5],
    tags: parts[6].split(',').map(tag => tag.trim()).join(','), // Clean tags, use only comma
    imageUrls: parts[7]?.split(',').map(url => url.trim()) || []
  };
}

export async function getRandomProduct(): Promise<CSVProduct | null> {
  try {
    // Read CSV from GitHub
    const csvUrl = 'https://raw.githubusercontent.com/alexmalin2020/creative/main/data.csv';
    const response = await fetch(csvUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch CSV from GitHub');
    }

    const content = await response.text();
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * lines.length);
    const product = parseCSVLine(lines[randomIndex]);

    return product;
  } catch (error) {
    console.error('Error reading CSV:', error);
    return null;
  }
}

export function getProductFolderName(url: string): string {
  // Extract last segment from URL like /product/christmas-tree-210/ -> christmas-tree-210
  const match = url.match(/\/product\/([^\/]+)\//);
  return match ? match[1] : '';
}

export function parseCategoriesFromBreadcrumbs(breadcrumbsHtml: string): { category: string | null, subcategory: string | null } {
  try {
    // Extract text content from breadcrumbs
    // Example: <ul class="breadcrumbs"><li><a href="...">Home</a></li><li><a href="...">Fonts</a></li><li><a href="...">Decorative Fonts</a></li></ul>
    const linkMatches = breadcrumbsHtml.match(/<a[^>]*>([^<]+)<\/a>/g);

    if (!linkMatches || linkMatches.length < 2) {
      return { category: null, subcategory: null };
    }

    // Extract text from links
    const items = linkMatches
      .map(link => {
        const match = link.match(/>([^<]+)</);
        return match ? match[1].trim() : '';
      })
      .filter(item => item && item.toLowerCase() !== 'home');

    // First item after Home is category, second is subcategory
    return {
      category: items[0] || null,
      subcategory: items[1] || null
    };
  } catch (error) {
    console.error('Error parsing breadcrumbs:', error);
    return { category: null, subcategory: null };
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generateProductSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove all non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit to 100 characters for reasonable URL length
    .replace(/-$/, ''); // Remove trailing hyphen if substring created one
}

export function generateInternalBreadcrumbs(category: string | null, subcategory: string | null): string {
  const breadcrumbs = ['<ul class="breadcrumbs">'];

  // Home link
  breadcrumbs.push('<li><a href="/">Home</a></li>');

  // Category link
  if (category) {
    const categorySlug = slugify(category);
    breadcrumbs.push(`<li><a href="/category/${categorySlug}">${category}</a></li>`);
  }

  // Subcategory link
  if (subcategory && category) {
    const categorySlug = slugify(category);
    const subcategorySlug = slugify(subcategory);
    breadcrumbs.push(`<li><a href="/category/${categorySlug}/${subcategorySlug}">${subcategory}</a></li>`);
  }

  breadcrumbs.push('</ul>');
  return breadcrumbs.join('');
}
