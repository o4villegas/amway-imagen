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
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create campaign record
    const campaignId = await dbManager.createCampaign({
      product_id: productId,
      campaign_type: preferences.campaign_type,
      brand_style: preferences.brand_style,
      color_scheme: preferences.color_scheme,
      text_overlay: preferences.text_overlay,
      campaign_size: preferences.campaign_size,
      image_formats: preferences.image_formats,
      status: 'generating'
    });

    try {
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
            const aiInput = {
              prompt: prompt.text,
              num_steps: CAMPAIGN_CONFIG.AI_GENERATION_STEPS,
              guidance: CAMPAIGN_CONFIG.AI_GUIDANCE_SCALE,
              width: prompt.width,
              height: prompt.height
            };

            // PHASE 2 DEBUGGING: Log the exact prompt being sent to AI
            console.log(`[PHASE2_DEBUG] About to send prompt ${i + batchIndex + 1}:`, {
              format: prompt.format,
              promptLength: prompt.text.length,
              promptPreview: prompt.text.substring(0, 150) + '...',
              fullPrompt: prompt.text,
              aiInput: {
                num_steps: aiInput.num_steps,
                guidance: aiInput.guidance,
                width: aiInput.width,
                height: aiInput.height
              }
            });

            safeLog(`Generating image ${i + batchIndex + 1}`, {
              format: prompt.format,
              promptLength: prompt.text.length
            });

            const response = await withTimeout(
              AI.run('@cf/black-forest-labs/flux-1-schnell', aiInput),
              TIMEOUTS.AI_GENERATION,
              `AI generation for ${prompt.format}`
            ) as { image?: string };

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
            const r2Path = `campaigns/${campaignId}/images/${filename}`;

            // Store image individually in R2 for preview
            await withTimeout(
              CAMPAIGN_STORAGE.put(r2Path, imageBuffer, {
              httpMetadata: {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=3600' // Cache for 1 hour
              },
              customMetadata: {
                campaignId: campaignId.toString(),
                format: prompt.format,
                width: prompt.width.toString(),
                height: prompt.height.toString()
              }
            }),
              TIMEOUTS.R2_UPLOAD,
              'R2 image upload'
            );

            // Save to database with R2 path
            await withTimeout(
              dbManager.saveGeneratedImage({
              campaign_id: campaignId,
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

            // PHASE 2 DEBUGGING: Enhanced error logging
            console.error(`[PHASE2_DEBUG] AI Generation Failed for prompt ${i + batchIndex + 1}:`, {
              format: prompt.format,
              promptUsed: prompt.text,
              promptLength: prompt.text.length,
              errorType: error?.name,
              errorMessage: errorMessage,
              errorCode: error?.code,
              errorDetails: error?.details,
              errorStack: error?.stack?.substring(0, 500),
              isTimeout: error instanceof TimeoutError,
              isNSFWError: errorMessage.includes('NSFW') || errorMessage.includes('3030'),
              aiInputUsed: {
                num_steps: CAMPAIGN_CONFIG.AI_GENERATION_STEPS,
                guidance: CAMPAIGN_CONFIG.AI_GUIDANCE_SCALE,
                width: prompt.width,
                height: prompt.height
              },
              timestamp: new Date().toISOString()
            });

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
        console.error('[CRITICAL_FAILURE] All image generations failed', {
          requestedImages: imagePrompts.length,
          successfulImages: 0,
          campaignId,
          productId,
          timestamp: new Date().toISOString()
        });
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
      const campaignKey = `campaigns/${campaignId}_${Date.now()}.zip`;
      await withTimeout(
        CAMPAIGN_STORAGE.put(campaignKey, zipBuffer, {
        httpMetadata: {
          contentType: 'application/zip'
        },
        customMetadata: {
          campaignId: campaignId.toString(),
          productId: productId.toString(),
          totalImages: generatedImages.length.toString(),
          createdAt: Date.now().toString()
        }
      }),
        TIMEOUTS.R2_UPLOAD,
        'ZIP upload to R2'
      );

      // Generate download URL (expires based on config)
      const expiresAt = new Date(
        Date.now() + CAMPAIGN_CONFIG.DOWNLOAD_EXPIRY_HOURS * 60 * 60 * 1000
      ).toISOString();
      const downloadUrl = `/api/campaign/download/${campaignKey}`;

      // Update campaign with success
      await dbManager.updateCampaignStatus(campaignId, 'completed', downloadUrl, expiresAt);

      // Update stats
      const generationTime = (Date.now() - startTime) / 1000;
      await dbManager.updateCampaignStats(true, generatedImages.length, generationTime);

      return NextResponse.json({
        success: true,
        campaignId,
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

      // Update campaign with failure
      await dbManager.updateCampaignStatus(campaignId, 'failed');

      // Update stats
      const generationTime = (Date.now() - startTime) / 1000;
      await dbManager.updateCampaignStats(false, 0, generationTime);

      throw generationError;
    }

  } catch (error: any) {
    safeLog('Campaign generation error', {
      errorType: error?.name || 'Unknown',
      stage: 'overall'
    }, ['stack']);

    // Provide helpful error messages
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
      { error: 'Campaign generation failed. Please try again later.' },
      { status: 500 }
    );
  }
}