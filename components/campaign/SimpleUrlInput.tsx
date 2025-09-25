'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, AlertCircle, CheckCircle } from 'lucide-react';

export interface SimpleUrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
  initialUrl?: string;
  error?: string;
}

export function SimpleUrlInput({
  onSubmit,
  isLoading = false,
  initialUrl = '',
  error
}: SimpleUrlInputProps) {
  const [url, setUrl] = useState(initialUrl);
  const [validationError, setValidationError] = useState('');

  const validateAmwayUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      const validHostnames = ['www.amway.com', 'amway.com'];

      if (!validHostnames.includes(parsedUrl.hostname)) {
        return false;
      }

      const pathname = parsedUrl.pathname;
      return pathname.includes('-p-') ||
             pathname.includes('/p/') ||
             pathname.includes('/product/');
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setValidationError('Please enter a product URL');
      return;
    }

    if (!validateAmwayUrl(url)) {
      setValidationError('Please enter a valid Amway product URL');
      return;
    }

    setValidationError('');
    onSubmit(url.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    // Clear validation errors when user starts typing
    if (validationError) setValidationError('');

    // Show real-time validation for non-empty URLs
    if (newUrl.trim() && !validateAmwayUrl(newUrl)) {
      setValidationError('URL format should be: https://www.amway.com/en_US/Product-Name-p-123456');
    } else if (validationError && validateAmwayUrl(newUrl)) {
      setValidationError('');
    }
  };

  const displayError = error || validationError;
  const isValid = url.trim() && validateAmwayUrl(url) && !displayError;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Globe className="h-8 w-8 text-blue-600 mr-3" />
          <CardTitle className="text-2xl">Enter Product URL</CardTitle>
        </div>
        <p className="text-gray-600">
          Paste the URL of any Amway product page to get started
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type="url"
              placeholder="https://www.amway.com/en_US/Product-Name-p-123456"
              value={url}
              onChange={handleInputChange}
              className={`h-12 text-lg pr-12 ${
                displayError
                  ? 'border-red-300 focus:border-red-500'
                  : isValid
                  ? 'border-green-300 focus:border-green-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              disabled={isLoading}
            />

            {/* Validation icon */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isValid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : displayError && url.trim() ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : null}
            </div>
          </div>

          {/* Error display */}
          {displayError && (
            <div className="flex items-start space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Example URLs */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Example URLs:</h4>
            <div className="space-y-2 text-sm">
              <button
                type="button"
                className="block text-left text-blue-600 hover:text-blue-800 hover:underline"
                onClick={() => setUrl('https://www.amway.com/en_US/Nutrilite%E2%84%A2-Organics-All-in-One-Meal-Powder-%E2%80%93-Vanilla-p-318671')}
              >
                Nutrilite™ Organics All-in-One Meal Powder
              </button>
              <button
                type="button"
                className="block text-left text-blue-600 hover:text-blue-800 hover:underline"
                onClick={() => setUrl('https://www.amway.com/en_US/p/124481')}
              >
                Legacy format (p/123456)
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Extracting Product Data...
              </>
            ) : (
              'Extract Product Information'
            )}
          </Button>
        </form>

        {/* Tips */}
        <div className="mt-6 text-xs text-gray-500">
          <p className="mb-1">💡 <strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Copy the URL directly from your browser&apos;s address bar</li>
            <li>Make sure it&apos;s a product page, not a category or homepage</li>
            <li>Both new format (Product-Name-p-123) and legacy format (p/123) work</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default SimpleUrlInput;