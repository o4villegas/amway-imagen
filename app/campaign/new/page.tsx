'use client';

import React, { useState } from 'react';
import { URLInput } from '@/components/campaign/URLInput';
import { ProductPreview } from '@/components/campaign/ProductPreview';
import { PreferencesPanel } from '@/components/campaign/PreferencesPanel';
import { GenerationProgress } from '@/components/campaign/GenerationProgress';
import { DownloadManager } from '@/components/campaign/DownloadManager';
import { StoredProduct } from '@/lib/db';

export type CampaignStep = 'input' | 'configure' | 'generate' | 'download';

export interface CampaignPreferences {
  campaign_type: 'product_focus' | 'lifestyle';
  brand_style: 'professional' | 'casual' | 'wellness' | 'luxury';
  color_scheme: 'amway_brand' | 'product_inspired' | 'custom';
  text_overlay: 'minimal' | 'moderate' | 'heavy';
  campaign_size: 5 | 10 | 15;
  image_formats: Array<'instagram_post' | 'instagram_story' | 'facebook_cover' | 'pinterest'>;
}

export interface GenerationResult {
  campaignId: number;
  downloadUrl: string;
  expiresAt: string;
  totalImages: number;
}

const defaultPreferences: CampaignPreferences = {
  campaign_type: 'product_focus',
  brand_style: 'professional',
  color_scheme: 'amway_brand',
  text_overlay: 'moderate',
  campaign_size: 10,
  image_formats: ['instagram_post', 'instagram_story']
};

export default function NewCampaign() {
  const [step, setStep] = useState<CampaignStep>('input');
  const [productInfo, setProductInfo] = useState<StoredProduct | null>(null);
  const [preferences, setPreferences] = useState<CampaignPreferences>(defaultPreferences);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  const handleProductExtracted = (product: StoredProduct) => {
    setProductInfo(product);
    setStep('configure');
  };

  const handlePreferencesComplete = () => {
    setStep('generate');
  };

  const handleGenerationComplete = (result: GenerationResult) => {
    setGenerationResult(result);
    setStep('download');
  };

  const handleStartNewCampaign = () => {
    setStep('input');
    setProductInfo(null);
    setPreferences(defaultPreferences);
    setGenerationResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Image Campaign
          </h1>
          <p className="text-gray-600">
            Generate professional marketing images for your Amway products
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step === 'input' ? 'text-blue-600' : step !== 'input' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'input' ? 'bg-blue-600 text-white' :
                step !== 'input' ? 'bg-green-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Product URL</span>
            </div>

            <div className={`h-px flex-1 ${step !== 'input' ? 'bg-green-600' : 'bg-gray-200'}`} />

            <div className={`flex items-center ${
              step === 'configure' ? 'text-blue-600' :
              ['generate', 'download'].includes(step) ? 'text-green-600' :
              'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'configure' ? 'bg-blue-600 text-white' :
                ['generate', 'download'].includes(step) ? 'bg-green-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Configure</span>
            </div>

            <div className={`h-px flex-1 ${['generate', 'download'].includes(step) ? 'bg-green-600' : 'bg-gray-200'}`} />

            <div className={`flex items-center ${
              step === 'generate' ? 'text-blue-600' :
              step === 'download' ? 'text-green-600' :
              'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'generate' ? 'bg-blue-600 text-white' :
                step === 'download' ? 'bg-green-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <span className="ml-2 font-medium">Generate</span>
            </div>

            <div className={`h-px flex-1 ${step === 'download' ? 'bg-green-600' : 'bg-gray-200'}`} />

            <div className={`flex items-center ${step === 'download' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'download' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                4
              </div>
              <span className="ml-2 font-medium">Download</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {step === 'input' && (
            <URLInput onProductExtracted={handleProductExtracted} />
          )}

          {step === 'configure' && productInfo && (
            <div className="p-6">
              <ProductPreview product={productInfo} />
              <div className="mt-8">
                <PreferencesPanel
                  preferences={preferences}
                  onChange={setPreferences}
                  onComplete={handlePreferencesComplete}
                />
              </div>
            </div>
          )}

          {step === 'generate' && productInfo && (
            <GenerationProgress
              product={productInfo}
              preferences={preferences}
              onComplete={handleGenerationComplete}
            />
          )}

          {step === 'download' && generationResult && (
            <DownloadManager
              result={generationResult}
              onNewCampaign={handleStartNewCampaign}
            />
          )}
        </div>
      </div>
    </div>
  );
}