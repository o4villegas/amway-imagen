# Amway IBO Image Campaign Generator

> Transform any Amway product URL into professional marketing image campaigns using AI

A powerful web application that automatically scrapes Amway product information and generates cohesive, compliant marketing images optimized for multiple social media platforms.

## ✨ Features

- **🔗 Smart Product Scraping** - Extract product details from any Amway URL
- **🤖 AI-Powered Image Generation** - Create professional marketing visuals with Cloudflare Workers AI
- **📱 Multi-Platform Optimization** - Instagram Posts/Stories, Facebook Covers, Pinterest Pins
- **⚖️ Automatic Compliance** - Built-in disclaimers and regulatory text
- **🎨 Customizable Styles** - Professional, Casual, Wellness, and Luxury themes
- **📦 Organized Downloads** - ZIP packages with usage guidelines and metadata
- **⚡ Edge Computing** - Fast generation powered by Cloudflare's global network

## 🚀 Live Demo

[View Live Application](https://amway-imagen.pages.dev) *(Replace with actual deployment URL)*

## 📸 Screenshots

*Screenshots will be added after deployment*

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers (Edge Runtime)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (Object Storage)
- **AI**: Cloudflare Workers AI (Flux-1-Schnell)
- **UI Components**: shadcn/ui, Radix UI
- **Deployment**: Cloudflare Pages

## 📋 Prerequisites

- Node.js 18+
- Cloudflare account with Workers and Pages enabled
- Wrangler CLI installed globally: `npm install -g wrangler`

## 🔧 Installation & Setup

### 1. Clone Repository

```bash
git clone git@github.com:o4villegas/amway-imagen.git
cd amway-imagen
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Required UI Dependencies

```bash
npm install @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-checkbox
npm install class-variance-authority
```

### 4. Cloudflare Setup

#### Create D1 Database
```bash
wrangler d1 create amway-image-gen
```

Copy the database ID from the output and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "amway-image-gen"
database_id = "your-database-id-here"  # Replace placeholder
```

#### Create R2 Buckets
```bash
wrangler r2 bucket create amway-campaigns
wrangler r2 bucket create ai-img-playground  # Legacy bucket
```

#### Initialize Database Schema
```bash
wrangler d1 execute amway-image-gen --file=./schema.sql
```

### 5. Environment Configuration

Update `wrangler.toml` with your Cloudflare Account ID:
```toml
[vars]
CLOUDFLARE_ACCOUNT_ID = "your-account-id"
CAMPAIGN_EXPIRY_HOURS = "24"
MAX_IMAGES_PER_CAMPAIGN = "15"
```

### 6. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🚀 Deployment

### Deploy to Cloudflare Pages

```bash
npm run deploy
```

### Manual Deployment Steps

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy with Wrangler**:
   ```bash
   npx @cloudflare/next-on-pages
   wrangler pages deploy .vercel/output/static
   ```

## 📖 Usage Guide

### Creating a Campaign

1. **Enter Product URL**: Paste any Amway product page URL
2. **Review Product Info**: Verify extracted product details
3. **Configure Campaign**: Choose style, formats, and campaign size
4. **Generate Images**: Wait for AI to create your marketing images
5. **Download Package**: Get organized ZIP file with all assets

### Supported Amway URLs

- `https://www.amway.com/en_US/p/[product-id]`
- `https://www.amway.com/en_US/[product-name]-p-[product-id]`

### Image Formats Available

- **Instagram Post**: 1080×1080px (Square)
- **Instagram Story**: 1080×1920px (Vertical)
- **Facebook Cover**: 1200×675px (Landscape)
- **Pinterest Pin**: 1000×1500px (Vertical)

## 🔍 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scrape` | POST | Extract product data from Amway URL |
| `/api/campaign/generate` | POST | Generate AI images and create campaign |
| `/api/campaign/download/[key]` | GET | Download campaign ZIP file |

## 🗄️ Database Schema

The application uses Cloudflare D1 with the following tables:

- **products** - Scraped product information with caching
- **campaigns** - Campaign configurations and status
- **generated_images** - Individual image records
- **campaign_stats** - Usage analytics and performance metrics

## 🔧 Configuration

### Environment Variables

All configuration is handled through `wrangler.toml`:

```toml
[vars]
CLOUDFLARE_ACCOUNT_ID = "your-account-id"
CAMPAIGN_EXPIRY_HOURS = "24"           # Campaign download expiration
MAX_IMAGES_PER_CAMPAIGN = "15"        # Maximum images per campaign
```

### Cloudflare Bindings

- **AI** - Workers AI for image generation
- **DB** - D1 database for data storage
- **BUCKET** - R2 bucket for legacy image storage
- **CAMPAIGN_STORAGE** - R2 bucket for campaign ZIP files

## 🛠️ Development

### Project Structure

```
app/
├── campaign/new/          # Campaign creation flow
├── api/scrape/           # Product scraping endpoint
├── api/campaign/         # Campaign generation & download
└── page.tsx              # Landing page

components/
├── campaign/             # Campaign-specific components
└── ui/                   # Reusable UI components

lib/
├── scraper.ts           # Amway product scraping
├── prompt-generator.ts  # AI prompt generation
├── zip-creator.ts       # Campaign packaging
└── db.ts                # Database operations
```

### Adding New Features

1. **Product Categories**: Update scraper.ts classification logic
2. **Image Formats**: Add dimensions to prompt-generator.ts
3. **Compliance Text**: Modify disclaimer templates in prompt-generator.ts
4. **UI Themes**: Extend style options in PreferencesPanel.tsx

## 🧪 Testing

### Test Product URLs

Use these example URLs for testing:

```
https://www.amway.com/en_US/p/326782  # Nutrilite Begin 30
https://www.amway.com/en_US/p/110798  # XS Energy Drink
https://www.amway.com/en_US/p/100186  # Nutrilite Daily
```

### Local Testing

```bash
# Test build
npm run build

# Test linting
npm run lint

# Test with Wrangler dev (requires D1 setup)
wrangler pages dev .vercel/output/static
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
- Ensure D1 database is created and ID is updated in wrangler.toml
- Run schema initialization: `wrangler d1 execute DB --file=./schema.sql`

**R2 Bucket Access Denied**
- Verify bucket names match wrangler.toml configuration
- Check Cloudflare account permissions

**Product Scraping Failures**
- Verify URL format matches supported Amway patterns
- Check if product page structure has changed

**Image Generation Timeouts**
- Reduce campaign size or formats
- Check Cloudflare Workers AI quota limits

### Debug Mode

Enable detailed logging by checking browser console and Wrangler logs:

```bash
wrangler pages dev .vercel/output/static --log-level debug
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/o4villegas/amway-imagen/issues)
- **Documentation**: Check CLAUDE.md for technical details
- **Cloudflare Docs**: [Workers](https://developers.cloudflare.com/workers/) | [Pages](https://developers.cloudflare.com/pages/) | [D1](https://developers.cloudflare.com/d1/)

## ⚖️ Disclaimer

This application is designed for authorized Amway IBOs (Independent Business Owners) only. Generated images include appropriate compliance disclaimers. Users are responsible for following local advertising regulations and Amway brand guidelines.

---

**Built with ❤️ using Cloudflare's edge computing platform**