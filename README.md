# Free Modern Creative Stuff

A modern, fast, and SEO-optimized showcase website for Creative Fabrica products (fonts, graphics, and design resources).

## Features

- 🚀 **Fast & SEO-Optimized**: Built with Astro for lightning-fast performance
- 🎨 **Modern Design**: Beautiful, responsive UI with gradient accents
- 🔍 **Search & Filter**: Easy-to-use search functionality
- 🤖 **AI-Powered SEO**: DeepSeek API integration for automatic SEO optimization
- 💾 **Turso Database**: Edge database for fast global access
- 📱 **Responsive**: Works perfectly on all devices

## Tech Stack

- **Framework**: Astro 4.x with TypeScript (strict mode)
- **Database**: Turso (libSQL)
- **AI**: DeepSeek via OpenRouter for SEO optimization
- **Deployment**: Vercel
- **Styling**: Native CSS with modern gradients

## API Endpoints

### Initialize Database
```bash
GET /api/init-db
```
Creates the products table in Turso database.

### Publish Product
```bash
POST /api/publish
```
- Selects a random product from `data.csv`
- Optimizes title and description with DeepSeek AI
- Saves to Turso database
- Removes the product from CSV (one-time publish)

## Environment Variables

Create a `.env` file with:

```env
TURSO_DATABASE_URL=your_turso_url
TURSO_AUTH_TOKEN=your_turso_token
DEEPSEEK_API_KEY=your_deepseek_api_key
REFERRAL_TAG=/ref/16577150/?sharedfrom=pdp
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to Vercel

1. **Connect Repository**: Import your GitHub repo to Vercel
2. **Set Environment Variables** in Vercel dashboard:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `DEEPSEEK_API_KEY`
   - `REFERRAL_TAG`
3. **Deploy**: Vercel will auto-deploy on push to main

### First-Time Setup

After deployment:

1. Initialize database:
   ```bash
   curl https://your-site.vercel.app/api/init-db
   ```

2. Publish your first product:
   ```bash
   curl -X POST https://your-site.vercel.app/api/publish
   ```

## CSV Format

`data.csv` format (semicolon-separated):
```
SearchKey;URL;Title;Breadcrumbs;ProductID;Description;Tags;ImageURLs
```

## Project Structure

```
creative/
├── src/
│   ├── layouts/
│   │   └── Layout.astro        # Main layout
│   ├── pages/
│   │   ├── index.astro         # Home page
│   │   ├── about.astro         # About page
│   │   ├── privacy.astro       # Privacy policy
│   │   └── api/
│   │       ├── init-db.ts      # Database initialization
│   │       └── publish.ts      # Product publishing endpoint
│   ├── lib/
│   │   ├── db.ts              # Turso database client
│   │   ├── csv.ts             # CSV parsing utilities
│   │   └── deepseek.ts        # DeepSeek AI integration
│   └── components/            # Reusable components
├── public/
│   └── images/                # Product images
├── data.csv                   # Product database
└── astro.config.mjs          # Astro configuration
```

## License

MIT

## Partner

Proudly partnered with [Creative Fabrica](https://www.creativefabrica.com/ref/16577150/)
