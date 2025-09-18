'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampaignPreferences } from '@/app/campaign/new/page';
import { Settings, Palette, Type, Layout, Camera } from 'lucide-react';

interface PreferencesPanelProps {
  preferences: CampaignPreferences;
  onChange: (preferences: CampaignPreferences) => void;
  onComplete: () => void;
}

export function PreferencesPanel({ preferences, onChange, onComplete }: PreferencesPanelProps) {
  const updatePreference = <K extends keyof CampaignPreferences>(
    key: K,
    value: CampaignPreferences[K]
  ) => {
    onChange({ ...preferences, [key]: value });
  };

  const imageFormatOptions = [
    {
      id: 'instagram_post',
      label: 'Instagram Post',
      description: '1:1 Square (1080×1080)',
      dimensions: '1080×1080'
    },
    {
      id: 'instagram_story',
      label: 'Instagram Story',
      description: '9:16 Vertical (1080×1920)',
      dimensions: '1080×1920'
    },
    {
      id: 'facebook_cover',
      label: 'Facebook Cover',
      description: '16:9 Landscape (1200×675)',
      dimensions: '1200×675'
    },
    {
      id: 'pinterest',
      label: 'Pinterest',
      description: '2:3 Vertical (1000×1500)',
      dimensions: '1000×1500'
    }
  ] as const;

  const isValid = () => {
    return true; // Always valid since we removed user selection
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Campaign Preferences
        </h2>
        <p className="text-gray-600">
          Customize your image campaign to match your marketing style and target audience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Approach */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Camera className="h-4 w-4 mr-2" />
              Campaign Approach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-medium text-blue-900 mb-2">Benefit-Focused Marketing</div>
              <div className="text-sm text-blue-700">
                Your campaign will showcase the transformation and benefits your product delivers,
                focusing on customer outcomes rather than product features.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Style */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Settings className="h-4 w-4 mr-2" />
              Brand Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={preferences.brand_style}
              onValueChange={(value) => updatePreference('brand_style', value as any)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="professional" id="professional" />
                <Label htmlFor="professional" className="text-sm">
                  <div className="font-medium">Professional</div>
                  <div className="text-gray-500">Corporate, clean, trustworthy</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="casual" id="casual" />
                <Label htmlFor="casual" className="text-sm">
                  <div className="font-medium">Casual</div>
                  <div className="text-gray-500">Approachable, friendly, everyday</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wellness" id="wellness" />
                <Label htmlFor="wellness" className="text-sm">
                  <div className="font-medium">Wellness</div>
                  <div className="text-gray-500">Natural, healthy, mindful</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="luxury" id="luxury" />
                <Label htmlFor="luxury" className="text-sm">
                  <div className="font-medium">Luxury</div>
                  <div className="text-gray-500">Premium, elegant, sophisticated</div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Color Scheme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Palette className="h-4 w-4 mr-2" />
              Color Scheme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={preferences.color_scheme}
              onValueChange={(value) => updatePreference('color_scheme', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amway_brand">Amway Brand Colors</SelectItem>
                <SelectItem value="product_inspired">Product-Inspired Colors</SelectItem>
                <SelectItem value="custom">Custom Palette</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Text Overlay */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Type className="h-4 w-4 mr-2" />
              Text Overlay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={preferences.text_overlay}
              onValueChange={(value) => updatePreference('text_overlay', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal Text</SelectItem>
                <SelectItem value="moderate">Moderate Text</SelectItem>
                <SelectItem value="heavy">Text-Heavy</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Image Formats Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Layout className="h-4 w-4 mr-2" />
            Smart Format Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
            <div className="font-medium text-green-900 mb-2">Optimized for Maximum Reach</div>
            <div className="text-sm text-green-700">
              Your 5 images will be automatically distributed across key social media formats for comprehensive coverage.
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {imageFormatOptions.map((format) => (
              <div key={format.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{format.label}</div>
                  <div className="text-gray-600">{format.description}</div>
                  <div className="text-xs text-gray-500 mt-1">{format.dimensions}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Distribution Strategy:</strong> Images are intelligently sized and optimized for each platform&apos;s best practices.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Info - Fixed at 5 Images */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campaign Package</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <div className="font-medium text-blue-900">Professional Campaign</div>
              <div className="text-sm text-blue-700">5 high-quality images</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">5</div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Images will be distributed across your selected formats for optimal marketing coverage
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-4">
        <Button
          onClick={onComplete}
          disabled={!isValid()}
          size="mobile"
          className="min-w-48"
        >
          Start Generating Images
        </Button>
      </div>
    </div>
  );
}