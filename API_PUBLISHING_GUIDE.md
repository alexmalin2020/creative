# API Publishing Guide

## Endpoint: POST /api/publish

This endpoint allows publishing products in two ways:
1. **From CSV** (no body) - randomly selects unpublished product from CSV
2. **From JSON** (with body) - publishes custom product data

---

## Method 1: Publish from CSV (existing)

**Request:**
```bash
curl -X POST https://creativestuff.vercel.app/api/publish
```

**Response:**
```json
{
  "success": true,
  "source": "csv",
  "product": {
    "title": "Christmas Font",
    "slug": "festive-christmas-holiday-font-merry-christmas",
    "optimized_title": "Festive Christmas Holiday Font - Merry Christmas Display Font",
    "optimized_description": "Beautiful festive font perfect for holiday designs...",
    "url": "https://www.creativefabrica.com/product/christmas-635/",
    "product_url": "https://creativestuff.vercel.app/product/festive-christmas-holiday-font-merry-christmas",
    "images": ["/images/christmas-635/image1.jpg"],
    "category": "Fonts",
    "subcategory": "Decorative Fonts"
  }
}
```

---

## Method 2: Publish from JSON (new)

**Request:**
```bash
curl -X POST https://creativestuff.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -d @product.json
```

### Required Fields:
- `title` (string) - Product title
- `url` (string) - Original product URL at Creative Fabrica

### Optional Fields:
- `search_key` (string) - Search keyword (defaults to lowercase title)
- `product_id` (number) - Product ID (defaults to random)
- `breadcrumbs` (string) - HTML breadcrumbs for category extraction
- `description` (string) - HTML product description
- `tags` (string) - Comma-separated tags
- `images` (array|string) - Array of image URLs or comma-separated string

---

## Example JSON Payloads

### Minimal Example (Required fields only):
```json
{
  "title": "Modern Sans Serif Font",
  "url": "https://www.creativefabrica.com/product/modern-sans-12345/"
}
```

### Full Example (All fields):
```json
{
  "search_key": "modern sans serif",
  "url": "https://www.creativefabrica.com/product/modern-sans-12345/",
  "title": "Modern Sans Serif Font",
  "product_id": 12345,
  "breadcrumbs": "<ul class=\"breadcrumbs\"><li><a href=\"/\">Home</a></li><li><a href=\"/fonts\">Fonts</a></li><li><a href=\"/fonts/sans-serif\">Sans Serif Fonts</a></li></ul>",
  "description": "<p>A beautiful modern sans serif font perfect for web design, branding, and digital projects. Clean lines and excellent readability.</p><ul><li>Multiple weights</li><li>Web font formats included</li><li>Commercial license</li></ul>",
  "tags": "modern, sans serif, web font, clean, minimalist, professional",
  "images": [
    "https://example.com/images/font-preview-1.jpg",
    "https://example.com/images/font-preview-2.jpg",
    "/local/path/to/image.jpg"
  ]
}
```

### With Local Images:
```json
{
  "title": "Vintage Script Font",
  "url": "https://www.creativefabrica.com/product/vintage-script-67890/",
  "description": "Elegant vintage script font for wedding invitations and logos",
  "tags": "vintage, script, elegant, wedding, handwritten",
  "images": [
    "/images/vintage-script/preview-1.jpg",
    "/images/vintage-script/preview-2.jpg"
  ],
  "breadcrumbs": "<ul class=\"breadcrumbs\"><li><a href=\"/\">Home</a></li><li><a href=\"/fonts\">Fonts</a></li><li><a href=\"/fonts/script\">Script Fonts</a></li></ul>"
}
```

### With External Images (URLs):
```json
{
  "title": "Geometric Display Font",
  "url": "https://www.creativefabrica.com/product/geometric-display-99999/",
  "description": "Bold geometric font for posters and headlines",
  "tags": "geometric, display, bold, modern, poster",
  "images": [
    "https://cdn.example.com/fonts/geometric-1.png",
    "https://cdn.example.com/fonts/geometric-2.png"
  ]
}
```

---

## Response Format

### Success Response:
```json
{
  "success": true,
  "source": "json",
  "product": {
    "title": "Modern Sans Serif Font",
    "slug": "modern-sans-serif-font",
    "optimized_title": "Modern Sans Serif Font - Clean Professional Typography",
    "optimized_description": "Professional sans serif font with clean lines and excellent readability. Perfect for web design, branding, and digital projects...",
    "url": "https://www.creativefabrica.com/product/modern-sans-12345/",
    "product_url": "https://creativestuff.vercel.app/product/modern-sans-serif-font",
    "images": [
      "https://example.com/images/font-preview-1.jpg",
      "https://example.com/images/font-preview-2.jpg"
    ],
    "category": "Fonts",
    "subcategory": "Sans Serif Fonts"
  }
}
```

### Error Response (Already Exists):
```json
{
  "error": "Product already exists",
  "slug": "modern-sans-serif-font"
}
```
**Status Code:** 409 Conflict

### Error Response (Invalid Data):
```json
{
  "error": "Failed to publish product",
  "details": "Missing required field: title"
}
```
**Status Code:** 500

---

## Features

### Automatic Processing:
1. **SEO Optimization** - Title and description optimized via DeepSeek AI
2. **Slug Generation** - SEO-friendly URL slug from optimized title (max 50 chars)
3. **Category Extraction** - Parsed from breadcrumbs HTML
4. **Duplicate Check** - Prevents publishing same URL twice
5. **IndexNow Notification** - Instant indexing on Bing/Yandex

### Image Handling:
- **External URLs** - Used as-is (e.g., `https://cdn.example.com/image.jpg`)
- **Local Paths** - Relative to public directory (e.g., `/images/product/image.jpg`)
- **Array or String** - Both formats accepted

### Category Extraction from Breadcrumbs:
The API automatically extracts `category` and `subcategory` from breadcrumbs HTML:
```html
<ul>
  <li><a href="/">Home</a></li>
  <li><a href="/fonts">Fonts</a></li>          <!-- category -->
  <li><a href="/fonts/script">Script</a></li>   <!-- subcategory -->
</ul>
```
Result: `category: "Fonts"`, `subcategory: "Script"`

---

## Testing Examples

### Test with curl:
```bash
# Minimal
curl -X POST https://creativestuff.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Font","url":"https://www.creativefabrica.com/product/test-123/"}'

# Full
curl -X POST https://creativestuff.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Amazing Script Font",
    "url": "https://www.creativefabrica.com/product/amazing-script-456/",
    "description": "<p>Beautiful script font for creative projects</p>",
    "tags": "script, handwritten, creative, elegant",
    "images": [
      "https://example.com/preview.jpg"
    ],
    "breadcrumbs": "<ul><li><a href=\"/\">Home</a></li><li><a href=\"/fonts\">Fonts</a></li></ul>"
  }'
```

### Test with JavaScript:
```javascript
const response = await fetch('https://creativestuff.vercel.app/api/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Modern Geometric Font',
    url: 'https://www.creativefabrica.com/product/geometric-789/',
    description: 'Bold geometric font for modern designs',
    tags: 'geometric, modern, bold',
    images: ['https://cdn.example.com/preview.jpg']
  })
});

const result = await response.json();
console.log(result);
```

---

## Notes

- **SEO Optimization:** All products go through DeepSeek AI for title/description optimization
- **Slug Uniqueness:** Automatically handles duplicates by appending numbers (e.g., `font-1`, `font-2`)
- **IndexNow:** Product indexed on Bing/Yandex within minutes
- **Validation:** URL must be unique, duplicate URLs return 409 error
- **Images:** Can mix local paths and external URLs in same array
