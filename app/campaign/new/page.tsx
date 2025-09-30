'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { SimpleUrlInput } from '@/components/campaign/SimpleUrlInput';
import { ScrapingProgress } from '@/components/campaign/ScrapingProgress';
import { ProductPreview } from '@/components/campaign/ProductPreview';
import { PreferencesPanel } from '@/components/campaign/PreferencesPanel';
import { GenerationProgress } from '@/components/campaign/GenerationProgress';
import { DownloadManager } from '@/components/campaign/DownloadManager';
import { ImageGallery } from '@/components/campaign/ImageGallery';
import { ProgressIndicator } from '@/components/campaign/ProgressIndicator';
import { StoredProduct } from '@/lib/db';
import { ErrorBoundary, CampaignErrorFallback } from '@/components/ErrorBoundary';

export type CampaignStep = 'url-input' | 'processing' | 'configure' | 'generate' | 'preview' | 'download';

export interface CampaignPreferences {
  campaign_type: 'lifestyle'; // Fixed to lifestyle with benefit-focused approach
  brand_style: 'professional' | 'casual' | 'wellness' | 'luxury';
  color_scheme: 'amway_brand' | 'product_inspired' | 'custom';
  text_overlay: 'minimal' | 'moderate' | 'heavy';
  campaign_size: 5;
  image_formats: Array<'facebook_post' | 'instagram_post' | 'pinterest' | 'snapchat_ad' | 'linkedin_post'>;
  // Phase 1c - Outcome-focused customization
  moodProfile: 'energetic' | 'serene' | 'confident' | 'aspirational' | 'professional';
  lightingType: 'natural' | 'studio' | 'dramatic' | 'soft' | 'golden_hour';
  compositionStyle: 'centered' | 'rule_of_thirds' | 'dynamic' | 'minimalist';
  colorMood: 'warm' | 'cool' | 'vibrant' | 'muted' | 'high_contrast';
  visualFocus: 'outcome_lifestyle' | 'outcome_environmental' | 'outcome_conceptual' | 'outcome_natural' | 'mixed_outcomes';
  sceneType: 'individual_focus' | 'family_moment' | 'lifestyle_action' | 'environmental_concept';
  environmentType: 'indoor_home' | 'outdoor_nature' | 'wellness_space' | 'urban_setting';
  timeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening' | 'golden_hour';
}

// Legacy interface for backward compatibility validation (internal use)
export interface CampaignPreferencesLegacy {
  campaign_type: 'product_focus' | 'lifestyle';
  brand_style: 'professional' | 'casual' | 'wellness' | 'luxury';
  color_scheme: 'amway_brand' | 'product_inspired' | 'custom';
  text_overlay: 'minimal' | 'moderate' | 'heavy';
  campaign_size: 1 | 3 | 5 | 10 | 15;
  image_formats: Array<'facebook_post' | 'instagram_post' | 'pinterest' | 'snapchat_ad' | 'linkedin_post'>;
}

export interface GenerationResult {
  campaignId: number;
  downloadUrl?: string;
  expiresAt?: string;
  totalImages: number;
}

// Smart defaults based on product category
const getSmartDefaults = (product?: StoredProduct): CampaignPreferences => {
  const category = product?.category?.toLowerCase();

  return {
    campaign_type: 'lifestyle',
    brand_style: category === 'nutrition' ? 'wellness' :
                category === 'beauty' ? 'luxury' :
                category === 'home' ? 'professional' : 'professional',
    color_scheme: 'product_inspired', // More dynamic than static amway_brand
    text_overlay: 'moderate',
    campaign_size: 5,
    image_formats: ['facebook_post', 'instagram_post', 'pinterest', 'snapchat_ad', 'linkedin_post'],
    // Phase 1c - Category-specific outcome defaults
    moodProfile: category === 'nutrition' ? 'energetic' :
                 category === 'beauty' ? 'confident' :
                 category === 'home' ? 'serene' : 'professional',
    lightingType: category === 'beauty' ? 'soft' : 'natural',
    compositionStyle: 'rule_of_thirds',
    colorMood: category === 'nutrition' ? 'vibrant' :
               category === 'beauty' ? 'warm' : 'warm',
    visualFocus: 'outcome_lifestyle',
    sceneType: 'individual_focus',
    environmentType: category === 'nutrition' ? 'wellness_space' :
                     category === 'beauty' ? 'indoor_home' :
                     category === 'home' ? 'indoor_home' : 'indoor_home',
    timeOfDay: 'morning'
  };
};

const defaultPreferences: CampaignPreferences = getSmartDefaults();

function NewCampaignContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<CampaignStep>('url-input');
  const [productInfo, setProductInfo] = useState<StoredProduct | null>(null);
  const [preferences, setPreferences] = useState<CampaignPreferences>(defaultPreferences);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [scrapingStage, setScrapingStage] = useState(1);
  const [scrapingError, setScrapingError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  // Check for URL parameter from landing page
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam);
      setCurrentUrl(decodedUrl);
      handleUrlSubmit(decodedUrl);
    }
  }, [searchParams]);

  const handleUrlSubmit = async (url: string) => {
    setCurrentUrl(url);
    setStep('processing');
    setScrapingStage(1);
    setScrapingError('');

    try {
      // Stage 1: Start extraction
      setScrapingStage(1);

      // Stage 2: Call API
      setScrapingStage(2);
      const response = await fetch('/api/products/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          userId: 'anonymous' // In production, use actual user ID
        }),
      });

      const data = await response.json() as { message?: string; product?: any; success?: boolean };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to extract product information');
      }

      // Stage 3: Process results
      setScrapingStage(3);

      // Stage 4: Complete
      setScrapingStage(4);
      setProductInfo(data.product);

      // Apply smart defaults based on product category
      setPreferences(getSmartDefaults(data.product));

    } catch (error) {
      setScrapingError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleScrapingComplete = () => {
    // Go to configure step for user customization
    setStep('configure');
  };

  const handleScrapingRetry = () => {
    setStep('url-input');
    setScrapingError('');
    setScrapingStage(1);
  };

  const handlePreferencesComplete = () => {
    setStep('generate');
  };

  const handleGenerationComplete = (result: GenerationResult) => {
    setGenerationResult(result);
    setStep('preview');
  };

  const handleApprovalComplete = async () => {
    if (!generationResult) return;

    try {
      const response = await fetch(`/api/campaign/${generationResult.campaignId}/package`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign package');
      }

      const { downloadUrl, expiresAt, totalImages } = await response.json() as {
        downloadUrl: string;
        expiresAt: string;
        totalImages: number;
      };

      setGenerationResult(prev => ({
        ...prev!,
        downloadUrl,
        expiresAt,
        totalImages
      }));

      setStep('download');
    } catch (error) {
      console.error('Packaging failed:', error);
      // TODO: Add error handling UI
    }
  };

  const handleStartNewCampaign = () => {
    setStep('url-input');
    setProductInfo(null);
    setPreferences(defaultPreferences);
    setGenerationResult(null);
    setScrapingError('');
    setScrapingStage(1);
    setCurrentUrl('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Image
            src="/amway_logo.png"
            alt="Amway"
            width={120}
            height={40}
            className="h-10 w-auto"
            unoptimized
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              IBO Image Campaign Generator
            </h1>
            <p className="text-gray-600">
              Generate professional marketing images for your Amway products
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={step} />

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {step === 'url-input' && (
            <div className="p-6">
              <SimpleUrlInput
                onSubmit={handleUrlSubmit}
                isLoading={false}
                initialUrl={currentUrl}
                error={scrapingError}
              />
            </div>
          )}

          {step === 'processing' && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Processing & Setup
                  </h2>
                  <p className="text-gray-600">
                    Extracting product information and preparing your campaign with smart defaults.
                  </p>
                </div>

                <ScrapingProgress
                  currentStage={scrapingStage}
                  error={scrapingError}
                  onComplete={handleScrapingComplete}
                />

                {productInfo && (
                  <div className="mt-6">
                    <ProductPreview product={productInfo} />
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-medium text-green-900 mb-2">Smart Campaign Setup Applied</div>
                      <div className="text-sm text-green-700">
                        Optimized for {productInfo.category} products with {preferences.brand_style} styling and {preferences.color_scheme} color scheme.
                      </div>
                    </div>
                  </div>
                )}

                {scrapingError && (
                  <div className="mt-6 flex gap-4 justify-center">
                    <button
                      onClick={handleScrapingRetry}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'configure' && productInfo && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Customize Your Campaign
                  </h2>
                  <p className="text-gray-600">
                    Fine-tune how your marketing images will look and feel.
                  </p>
                </div>

                <ProductPreview product={productInfo} />

                <PreferencesPanel
                  preferences={preferences}
                  onChange={setPreferences}
                  onComplete={handlePreferencesComplete}
                />
              </div>
            </div>
          )}

          {step === 'generate' && productInfo && (
            <ErrorBoundary fallback={CampaignErrorFallback}>
              <GenerationProgress
                product={productInfo}
                preferences={preferences}
                onComplete={handleGenerationComplete}
              />
            </ErrorBoundary>
          )}

          {step === 'preview' && generationResult && (
            <ErrorBoundary fallback={CampaignErrorFallback}>
              <ImageGallery
                campaignId={generationResult.campaignId}
                onComplete={handleApprovalComplete}
              />
            </ErrorBoundary>
          )}

          {step === 'download' && generationResult && generationResult.downloadUrl && (
            <DownloadManager
              result={generationResult as GenerationResult & { downloadUrl: string; expiresAt: string }}
              onNewCampaign={handleStartNewCampaign}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewCampaign() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <NewCampaignContent />
    </Suspense>
  );
}