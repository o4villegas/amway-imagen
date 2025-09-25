'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, AlertCircle } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a product URL');
      return;
    }

    if (!validateAmwayUrl(url)) {
      setError('Please enter a valid Amway product URL');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Navigate to campaign creation with the URL
      const encodedUrl = encodeURIComponent(url);
      router.push(`/campaign/new?url=${encodedUrl}`);
    } catch (error) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(''); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* Logo/Brand Area */}
      <div className="w-full max-w-2xl text-center mb-12">
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="h-12 w-12 text-blue-600 mr-3" />
          <h1 className="text-4xl font-normal text-gray-900">
            Amway IBO Image Generator
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-xl text-gray-600 font-light mb-8">
          Transform Amway products into campaigns
        </p>

        {/* Main Search Interface */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type="url"
              placeholder="Enter Amway product URL..."
              value={url}
              onChange={handleInputChange}
              className={`w-full h-14 text-lg px-6 pr-12 rounded-full border-2 shadow-sm focus:shadow-md transition-shadow ${
                error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
              }`}
              disabled={isLoading}
            />
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center text-red-600 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </div>
          )}

          {/* Generate Button */}
          <Button
            type="submit"
            size="lg"
            className="h-12 px-8 text-lg rounded-full"
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              'Generate Campaign'
            )}
          </Button>
        </form>

        {/* Example URL Helper */}
        <div className="mt-8 text-sm text-gray-500">
          <p className="mb-2">Example URL format:</p>
          <code className="bg-gray-100 px-3 py-1 rounded text-xs">
            https://www.amway.com/en_US/Product-Name-p-123456
          </code>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="absolute bottom-8 text-center text-xs text-gray-400">
        <p>AI-powered product extraction and image generation</p>
      </div>
    </div>
  );
}
