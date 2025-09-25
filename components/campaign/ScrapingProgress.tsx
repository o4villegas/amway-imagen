'use client';

import React from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

export interface ScrapingStage {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

export interface ScrapingProgressProps {
  currentStage: number;
  error?: string;
  onComplete?: () => void;
}

const SCRAPING_STAGES: Omit<ScrapingStage, 'status'>[] = [
  {
    id: 1,
    title: 'Fetching product page...',
    description: 'Connecting to Amway website'
  },
  {
    id: 2,
    title: 'Extracting product information...',
    description: 'AI analyzing page content'
  },
  {
    id: 3,
    title: 'Analyzing benefits...',
    description: 'Processing product details'
  },
  {
    id: 4,
    title: 'Ready for campaign setup!',
    description: 'Product data extracted successfully'
  }
];

export function ScrapingProgress({
  currentStage,
  error,
  onComplete
}: ScrapingProgressProps) {

  // Determine status for each stage
  const getStageStatus = (stageId: number): ScrapingStage['status'] => {
    if (error && stageId === currentStage) {
      return 'error';
    }

    if (stageId < currentStage) {
      return 'completed';
    }

    if (stageId === currentStage) {
      return 'in-progress';
    }

    return 'pending';
  };

  // Auto-trigger completion when stage 4 is reached
  React.useEffect(() => {
    if (currentStage >= 4 && !error && onComplete) {
      onComplete();
    }
  }, [currentStage, error, onComplete]);

  const getStageIcon = (status: ScrapingStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'in-progress':
        return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
      case 'error':
        return <Circle className="h-6 w-6 text-red-600 fill-current" />;
      case 'pending':
      default:
        return <Circle className="h-6 w-6 text-gray-300" />;
    }
  };

  const getStageTextColor = (status: ScrapingStage['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700';
      case 'in-progress':
        return 'text-blue-700';
      case 'error':
        return 'text-red-700';
      case 'pending':
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        {SCRAPING_STAGES.map((stage) => {
          const status = getStageStatus(stage.id);
          const isActive = status === 'in-progress' || status === 'error';

          return (
            <div
              key={stage.id}
              className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-300 ${
                isActive ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStageIcon(status)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-medium ${getStageTextColor(status)}`}>
                  {stage.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {stage.description}
                </p>

                {/* Progress bar for active stage */}
                {status === 'in-progress' && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse w-1/2"></div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {status === 'error' && error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall progress indicator */}
      <div className="mt-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{error ? 'Failed' : `${Math.min(currentStage, 4)}/4`}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              error ? 'bg-red-500' : 'bg-blue-600'
            }`}
            style={{
              width: `${(Math.min(currentStage, 4) / 4) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Completion message */}
      {currentStage >= 4 && !error && (
        <div className="mt-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <p className="text-lg font-medium text-green-700">
            Product extraction completed!
          </p>
          <p className="text-sm text-gray-600">
            Proceeding to campaign setup...
          </p>
        </div>
      )}
    </div>
  );
}

export default ScrapingProgress;