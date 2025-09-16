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

  const toggleImageFormat = (format: CampaignPreferences['image_formats'][0]) => {
    const current = preferences.image_formats;
    const updated = current.includes(format)
      ? current.filter(f => f !== format)
      : [...current, format];
    updatePreference('image_formats', updated);
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
    return preferences.image_formats.length > 0;
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
        {/* Campaign Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Camera className="h-4 w-4 mr-2" />
              Campaign Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={preferences.campaign_type}
              onValueChange={(value) => updatePreference('campaign_type', value as any)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="product_focus" id="product_focus" />
                <Label htmlFor="product_focus" className="text-sm">
                  <div className="font-medium">Product Focus</div>
                  <div className="text-gray-500">Clean product shots, professional photography style</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lifestyle" id="lifestyle" />
                <Label htmlFor="lifestyle" className="text-sm">
                  <div className="font-medium">Lifestyle Focus</div>
                  <div className="text-gray-500">People using the product, real-life scenarios</div>
                </Label>
              </div>
            </RadioGroup>
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

      {/* Image Formats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Layout className="h-4 w-4 mr-2" />
            Image Formats ({preferences.image_formats.length} selected)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {imageFormatOptions.map((format) => (
              <div key={format.id} className="flex items-start space-x-3">
                <Checkbox
                  id={format.id}
                  checked={preferences.image_formats.includes(format.id)}
                  onCheckedChange={() => toggleImageFormat(format.id)}
                />
                <Label htmlFor={format.id} className="text-sm">
                  <div className="font-medium">{format.label}</div>
                  <div className="text-gray-500">{format.description}</div>
                  <div className="text-xs text-gray-400">{format.dimensions}</div>
                </Label>
              </div>
            ))}
          </div>
          {preferences.image_formats.length === 0 && (
            <p className="text-sm text-red-600 mt-2">
              Please select at least one image format.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Campaign Size */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campaign Size</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences.campaign_size.toString()}
            onValueChange={(value) => updatePreference('campaign_size', parseInt(value) as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 Images - Quick Campaign</SelectItem>
              <SelectItem value="10">10 Images - Standard Campaign</SelectItem>
              <SelectItem value="15">15 Images - Comprehensive Campaign</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500 mt-2">
            Total images will be distributed across selected formats
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