# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amway IBO Image Campaign Generator - A production-ready, specialized application that converts Amway product URLs into professional marketing image campaigns. Features AI-powered image generation with automatic product scraping, campaign configuration, compliance integration, and comprehensive error handling.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Run local development server (http://localhost:3000)
npm run build        # Build for Next.js
npm run build:worker # Build with @opennextjs/cloudflare for Workers deployment
npm run lint         # Run ESLint
npm run preview      # Build and preview with Wrangler Workers (http://localhost:8788)
npm run deploy       # Deploy to Cloudflare Workers
npm run cf-typegen   # Generate TypeScript types for Cloudflare environment

# Database commands (after D1 setup)
wrangler d1 execute DB --file=./schema.sql  # Initialize database
wrangler d1 migrations create DB init       # Create migration

# Testing commands (Enhanced)
npm run test:setup                    # Setup test environment and dependencies
npm run test:install                  # Install Playwright browsers
npm run test:deps                     # Install browser system dependencies
npm run test                          # Run all E2E tests (headless)
npm run test:ui                       # Run tests in interactive UI mode
npm run test:headed                   # Run tests with browser visible
npm run test:dev                      # Run tests against dev server (port 3000)
npx playwright test campaign-flow     # Run specific test suite
npx playwright show-report           # View comprehensive test results
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Deployment**: Cloudflare Workers with Node.js Runtime
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
  - `zip/` - Campaign packaging and ZIP creation utilities
    - `zip-builder.ts` - Core ZIP file building functionality
    - `zip-file-manager.ts` - ZIP file management and organization
  - `db.ts` - D1 database operations

### Core Functionality

1. **Enhanced Product Browser Flow**:
   - Comprehensive product dataset with 11 realistic Amway products
   - Visual availability system: 3 working products + 8 "Coming Soon" disabled products
   - Intelligent product selection with visual disabled states (greyed out, cursor-not-allowed)
   - Professional UX with "Coming Soon" badges for unavailable products
   - Maintains aesthetic appeal while clearly indicating functionality boundaries

2. **Campaign Configuration**:
   - Campaign type: Product focus vs Lifestyle focus
   - Brand style: Professional, Casual, Wellness, Luxury
   - Image formats: Instagram Post/Story, Facebook Cover, Pinterest
   - Text overlay density: Minimal, Moderate, Heavy
   - Campaign size: Standardized to 5 images per campaign

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

- **E2E Testing**: Playwright with comprehensive cross-browser testing (Chromium, Firefox, WebKit, Mobile Chrome/Safari)
- **Test Environment**: Dynamic server configuration with intelligent port detection (dev:3000, preview:8788)
- **Test Coverage**: Complete user journeys, API endpoints, error handling, performance monitoring, accessibility compliance
- **Test Organization**: Organized in `/tests` directory with modular structure:
  - `/tests/core/` - API endpoint validation and error handling scenarios
  - `/tests/ui/` - User journey flows and interface compliance testing
  - `/tests/performance/` - Load times, Core Web Vitals, and responsiveness validation
  - `/tests/helpers/` - Shared utilities, mock data, and test infrastructure
- **Browser Dependencies**: Automated detection and setup for cross-platform compatibility (WSL, CI, local dev)
- **Environment Parity**: Mock data strategies that maintain functionality across test and production environments

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
- Production-safe logging with `devLog` from `lib/env-utils.ts`
- Request deduplication available via `lib/request-dedup.ts`
- Health checks available at `/api/health`, `/api/health/ready`, `/api/health/live`
- **Recent Improvements**: Complete Cloudflare Workers migration with enhanced UI/UX and benefit-focused AI strategy

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

## Production Best Practices

### Error Handling
- **Error Boundaries**: All critical components wrapped with `ErrorBoundary` from `components/ErrorBoundary.tsx`
- **API Error Responses**: Consistent error format with appropriate HTTP status codes
- **Async Operations**: Use `Promise.allSettled()` for bulk operations to handle partial failures gracefully
- **Logging**: Use `devLog` for development, `logError` for production errors

### Security
- **Input Validation**: All user inputs validated with Zod schemas in `lib/validation.ts`
- **Sanitization**: XSS prevention with `sanitizeString()`, `sanitizeHtml()`, and `sanitizeSearchQuery()`
- **Environment Variables**: Use `getEnvVar()` from `lib/env-utils.ts` for safe access
- **Rate Limiting**: API endpoints protected with rate limiters from `lib/rate-limiter.ts`

### Performance Optimization
- **Request Deduplication**: Use `RequestDeduplicator` to prevent duplicate API calls
- **Database Operations**: Batch operations with `batchExecute()` from `lib/db-utils.ts`
- **Retry Logic**: Use `retryOperation()` with exponential backoff for transient failures
- **Connection Pooling**: D1 handles this automatically, no manual pooling needed

### Testing
- **100% Test Coverage**: All critical paths have Playwright E2E tests
- **Cross-Browser Support**: Tests run on Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Test Helpers**: Use `createCampaignFlowHelper()` for consistent test flows
- **Mock Data**: Comprehensive mocking for API endpoints during tests

### Monitoring
- **Health Checks**: Three endpoints for different monitoring needs:
  - `/api/health` - Comprehensive service status
  - `/api/health/ready` - Deployment readiness check
  - `/api/health/live` - Simple liveness probe
- **Metrics**: Track campaign success rates, generation times, and error rates

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: No warnings or errors allowed
- **Component Structure**: Follow existing patterns for consistency
- **Documentation**: Keep CLAUDE.md and README.md updated with changes