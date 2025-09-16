import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { DatabaseManager } from '@/lib/db';
import { PromptGenerator } from '@/lib/prompt-generator';
import { ZipCreator, CampaignFile, CampaignMetadata } from '@/lib/zip-creator';
import { CampaignPreferences } from '@/app/campaign/new/page';
import { rateLimiters } from '@/lib/rate-limiter';
import { generateCampaignSchema, validateRequest, safeLog } from '@/lib/validation';
import { withTimeout, TIMEOUTS, TimeoutError } from '@/lib/timeout-utils';
import { CAMPAIGN_CONFIG } from '@/lib/config';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.generate.isAllowed(request);
    if (!rateLimitResult.allowed) {
      console.error('[RATE_LIMIT] Generation blocked', { retryAfter: rateLimitResult.retryAfter });
      return NextResponse.json(
        { error: 'Too many generation requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '300'
          }
        }
      );
    }
    // Get context and verify bindings
    const context = getRequestContext();
    const { AI, CAMPAIGN_STORAGE, DB } = context.env;

    // Critical: Check if AI binding exists
    if (!AI) {
      console.error('[CRITICAL] AI binding not available in production!', {
        hasAI: false,
        hasStorage: !!CAMPAIGN_STORAGE,
        hasDB: !!DB,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Log successful binding verification
    console.log('[BINDINGS_CHECK] All services available', {
      hasAI: true,
      hasStorage: !!CAMPAIGN_STORAGE,
      hasDB: !!DB
    });

    // Validate and sanitize input
    const requestData = await request.json();
    const { productId, preferences } = validateRequest(generateCampaignSchema, requestData);

    safeLog('Campaign generation started', {
      productId,
      campaignType: preferences.campaign_type,
      campaignSize: preferences.campaign_size
    });

    const dbManager = new DatabaseManager(DB);

    // Get product information
    const product = await dbManager.getProductById(productId);
    if (!product) {
      return NextResponse.json(
        {
          error: 'Product not found in database',
          code: 'PRODUCT_NOT_FOUND',
          suggestion: 'Try scraping the product first, or use manual product entry if scraping is unavailable',
          helpEndpoints: {
            scrape: '/api/scrape',
            manualEntry: '/api/products/manual',
            seedDatabase: '/api/products/seed'
          }
        },
        { status: 404 }
      );
    }

    let campaignId: number | undefined;

    try {
      // Create campaign record
      campaignId = await dbManager.createCampaign({
        product_id: productId,
        campaign_type: preferences.campaign_type,
        brand_style: preferences.brand_style,
        color_scheme: preferences.color_scheme,
        text_overlay: preferences.text_overlay,
        campaign_size: preferences.campaign_size,
        image_formats: preferences.image_formats,
        status: 'generating'
      });
      // Generate prompts
      const promptGenerator = new PromptGenerator();
      const imagePrompts = promptGenerator.generateCampaignPrompts(product, preferences);

      const generatedImages: CampaignFile[] = [];
      const maxConcurrent = CAMPAIGN_CONFIG.MAX_CONCURRENT_GENERATIONS;

      // Process images in batches
      for (let i = 0; i < imagePrompts.length; i += maxConcurrent) {
        const batch = imagePrompts.slice(i, i + maxConcurrent);

        const batchPromises = batch.map(async (prompt, batchIndex) => {
          try {
            // FLUX-1-schnell optimized parameters
            const aiInput = {
              prompt: String(prompt.text),
              // FLUX-1-schnell specific parameters
              num_inference_steps: 4, // Fast generation
              guidance_scale: 0.0, // FLUX-1-schnell works better with lower guidance
              width: Number(prompt.width),
              height: Number(prompt.height)
            };

            // Log image generation attempt
            console.log(`Generating image ${i + batchIndex + 1} of ${imagePrompts.length}`);

            safeLog(`Generating image ${i + batchIndex + 1}`, {
              format: prompt.format,
              promptLength: prompt.text.length
            });

            // Enhanced AI generation with retry logic
            let response: { image?: string } | undefined;
            if (process.env.NODE_ENV === 'development') {
              console.warn('[DEV_MODE] Skipping AI generation - using mock response');
              // Create a small 1x1 PNG in base64 for testing
              const mockImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=';
              response = { image: mockImage };
            } else {
              // Retry logic for AI generation failures
              let lastError: any;
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  console.log(`[AI_GENERATION] Attempt ${attempt}/3 for ${prompt.format}`);
                  response = await withTimeout(
                    AI.run('@cf/black-forest-labs/flux-1-schnell', aiInput),
                    TIMEOUTS.AI_GENERATION,
                    `AI generation for ${prompt.format}`
                  ) as { image?: string };

                  if (response && response.image) {
                    console.log(`[AI_GENERATION] Success on attempt ${attempt}`);
                    break;
                  }
                } catch (error: any) {
                  lastError = error;
                  console.error(`[AI_GENERATION] Attempt ${attempt} failed:`, {
                    error: error.message,
                    code: error.code,
                    type: error.name
                  });

                  // If it's the last attempt, throw the error
                  if (attempt === 3) {
                    throw lastError;
                  }

                  // Wait before retry (exponential backoff)
                  await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                }
              }
            }

            if (!response || !response.image) {
              throw new Error('AI did not return image data');
            }

            // Convert base64 to ArrayBuffer
            const binaryString = atob(response.image);
            const imageBuffer = new ArrayBuffer(binaryString.length);
            const imageArray = new Uint8Array(imageBuffer);
            for (let j = 0; j < binaryString.length; j++) {
              imageArray[j] = binaryString.charCodeAt(j);
            }

            // Generate unique filename
            const filename = `${prompt.format}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
            const r2Path = `campaigns/${campaignId!}/images/${filename}`;

            // Store image individually in R2 for preview
            if (process.env.NODE_ENV !== 'development') {
              await withTimeout(
                CAMPAIGN_STORAGE.put(r2Path, imageBuffer, {
                httpMetadata: {
                  contentType: 'image/jpeg',
                  cacheControl: 'public, max-age=3600' // Cache for 1 hour
                },
                customMetadata: {
                  campaignId: campaignId!.toString(),
                  format: prompt.format,
                  width: prompt.width.toString(),
                  height: prompt.height.toString()
                }
              }),
                TIMEOUTS.R2_UPLOAD,
                'R2 image upload'
              );
            } else {
              console.warn('[DEV_MODE] Skipping R2 upload in development');
            }

            // Save to database with R2 path
            await withTimeout(
              dbManager.saveGeneratedImage({
              campaign_id: campaignId!,
              format: prompt.format,
              prompt: prompt.text,
              file_path: filename,
              r2_path: r2Path,
              width: prompt.width,
              height: prompt.height,
              selected: true // Default to selected
            }),
              TIMEOUTS.DB_OPERATION,
              'Database save'
            );

            return {
              filename: filename,
              content: imageBuffer,
              format: prompt.format
            } as CampaignFile;

          } catch (error: any) {
            const errorMessage = error instanceof TimeoutError
              ? `Timeout after ${error.timeoutMs}ms`
              : error?.message || error?.name || 'Unknown';


            // Critical: Log detailed AI failure information
            console.error('[AI_GENERATION_FAILED]', {
              format: prompt.format,
              errorType: error?.name,
              errorMessage: errorMessage,
              errorCode: error?.code,
              errorDetails: error?.details,
              isTimeout: error instanceof TimeoutError,
              timestamp: new Date().toISOString()
            });

            safeLog('Image generation failed', {
              format: prompt.format,
              errorType: errorMessage,
              isTimeout: error instanceof TimeoutError
            }, ['prompt', 'stack']);
            // Return null for failed generations - we'll filter these out
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const successfulImages = batchResults.filter((result): result is CampaignFile => result !== null);
        generatedImages.push(...successfulImages);

        safeLog(`Batch ${Math.floor(i / maxConcurrent) + 1} completed`, {
          successful: successfulImages.length,
          total: batch.length,
          successRate: (successfulImages.length / batch.length) * 100
        });
      }

      if (generatedImages.length === 0) {
        throw new Error('Failed to generate any images');
      }

      // Create ZIP file
      const zipCreator = new ZipCreator();
      const metadata: CampaignMetadata = {
        generated: new Date().toISOString(),
        totalImages: generatedImages.length,
        formats: Array.from(new Set(generatedImages.map(img => img.format))),
        product: {
          name: product.name,
          brand: product.brand || 'Amway',
          category: product.category
        },
        preferences: {
          campaign_type: preferences.campaign_type,
          brand_style: preferences.brand_style,
          campaign_size: preferences.campaign_size
        },
        usage: 'Created with Amway IBO Image Campaign Generator'
      };

      const zipBuffer = await withTimeout(
        zipCreator.createCampaignZip(generatedImages, metadata),
        TIMEOUTS.ZIP_CREATION,
        'ZIP file creation'
      );

      // Upload to R2
      const campaignKey = `campaigns/${campaignId!}_${Date.now()}.zip`;
      if (process.env.NODE_ENV !== 'development') {
        await withTimeout(
          CAMPAIGN_STORAGE.put(campaignKey, zipBuffer, {
          httpMetadata: {
            contentType: 'application/zip'
          },
          customMetadata: {
            campaignId: campaignId!.toString(),
            productId: productId.toString(),
            totalImages: generatedImages.length.toString(),
            createdAt: Date.now().toString()
          }
        }),
          TIMEOUTS.R2_UPLOAD,
          'ZIP upload to R2'
        );
      } else {
        console.warn('[DEV_MODE] Skipping ZIP upload to R2 in development');
      }

      // Generate download URL (expires based on config)
      const expiresAt = new Date(
        Date.now() + CAMPAIGN_CONFIG.DOWNLOAD_EXPIRY_HOURS * 60 * 60 * 1000
      ).toISOString();
      const downloadUrl = `/api/campaign/download/${campaignKey}`;

      // Update campaign with success
      await dbManager.updateCampaignStatus(campaignId!, 'completed', downloadUrl, expiresAt);

      // Update stats
      const generationTime = (Date.now() - startTime) / 1000;
      await dbManager.updateCampaignStats(true, generatedImages.length, generationTime);

      return NextResponse.json({
        success: true,
        campaignId: campaignId!,
        downloadUrl,
        expiresAt,
        totalImages: generatedImages.length,
        successfulImages: generatedImages.length,
        requestedImages: imagePrompts.length,
        generationTimeSeconds: generationTime
      });

    } catch (generationError: any) {
      safeLog('Campaign generation failed', {
        errorType: generationError?.name || 'Unknown',
        stage: 'generation'
      }, ['stack', 'prompt']);

      // Update campaign with failure (only if campaign was created)
      if (campaignId) {
        await dbManager.updateCampaignStatus(campaignId, 'failed');
      }

      // Update stats
      const generationTime = (Date.now() - startTime) / 1000;
      await dbManager.updateCampaignStats(false, 0, generationTime);

      throw generationError;
    }

  } catch (error: any) {
    // Enhanced error logging to find the real issue
    console.error('[CAMPAIGN_GENERATION_ERROR] Full details:', {
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack?.substring(0, 500),
      timestamp: new Date().toISOString()
    });

    safeLog('Campaign generation error', {
      errorType: error?.name || 'Unknown',
      stage: 'overall'
    }, ['stack']);

    // Provide helpful error messages
    if (error.message.includes('CHECK constraint failed: campaign_size')) {
      return NextResponse.json(
        {
          error: 'Invalid campaign size. Please select 1, 3, or 5 images.',
          validSizes: [1, 3, 5]
        },
        { status: 400 }
      );
    }

    if (error.message.includes('Failed to generate any images')) {
      return NextResponse.json(
        { error: 'AI image generation failed. Please try again with different preferences.' },
        { status: 503 }
      );
    }

    if (error.message.includes('Product not found')) {
      return NextResponse.json(
        { error: 'Product information not found. Please start over.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Campaign generation failed. Please try again later.'
      },
      { status: 500 }
    );
  }
}