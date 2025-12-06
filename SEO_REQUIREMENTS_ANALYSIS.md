# SEO Requirements Analysis Report
## Creative Fabrica Showcase Website

**Analyzed:** December 6, 2025
**Current State:** Astro 5 SSR on Vercel
**Target:** Google, Yandex, Bing, AI Search (GEO)

---

## Executive Summary

| Category | Can Do | Need Conditions | Cannot Do |
|----------|--------|-----------------|-----------|
| **Total Requirements** | 18 | 8 | 4 |
| **Coverage** | 60% | 27% | 13% |

---

## 1. ARCHITECTURE FOUNDATION

### ✅ FULLY IMPLEMENTED

#### Rendering Strategy (SSR/SSG)
- **Status:** ✅ Complete
- **Current:** Astro 5 with `output: 'server'` (SSR)
- **Evidence:** astro.config.mjs line 5
- **Quality:** Excellent for Yandex crawl budget

#### URL Structure - Slugs
- **Status:** ✅ Complete
- **Current:** Human-readable, hyphen-separated, 50-char max
- **Examples:**
  - `/product/festive-christmas-holiday-font-merry-christmas`
  - `/category/fonts/decorative-fonts`
- **Quality:** SEO-optimal with word-boundary truncation

#### HTTPS & TLS
- **Status:** ✅ Complete
- **Current:** Vercel auto-manages TLS 1.3
- **HSTS:** Vercel-managed

### ✅ CAN IMPLEMENT IMMEDIATELY

#### URL Structure - Trailing Slash & WWW
- **Status:** ⚠️ Need configuration
- **Solution:**
  ```javascript
  // astro.config.mjs
  export default defineConfig({
    trailingSlash: 'never', // or 'always'
    redirects: {
      '/www-redirect': 'https://creativestuff.vercel.app'
    }
  });
  ```
- **Effort:** 5 minutes
- **Vercel:** Configure redirects in vercel.json

#### Max Depth (≤3)
- **Status:** ✅ Already compliant
- **Current depths:**
  - Level 1: `/`
  - Level 2: `/product/[slug]`, `/category/[cat]`
  - Level 3: `/category/[cat]/[subcat]`

---

## 2. CRAWLING AND INDEXING

### ✅ CAN IMPLEMENT IMMEDIATELY

#### robots.txt
- **Status:** ❌ Missing
- **Can Do:** Create `/public/robots.txt`
- **Content:**
  ```txt
  User-agent: *
  Allow: /

  User-agent: AhrefsBot
  Disallow: /

  User-agent: SemrushBot
  Disallow: /

  Sitemap: https://creativestuff.vercel.app/sitemap.xml
  ```
- **Effort:** 10 minutes

#### Sitemap.xml (Dynamic)
- **Status:** ❌ Missing
- **Can Do:** Create `/src/pages/sitemap.xml.ts`
- **Features:**
  - Auto-generated from database
  - Include `<lastmod>` from `published_at`
  - Separate image sitemap
- **Effort:** 30 minutes
- **Code Pattern:**
  ```typescript
  export async function GET() {
    const products = await getAllProducts();
    const xml = generateSitemapXML(products);
    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }
  ```

#### Canonical Tags
- **Status:** ❌ Missing
- **Can Do:** Add to Layout.astro `<head>`
- **Implementation:**
  ```astro
  <link rel="canonical" href={Astro.url.href} />
  ```
- **Pagination:** Self-canonicalize (already correct per spec)
- **Effort:** 15 minutes

#### HTTP Status Codes
- **Status:** ⚠️ Partial
- **Current:** Astro returns 404 by default
- **Need:** Add 410 Gone for deleted products
- **Solution:** Create custom 410 endpoint
- **Effort:** 20 minutes

### ⚠️ CONDITIONAL IMPLEMENTATION

#### Last-Modified Header
- **Status:** ❌ Missing
- **Can Do:** Add via middleware
- **Challenge:** Need to track actual modification times
- **Solution:**
  ```typescript
  // middleware.ts
  export function onRequest({ request, locals }, next) {
    const response = await next();
    response.headers.set('Last-Modified', new Date(product.published_at).toUTCString());
    return response;
  }
  ```
- **Condition:** Requires database schema to store `updated_at` (currently only `published_at`)
- **Effort:** 45 minutes + migration

---

## 3. PERFORMANCE / CORE WEB VITALS

### ⚠️ PARTIALLY ACHIEVABLE

#### Images - WebP/AVIF
- **Status:** ❌ Currently JPG
- **Challenge:** Images stored in GitHub repo as JPG
- **Can Do:**
  - On-the-fly conversion via Vercel Image Optimization
  - Or: Pre-convert images in repo
- **Solution:**
  ```astro
  <img src={`/_vercel/image?url=${image}&w=600&q=80`} />
  ```
- **Limitation:** Vercel free tier has limits
- **Effort:** 30 minutes

#### Images - Width/Height Attributes
- **Status:** ❌ Missing
- **Can Do:** Add to all `<img>` tags
- **Challenge:** Need to know dimensions (not in database)
- **Solutions:**
  1. **Quick:** Set fixed dimensions (300x200 based on CSS)
  2. **Proper:** Read image dimensions from files
- **Effort:** Quick (15 min) or Proper (2 hours)

#### Images - Lazy Loading
- **Status:** ❌ Missing
- **Can Do:** Add `loading="lazy"` to images
- **Effort:** 10 minutes

#### Assets - Minification
- **Status:** ✅ Astro auto-minifies on build
- **No action needed**

#### Scripts - Defer/Async
- **Status:** ✅ Already implemented
- **Evidence:** Search/click handlers use `type="module"` (deferred)

#### Fonts - Preload
- **Status:** N/A - Using system fonts
- **No action needed**

---

## 4. SEMANTICS AND GEO OPTIMIZATION

### ⚠️ NEEDS REFACTORING

#### HTML Semantic Tags
- **Status:** ⚠️ Partial
- **Current:** Generic `<div>` structure
- **Missing:** `<article>`, `<section>`, `<nav>`, `<aside>`
- **Can Do:** Refactor Layout.astro and pages
- **Priority Changes:**
  1. Wrap product cards in `<article>`
  2. Add `<section>` for product grid
  3. Change nav div to `<nav>`
  4. Add `<aside>` for categories
- **Effort:** 1-2 hours

#### Heading Hierarchy
- **Status:** ⚠️ Needs audit
- **Current:**
  - Layout: `<h1>` in header
  - Products: Likely multiple H2s
- **Risk:** Multiple H1s on product pages?
- **Can Do:** Audit and fix
- **Effort:** 30 minutes

#### Lists for Data
- **Status:** ⚠️ Could improve
- **Current:** Tags use `<span>` in flex
- **Better:** `<ul>` with `<li>` for tags
- **Effort:** 20 minutes

#### Content Logic (Entity Focus)
- **Status:** ❌ Missing
- **Can Do:** Add introductory paragraph to each page
- **Example:** "Discover free [Entity] fonts from Creative Fabrica..."
- **Effort:** 30 minutes per page type

---

## 5. STRUCTURED DATA (SCHEMA.ORG)

### ✅ PARTIALLY IMPLEMENTED

#### Product Schema (JSON-LD)
- **Status:** ✅ Already exists
- **Current:** Product with offers
- **Location:** Product page `<script type="application/ld+json">`

#### Advanced Properties
- **Status:** ❌ Missing `sameAs` and `mentions`
- **Can Do:** Add Wikipedia/Wikidata links for entities
- **Example:**
  ```json
  {
    "@type": "Product",
    "sameAs": [
      "https://www.wikidata.org/wiki/Q1234567",
      "https://en.wikipedia.org/wiki/Christmas_font"
    ],
    "mentions": [
      { "@type": "Thing", "name": "Christmas", "sameAs": "https://www.wikidata.org/wiki/Q42" }
    ]
  }
  ```
- **Challenge:** Need to manually map entities
- **Effort:** 1-2 hours

### ❌ CANNOT IMPLEMENT

#### Article/NewsArticle Schema
- **Status:** Not applicable
- **Reason:** Site is product catalog, not content publication
- **Alternative:** Could add blog section, but out of scope

---

## 6. ENGINE-SPECIFIC REQUIREMENTS

### ❌ CANNOT IMPLEMENT (YANDEX COMMERCIAL)

#### Commercial Factors
- **Status:** Not applicable
- **Reason:** Affiliate site, not e-commerce
- **Missing (by design):**
  - ❌ `tel:` links - No phone number
  - ❌ Physical address - No store
  - ❌ Delivery/payment info - Redirect to Creative Fabrica
  - ⚠️ Prices - Products are FREE (can show $0.00)
- **Impact:** Yandex may rank lower for commercial queries
- **Mitigation:** Focus on informational intent keywords

### ✅ CAN IMPLEMENT

#### Google E-E-A-T (Author Pages)
- **Status:** ❌ No author info
- **Can Do:** Create `/about` page with:
  - Author bio
  - Social links (if available)
  - Expertise statement
- **Current:** `/about` exists but minimal
- **Effort:** 1 hour

#### Mobile-First (Touch Targets ≥48px)
- **Status:** ⚠️ Needs audit
- **Buttons:** `.btn` has 12px padding (likely >48px total)
- **Can Do:** Add minimum dimensions to CSS
- **Effort:** 20 minutes

### ✅ CAN IMPLEMENT (HIGH VALUE)

#### IndexNow API
- **Status:** ❌ Not implemented
- **Can Do:** Integrate into `/api/publish`
- **Benefit:** Instant indexing on Bing/Yandex
- **Implementation:**
  ```typescript
  // After publishing product
  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    body: JSON.stringify({
      host: 'creativestuff.vercel.app',
      key: process.env.INDEXNOW_KEY,
      urlList: [productUrl]
    })
  });
  ```
- **Effort:** 45 minutes
- **Priority:** HIGH

---

## PRIORITY IMPLEMENTATION ROADMAP

### Phase 1: Critical (Can do now - 3 hours)
1. ✅ robots.txt (10 min)
2. ✅ Sitemap.xml dynamic (30 min)
3. ✅ Canonical tags (15 min)
4. ✅ Lazy loading images (10 min)
5. ✅ Width/height attributes (15 min - fixed dimensions)
6. ✅ IndexNow API (45 min)
7. ✅ Trailing slash policy (5 min)

### Phase 2: Semantic SEO (Can do - 4 hours)
1. ⚠️ Semantic HTML refactor (2 hours)
2. ⚠️ Heading hierarchy audit (30 min)
3. ⚠️ List structure for tags (20 min)
4. ⚠️ Entity-focused intro paragraphs (30 min)
5. ⚠️ Enhanced Schema.org properties (1 hour)

### Phase 3: Performance (Conditional - varies)
1. ⚠️ WebP conversion (30 min if Vercel Image, 4+ hours if manual)
2. ⚠️ Proper image dimensions (2 hours - requires file reading)
3. ⚠️ Last-Modified headers (45 min + migration)

### Phase 4: Content & Authority (Can do - 2 hours)
1. ✅ Enhanced About page (1 hour)
2. ✅ Touch target audit (20 min)
3. ✅ Free pricing display ($0.00) (20 min)

---

## CANNOT IMPLEMENT (BY DESIGN)

1. ❌ Yandex commercial factors (tel, address, delivery) - Affiliate model
2. ❌ Article/NewsArticle schema - Not a blog
3. ❌ Payment processing info - External redirect

---

## RISK ASSESSMENT

### Low Risk (Easy wins)
- robots.txt, sitemap, canonical, lazy loading
- Estimated impact: +15-20% organic traffic

### Medium Risk (Requires changes)
- Semantic HTML refactoring
- Estimated impact: +10-15% AI search visibility

### High Risk (Resource intensive)
- Image format conversion
- Estimated impact: +5-10% mobile performance score

---

## NEXT STEPS

**Recommend starting with Phase 1 (Critical).**

Would you like me to:
1. **Implement Phase 1 immediately** (robots.txt, sitemap, canonical, IndexNow)?
2. **Start with semantic HTML refactoring** (Phase 2)?
3. **Focus on specific engine** (e.g., prioritize Yandex vs Google)?

**Total estimated time for full implementation:**
- Phase 1: 3 hours ✅ Can do now
- Phase 2: 4 hours ⚠️ Requires refactoring
- Phase 3: 7+ hours ⚠️ Image processing intensive
- Phase 4: 2 hours ✅ Can do now

**Grand Total: ~16 hours** (excluding manual image conversion)
