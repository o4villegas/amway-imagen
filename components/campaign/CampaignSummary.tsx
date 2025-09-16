'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle, RefreshCw } from 'lucide-react';

interface CampaignSummaryProps {
  campaignId: number;
  totalImages: number;
  onNewCampaign: () => void;
}

export function CampaignSummary({ campaignId, totalImages, onNewCampaign }: CampaignSummaryProps) {
  return (
    <div className="p-8 text-center">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Campaign Complete!
          </h2>
          <p className="text-gray-600">
            Your campaign with {totalImages} images has been generated successfully.
            You can save individual images directly to your device from the preview gallery.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Next Steps:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Go back to preview and save your favorite images</li>
            <li>• Images are optimized for social media platforms</li>
            <li>• Use images according to Amway compliance guidelines</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onNewCampaign}
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Create New Campaign
          </Button>
        </div>
      </div>
    </div>
  );
}