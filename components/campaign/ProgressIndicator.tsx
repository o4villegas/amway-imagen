'use client';

import React from 'react';
import { CampaignStep } from '@/app/campaign/new/page';

interface ProgressIndicatorProps {
  currentStep: CampaignStep;
}

interface StepConfig {
  id: CampaignStep;
  number: number;
  label: string;
  shortLabel: string;
}

const STEPS: StepConfig[] = [
  { id: 'url-input', number: 1, label: 'Enter URL', shortLabel: 'URL' },
  { id: 'processing', number: 2, label: 'Processing & Setup', shortLabel: 'Setup' },
  { id: 'generate', number: 3, label: 'Generate Images', shortLabel: 'Generate' },
  { id: 'download', number: 4, label: 'Download Campaign', shortLabel: 'Download' }
];

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const getCurrentStepNumber = (): number => {
    const step = STEPS.find(s => s.id === currentStep);
    return step?.number || 1;
  };

  const getStepStatus = (stepId: CampaignStep): 'current' | 'completed' | 'upcoming' => {
    const currentStepNumber = getCurrentStepNumber();
    const stepNumber = STEPS.find(s => s.id === stepId)?.number || 1;

    if (stepNumber === currentStepNumber) return 'current';
    if (stepNumber < currentStepNumber) return 'completed';
    return 'upcoming';
  };

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'current':
        return {
          container: 'text-blue-600',
          circle: 'bg-blue-600 text-white',
          connector: 'bg-gray-200'
        };
      case 'completed':
        return {
          container: 'text-green-600',
          circle: 'bg-green-600 text-white',
          connector: 'bg-green-600'
        };
      default:
        return {
          container: 'text-gray-400',
          circle: 'bg-gray-200 text-gray-600',
          connector: 'bg-gray-200'
        };
    }
  };

  const currentStepNumber = getCurrentStepNumber();
  const currentStepData = STEPS.find(s => s.number === currentStepNumber);
  const progressPercentage = ((currentStepNumber - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="mb-8">
      {/* Desktop: Full horizontal layout */}
      <div className="hidden md:block">
        <div className="flex items-center space-x-4">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.id);
            const classes = getStepClasses(status);
            const isLast = index === STEPS.length - 1;

            return (
              <React.Fragment key={step.id}>
                <div className={`flex items-center ${classes.container}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${classes.circle}`}>
                    {step.number}
                  </div>
                  <span className="ml-2 font-medium whitespace-nowrap">{step.label}</span>
                </div>
                {!isLast && (
                  <div className={`h-px flex-1 ${classes.connector}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile: Compact vertical layout */}
      <div className="md:hidden">
        {/* Current step indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              {currentStepNumber}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Step {currentStepNumber} of {STEPS.length}
              </div>
              <div className="text-xs text-gray-600">
                {currentStepData?.label}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">
              {Math.round(progressPercentage)}% Complete
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Step dots for mobile */}
        <div className="flex items-center justify-center space-x-2">
          {STEPS.map((step) => {
            const status = getStepStatus(step.id);
            const classes = getStepClasses(status);

            return (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                  status === 'completed' ? 'bg-green-600' :
                  status === 'current' ? 'bg-blue-600' :
                  'bg-gray-200'
                }`}
                aria-label={`${step.label} - ${status}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}