# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amway IBO Image Campaign Generator - A production-ready, specialized application that converts Amway product URLs into professional marketing image campaigns. Features Claude API-powered product extraction, description-based AI image generation, marketing copy generation, and comprehensive campaign packaging.

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
- **AI Image Generation**: Cloudflare Workers AI API (@cf/black-forest-labs/flux-1-schnell)
- **AI Product Extraction**: Claude API (Sonnet 4) for robust product scraping
- **Storage**: Cloudflare R2 for campaign ZIP files
- **Database**: Cloudflare D1 for product data and campaign history

### Key Directories
- `/app` - Next.js App Router pages and API routes
  - `/campaign/new` - Simplified URL-first campaign creation flow
  - `/api/products/load` - Claude API product extraction endpoint
  - `/api/campaign/generate` - AI image generation with marketing copy
  - `/api/campaign/download` - Campaign download management
- `/components/campaign` - Campaign-specific UI components
  - `SimpleUrlInput.tsx` - Google-like minimal URL input
  - `ScrapingProgress.tsx` - 4-stage extraction progress indicator
  - `ProductPreview.tsx` - Extracted product information display
  - `PreferencesPanel.tsx` - Campaign configuration (no text overlay options)
  - `GenerationProgress.tsx` - Real-time generation progress
  - `DownloadManager.tsx` - Campaign download with marketing copy
- `/lib` - Core business logic
  - `ai-scraper.ts` - Claude API integration for product extraction
  - `prompt-generator.ts` - Description-based image generation system
  - `copy-generator.ts` - Marketing copy generation for each image
  - `cache-manager.ts` - 24-hour product caching system
  - `zip/` - Campaign packaging with images + marketing copy
  - `db.ts` - D1 database operations

### Core Functionality

1. **Google-Like Landing Page**:
   - Minimal design with single URL input field
   - Tagline: "Transform Amway products into campaigns"
   - Clean, spacious layout focusing on simplicity
   - Direct navigation to campaign creation flow

2. **Claude API Product Extraction**:
   - Robust AI-powered scraping using Claude API
   - 4-stage progress indicator: Fetching → Extracting → Analyzing → Ready
   - 24-hour caching to reduce API costs and improve performance
   - Rate limiting: 10 scrapes per user per hour
   - Comprehensive product data extraction (name, description, benefits, category)

3. **Campaign Configuration**:
   - Brand style: Professional, Casual, Wellness, Luxury
   - Image formats: Instagram Post/Story, Facebook Cover, Pinterest, LinkedIn
   - Campaign type: Lifestyle focus (benefit-based imagery)
   - Campaign size: Standardized to 5 images per campaign
   - **NO text overlay options** - Clean images with separate marketing copy

4. **Description-Based AI Image Generation**:
   - Lifestyle and benefit-focused imagery (NOT product recreation)
   - Clean images without burned-in text or product visuals
   - Dynamic prompts based on product benefits and emotional outcomes
   - Batch AI generation (max 3 concurrent for performance)
   - Multiple format variations with optimized dimensions

5. **Marketing Copy Generation**:
   - AI-generated marketing copy for each image
   - Platform-appropriate captions and messaging
   - Compliance disclaimers based on product category
   - Copy included in campaign ZIP downloads

6. **Campaign Packaging & Download**:
   - Clean images organized by format in ZIP structure
   - Separate marketing copy file with captions for each image
   - Campaign metadata and usage guidelines included
   - 24-hour download expiration with automatic cleanup

### Database Schema

- **products**: Claude API extracted product information with 24-hour caching
  - Added: `scraping_method` (default: 'claude-api')
  - Added: `cached_until` timestamp for cache expiration
- **campaigns**: User campaign configurations and status tracking
- **generated_images**: Individual image records with metadata
  - Added: `marketing_copy` TEXT for generated captions
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
- **External APIs**: Claude API for product extraction (requires `CLAUDE_API_KEY` secret)

## Important Notes

- All API routes use edge runtime (`export const runtime = 'edge'`)
- Product extraction uses Claude API with 24-hour caching and rate limiting
- **NEW APPROACH**: Description-based image generation (NO product recreation)
- Images are clean without text overlays - marketing copy is separate
- Campaign files expire after 24 hours and are automatically cleaned up
- Prompt generation focuses on benefits and lifestyle outcomes, not product features
- ZIP files include clean images + separate marketing copy file
- Database operations include error handling and stats tracking
- Development uses Next.js dev server (port 3000), testing/preview uses Wrangler (port 8788)
- Production-safe logging with `devLog` from `lib/env-utils.ts`
- Request deduplication available via `lib/request-dedup.ts`
- Health checks available at `/api/health`, `/api/health/ready`, `/api/health/live`
- **Major Architecture Change**: Claude API scraping + simplified UI workflow

### New Image Generation Strategy

**Problem Solved**: Previous product recreation approach failed due to AI limitations with text, branding, and product accuracy.

**NEW: Description-Based Imagery**:
- **No Product Recreation**: Images focus on benefits and lifestyle outcomes
- **Clean Images**: No text overlays, branding, or product visuals burned into images
- **Separate Marketing Copy**: AI-generated captions and messaging for each image
- **Benefit-Focused**: Emotional and aspirational imagery showing product outcomes
- **Compliance Safe**: No risk of inaccurate product representation

**Implementation**:
- **Lifestyle Scenes**: People experiencing product benefits (energy, confidence, wellness)
- **Environmental Context**: Natural settings, home environments, wellness spaces
- **Emotional Connection**: Focus on feelings and outcomes, not product features
- **Professional Quality**: Commercial photography aesthetic without product constraints

**Files Modified for New Strategy**:
- `lib/prompt-generator.ts`: Complete rewrite for description-based prompts
- `lib/copy-generator.ts`: New marketing copy generation system
- `app/api/campaign/generate/route.ts`: Clean image + copy generation

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