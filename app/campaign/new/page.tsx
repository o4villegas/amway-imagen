'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ProductBrowser } from '@/components/campaign/ProductBrowser';
import { ManualProductEntry } from '@/components/campaign/ManualProductEntry';
import { ProductPreview } from '@/components/campaign/ProductPreview';
import { PreferencesPanel } from '@/components/campaign/PreferencesPanel';
import { GenerationProgress } from '@/components/campaign/GenerationProgress';
import { DownloadManager } from '@/components/campaign/DownloadManager';
import { ImageGallery } from '@/components/campaign/ImageGallery';
import { ProgressIndicator } from '@/components/campaign/ProgressIndicator';
import { StoredProduct } from '@/lib/db';
import { ErrorBoundary, CampaignErrorFallback } from '@/components/ErrorBoundary';

export type CampaignStep = 'select' | 'configure' | 'generate' | 'preview' | 'download';

export interface CampaignPreferences {
  campaign_type: 'lifestyle'; // Fixed to lifestyle with benefit-focused approach
  brand_style: 'professional' | 'casual' | 'wellness' | 'luxury';
  color_scheme: 'amway_brand' | 'product_inspired' | 'custom';
  text_overlay: 'minimal' | 'moderate' | 'heavy';
  campaign_size: 5;
  image_formats: Array<'instagram_post' | 'instagram_story' | 'facebook_cover' | 'pinterest'>;
}

// Legacy interface for backward compatibility validation (internal use)
export interface CampaignPreferencesLegacy {
  campaign_type: 'product_focus' | 'lifestyle';
  brand_style: 'professional' | 'casual' | 'wellness' | 'luxury';
  color_scheme: 'amway_brand' | 'product_inspired' | 'custom';
  text_overlay: 'minimal' | 'moderate' | 'heavy';
  campaign_size: 1 | 3 | 5 | 10 | 15;
  image_formats: Array<'instagram_post' | 'instagram_story' | 'facebook_cover' | 'pinterest'>;
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
  image_formats: ['instagram_post', 'instagram_story', 'facebook_cover', 'pinterest']
};

export default function NewCampaign() {
  const [step, setStep] = useState<CampaignStep>('select');
  const [productInfo, setProductInfo] = useState<StoredProduct | null>(null);
  const [preferences, setPreferences] = useState<CampaignPreferences>(defaultPreferences);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleProductSelected = (product: StoredProduct) => {
    setProductInfo(product);
    setStep('configure');
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
  };

  const handleManualProductSaved = (product: StoredProduct) => {
    setProductInfo(product);
    setShowManualEntry(false);
    setStep('configure');
  };

  const handleCancelManualEntry = () => {
    setShowManualEntry(false);
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
    setStep('select');
    setProductInfo(null);
    setPreferences(defaultPreferences);
    setGenerationResult(null);
    setShowManualEntry(false);
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
          {step === 'select' && !showManualEntry && (
            <ErrorBoundary fallback={CampaignErrorFallback}>
              <ProductBrowser
                onProductSelected={handleProductSelected}
                onManualEntry={handleManualEntry}
              />
            </ErrorBoundary>
          )}

          {step === 'select' && showManualEntry && (
            <div className="overflow-hidden">
              <ManualProductEntry
                onProductSaved={handleManualProductSaved}
                onCancel={handleCancelManualEntry}
              />
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