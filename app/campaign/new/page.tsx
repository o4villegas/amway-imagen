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

export type CampaignStep = 'url-input' | 'scraping' | 'configure' | 'generate' | 'preview' | 'download';

export interface CampaignPreferences {
  campaign_type: 'lifestyle'; // Fixed to lifestyle with benefit-focused approach
  brand_style: 'professional' | 'casual' | 'wellness' | 'luxury';
  color_scheme: 'amway_brand' | 'product_inspired' | 'custom';
  text_overlay: 'minimal' | 'moderate' | 'heavy';
  campaign_size: 5;
  image_formats: Array<'facebook_post' | 'instagram_post' | 'pinterest' | 'snapchat_ad' | 'linkedin_post'>;
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
  downloadUrl: string;
  expiresAt: string;
  totalImages: number;
}

const defaultPreferences: CampaignPreferences = {
  campaign_type: 'lifestyle',
  brand_style: 'professional',
  color_scheme: 'amway_brand',
  text_overlay: 'moderate',
  campaign_size: 5,
  image_formats: ['facebook_post', 'instagram_post', 'pinterest', 'snapchat_ad', 'linkedin_post']
};

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
    setStep('scraping');
    setScrapingStage(1);
    setScrapingError('');

    try {
      // Stage 1: Start extraction
      setScrapingStage(1);
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stage 4: Complete
      setScrapingStage(4);
      setProductInfo(data.product);

    } catch (error) {
      setScrapingError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleScrapingComplete = () => {
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

  const handlePreviewComplete = () => {
    setStep('download');
  };

  const handleBackToPreview = () => {
    setStep('preview');
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

          {step === 'scraping' && (
            <div className="p-6">
              <ScrapingProgress
                currentStage={scrapingStage}
                error={scrapingError}
                onComplete={handleScrapingComplete}
              />
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
          )}

          {step === 'configure' && productInfo && (
            <div className="p-6">
              <ProductPreview product={productInfo} />
              <div className="mt-8">
                <ErrorBoundary fallback={CampaignErrorFallback}>
                  <PreferencesPanel
                    preferences={preferences}
                    onChange={setPreferences}
                    onComplete={handlePreferencesComplete}
                  />
                </ErrorBoundary>
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
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Preview & Select Images</h2>
                <p className="text-gray-600">
                  Review your generated images and select which ones to include in your campaign download.
                </p>
              </div>
              <ErrorBoundary fallback={CampaignErrorFallback}>
                <ImageGallery
                  campaignId={generationResult.campaignId}
                  onComplete={handlePreviewComplete}
                />
              </ErrorBoundary>
            </div>
          )}

          {step === 'download' && generationResult && (
            <DownloadManager
              result={generationResult}
              onNewCampaign={handleStartNewCampaign}
              onBackToPreview={handleBackToPreview}
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