'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { StoredProduct } from '@/lib/db';

interface URLInputProps {
  onProductExtracted: (product: StoredProduct) => void;
}

export function URLInput({ onProductExtracted }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateUrl = (inputUrl: string): boolean => {
    try {
      const parsedUrl = new URL(inputUrl);
      const domain = parsedUrl.hostname.replace('www.', '');
      return domain.endsWith('amway.com') && (
        parsedUrl.pathname.includes('/p/') ||
        !!parsedUrl.pathname.match(/\/p-\d+$/)
      );
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a product URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid Amway product URL (e.g., https://www.amway.com/en_US/p/123456)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productUrl: url.trim() }),
      });

      const data = await response.json() as {
        success: boolean;
        error?: string;
        product: StoredProduct;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract product information');
      }

      onProductExtracted(data.product);
    } catch (err: any) {
      setError(err.message || 'Failed to extract product information');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleUrls = [
    'https://www.amway.com/en_US/p/326782',
    'https://www.amway.com/en_US/Nutrilite-Daily-p-100186',
    'https://www.amway.com/en_US/p/110798'
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Enter Amway Product URL
        </h2>
        <p className="text-gray-600">
          Paste the URL of any Amway product page to automatically extract product information and create marketing images.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="product-url" className="block text-sm font-medium text-gray-700 mb-2">
            Product URL
          </label>
          <div className="relative">
            <Input
              id="product-url"
              type="url"
              placeholder="https://www.amway.com/en_US/p/product-id"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={`pr-10 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          {error && (
            <div className="mt-2 flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Extracting Product Info...
            </>
          ) : (
            'Extract Product Information'
          )}
        </Button>
      </form>

      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Try these example URLs:
        </h3>
        <div className="space-y-2">
          {exampleUrls.map((exampleUrl, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setUrl(exampleUrl)}
              className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
              disabled={isLoading}
            >
              {exampleUrl}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Supported Product Pages
            </h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• All public Amway.com product pages</p>
              <p>• Nutrilite nutrition products</p>
              <p>• Beauty and personal care items</p>
              <p>• Home care products</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}