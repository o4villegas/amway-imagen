'use client';

import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StoredProduct } from '@/lib/db';
import { CampaignPreferences, GenerationResult } from '@/app/campaign/new/page';
import { Loader2, Zap, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { ErrorBoundary, CampaignErrorFallback } from '@/components/ErrorBoundary';
import { CAMPAIGN_CONFIG } from '@/lib/config';

interface GenerationProgressProps {
  product: StoredProduct;
  preferences: CampaignPreferences;
  onComplete: (result: GenerationResult) => void;
}

type GenerationStatus = 'starting' | 'generating' | 'packaging' | 'completed' | 'error';

function GenerationProgressContent({ product, preferences, onComplete }: GenerationProgressProps) {
  const [status, setStatus] = useState<GenerationStatus>('starting');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  useEffect(() => {
    startGeneration();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startGeneration = async () => {
    try {
      setStatus('generating');
      setCurrentStep('Generating AI images...');
      setProgress(10);

      const response = await fetch('/api/campaign/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          preferences
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Generation failed');
      }

      // Simulate progress updates during generation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= CAMPAIGN_CONFIG.MAX_SIMULATED_PROGRESS) {
            clearInterval(progressInterval);
            return CAMPAIGN_CONFIG.MAX_SIMULATED_PROGRESS;
          }
          const increment = Math.random() * 10 + 5;
          const newProgress = Math.min(prev + increment, CAMPAIGN_CONFIG.MAX_SIMULATED_PROGRESS);

          // Update generated count based on progress
          const estimatedGenerated = Math.floor(
            (newProgress / CAMPAIGN_CONFIG.MAX_SIMULATED_PROGRESS) * preferences.campaign_size
          );
          setGeneratedCount(estimatedGenerated);

          return newProgress;
        });
      }, CAMPAIGN_CONFIG.PROGRESS_UPDATE_INTERVAL);

      const result = await response.json() as {
        success: boolean;
        error?: string;
        campaignId: number;
        downloadUrl: string;
        expiresAt: string;
        totalImages: number;
      };
      clearInterval(progressInterval);

      if (result.success) {
        setStatus('packaging');
        setCurrentStep('Creating download package...');
        setProgress(90);
        setGeneratedCount(result.totalImages);

        // Brief delay to show packaging step
        await new Promise(resolve => setTimeout(resolve, 1000));

        setStatus('completed');
        setCurrentStep('Campaign ready!');
        setProgress(100);

        // Brief delay before calling onComplete
        setTimeout(() => {
          onComplete({
            campaignId: result.campaignId,
            downloadUrl: result.downloadUrl,
            expiresAt: result.expiresAt,
            totalImages: result.totalImages
          });
        }, 500);

      } else {
        throw new Error(result.error || 'Generation failed');
      }

    } catch (err: any) {
      console.error('Generation error:', err);
      setStatus('error');
      setError(err.message || 'Failed to generate campaign');
      setProgress(0);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'starting':
      case 'generating':
      case 'packaging':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />;
      case 'completed':
        return <Check className="h-6 w-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'starting':
      case 'generating':
      case 'packaging':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Generating Your Campaign
        </h2>
        <p className="text-gray-600">
          Creating {preferences.campaign_size} professional images for {product.name}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-center space-x-3">
              {getStatusIcon()}
              <span className={`text-lg font-medium ${getStatusColor()}`}>
                {currentStep}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Generation Stats */}
            {status === 'generating' && (
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{generatedCount}</div>
                  <div className="text-sm text-gray-600">Images Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{preferences.campaign_size}</div>
                  <div className="text-sm text-gray-600">Total Requested</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{preferences.image_formats.length}</div>
                  <div className="text-sm text-gray-600">Format{preferences.image_formats.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )}

            {/* Campaign Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Campaign Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Style:</span>
                  <span className="ml-2 font-medium capitalize">{preferences.brand_style}</span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-medium capitalize">{preferences.campaign_type.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Text Overlay:</span>
                  <span className="ml-2 font-medium capitalize">{preferences.text_overlay}</span>
                </div>
                <div>
                  <span className="text-gray-600">Color Scheme:</span>
                  <span className="ml-2 font-medium capitalize">{preferences.color_scheme.replace('_', ' ')}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-600">Formats:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {preferences.image_formats.map((format) => (
                    <span key={format} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {format.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {status === 'error' && error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">
                      Generation Failed
                    </h3>
                    <p className="text-sm text-red-700">{error}</p>
                    <Button
                      onClick={startGeneration}
                      variant="outline"
                      size="sm"
                      className="mt-3"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-green-800 mb-1">
                      Campaign Generated Successfully!
                    </h3>
                    <p className="text-sm text-green-700">
                      Your {generatedCount} images are ready for download.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Zap className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              AI Image Generation
            </h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Images are generated using advanced AI technology</p>
              <p>• Each image is unique and professionally styled</p>
              <p>• Compliance disclaimers are automatically included</p>
              <p>• Generation typically takes 30-60 seconds per image</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap with error boundary
export function GenerationProgress(props: GenerationProgressProps) {
  return (
    <ErrorBoundary fallback={CampaignErrorFallback}>
      <GenerationProgressContent {...props} />
    </ErrorBoundary>
  );
}