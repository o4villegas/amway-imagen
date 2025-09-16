# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amway IBO Image Campaign Generator - A specialized application that converts Amway product URLs into professional marketing image campaigns. Uses AI-powered image generation with automatic product scraping, campaign configuration, and compliance integration.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Run local development server (http://localhost:3000)
npm run build        # Build Next.js application
npm run lint         # Run ESLint
npm run preview      # Build and preview with Wrangler Pages (http://localhost:8788)
npm run deploy       # Deploy to Cloudflare Pages
npm run cf-typegen   # Generate TypeScript types for Cloudflare environment

# Database commands (after D1 setup)
wrangler d1 execute DB --file=./schema.sql  # Initialize database
wrangler d1 migrations create DB init       # Create migration

# Testing commands
npx playwright test                    # Run all Playwright E2E tests
npx playwright test --ui              # Run tests in interactive UI mode
npx playwright test campaign-flow     # Run specific test suite
npx playwright show-report           # View test results
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Deployment**: Cloudflare Pages with Edge Runtime
- **AI**: Cloudflare Workers AI API (@cf/black-forest-labs/flux-1-schnell)
- **Storage**: Cloudflare R2 for campaign ZIP files
- **Database**: Cloudflare D1 for product data and campaign history
- **Web Scraping**: HTMLRewriter API for Amway product extraction

### Key Directories
- `/app` - Next.js App Router pages and API routes
  - `/campaign/new` - Multi-step campaign creation flow
  - `/api/scrape` - Amway product URL scraping endpoint
  - `/api/campaign/generate` - AI image generation and ZIP creation
  - `/api/campaign/download` - Campaign download management
- `/components/campaign` - Campaign-specific UI components
  - `URLInput.tsx` - Product URL input and validation
  - `ProductPreview.tsx` - Scraped product information display
  - `PreferencesPanel.tsx` - Campaign configuration interface
  - `GenerationProgress.tsx` - Real-time generation progress
  - `DownloadManager.tsx` - Campaign download and management
- `/lib` - Core business logic
  - `scraper.ts` - Amway website scraping functionality
  - `prompt-generator.ts` - AI prompt generation system
  - `zip-creator.ts` - Campaign packaging and ZIP creation
  - `db.ts` - D1 database operations

### Core Functionality

1. **Product Scraping Flow**:
   - User enters Amway product URL
   - HTMLRewriter extracts product data (JSON-LD + meta tags)
   - Product info stored in D1 database with caching (24hr)
   - Extracted data: name, description, benefits, category, price, images

2. **Campaign Configuration**:
   - Campaign type: Product focus vs Lifestyle focus
   - Brand style: Professional, Casual, Wellness, Luxury
   - Image formats: Instagram Post/Story, Facebook Cover, Pinterest
   - Text overlay density: Minimal, Moderate, Heavy
   - Campaign size: 5, 10, or 15 images

3. **AI Image Generation Pipeline**:
   - Dynamic prompt generation based on product data and preferences
   - Batch AI generation (max 3 concurrent for performance)
   - Compliance text automatically included based on product category
   - Multiple format variations with optimized dimensions

4. **Campaign Packaging & Download**:
   - Images organized by format in ZIP structure
   - Campaign metadata and usage guidelines included
   - 24-hour download expiration with automatic cleanup
   - Organized folder structure for easy social media use

### Database Schema

- **products**: Scraped Amway product information with caching
- **campaigns**: User campaign configurations and status tracking
- **generated_images**: Individual image records with metadata
- **campaign_stats**: Analytics for generation success rates and performance

### Testing Architecture

- **E2E Testing**: Playwright with comprehensive test suites covering campaign flow, API endpoints, and UX compliance
- **Test Environment**: Configured to run against local Wrangler preview server (port 8788)
- **Test Coverage**: Campaign creation flow, product scraping, AI generation, download functionality, responsive design
- **Test Organization**: Organized in `/tests` directory with specific test files for different features

### Cloudflare Integration

- **D1 Database**: `DB` binding for campaign and product data
- **R2 Storage**:
  - `BUCKET` - Legacy bucket (kept for compatibility)
  - `CAMPAIGN_STORAGE` - Campaign ZIP file storage
- **AI Workers**: `AI` binding for Flux-1-Schnell image generation
- **HTMLRewriter**: Native HTML parsing for product scraping

## Important Notes

- All API routes use edge runtime (`export const runtime = 'edge'`)
- Product scraping supports amway.com domain with URL validation
- Images generated with compliance disclaimers based on product category
- Campaign files expire after 24 hours and are automatically cleaned up
- Prompt generation is context-aware based on product category and benefits
- ZIP files include usage guidelines and compliance information
- Database operations include error handling and stats tracking
- Development uses Next.js dev server (port 3000), testing/preview uses Wrangler (port 8788)

### Text Preservation in AI Image Generation

**Critical for Product Marketing**: AI image models like FLUX-1-schnell struggle with text preservation, especially product labels, brand names, and trademark symbols.

**Enhanced Text Preservation Techniques Implemented**:
- **Crystal Clear Text Instructions**: Prompts include explicit text clarity requirements
- **Brand Name Preservation**: Specific instructions to maintain brand typography and readability
- **Trademark Symbol Protection**: Preserves ™, ®, © symbols in product names
- **Label Positioning**: Optimizes camera angles for front-facing, readable text
- **Typography Integrity**: Maintains original font weights and styling
- **FLUX-1-schnell Optimizations**: Specific anti-blur and distortion instructions

**Usage Guidelines**:
- Product-focus campaigns receive maximum text preservation treatment
- Lifestyle campaigns maintain brand text when visible but allow more creative freedom
- Complex product names with numbers/symbols get enhanced preservation
- Text preservation varies randomly to create natural-looking campaigns while maintaining readability

**Files Modified for Text Preservation**:
- `lib/prompt-generator.ts`: Core text preservation logic and techniques
- `lib/prompt-templates.ts`: Enhanced templates with text clarity instructions