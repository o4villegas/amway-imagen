'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StoredProduct } from '@/lib/db';
import { Search, Package, Loader2, Edit3 } from 'lucide-react';
import Image from 'next/image';

// Helper function to create proxied image URLs
function getProxiedImageUrl(originalUrl: string): string {
  if (!originalUrl) return '/api/placeholder-image';

  // If it's exactly our placeholder image, return it directly (don't proxy)
  if (originalUrl === '/api/placeholder-image') {
    return originalUrl;
  }

  // If it's already our placeholder image, return it directly
  if (originalUrl.startsWith('/api/placeholder-image')) {
    return originalUrl;
  }

  // If it's already a data URL (base64), return it directly
  if (originalUrl.startsWith('data:')) {
    return originalUrl;
  }

  if (originalUrl.includes('www.amway.com/medias/')) {
    // Extract the media path and route through our proxy
    const mediaPath = originalUrl.replace('https://www.amway.com/medias/', '');
    return `/api/image-proxy/amway/${mediaPath}`;
  }

  // For other external URLs, encode them
  return `/api/image-proxy/${encodeURIComponent(originalUrl)}`;
}

interface ProductBrowserProps {
  onProductSelected: (product: StoredProduct) => void;
  onManualEntry: () => void;
}

export function ProductBrowser({ onProductSelected, onManualEntry }: ProductBrowserProps) {
  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'nutrition', label: 'Nutrition' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'home', label: 'Home' }
  ];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('limit', '20');

      const response = await fetch(`/api/products/search?${params}`);
      const data = await response.json() as { products?: StoredProduct[], error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleProductClick = (product: StoredProduct) => {
    // Only allow selection of available products
    if (product.available !== false) {
      onProductSelected(product);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Select Product
        </h2>
        <p className="text-gray-600">
          Choose from available products or enter product details manually.
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading}>
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setSelectedCategory(category.value)}
              className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                selectedCategory === category.value
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-gray-600">Loading products...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchProducts} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {products.map((product) => {
            const isAvailable = product.available !== false;
            const cardClasses = isAvailable
              ? "border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              : "border border-gray-200 rounded-lg p-4 opacity-50 grayscale cursor-not-allowed group relative";

            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={cardClasses}
              >
                {/* Coming Soon Badge for disabled products */}
                {!isAvailable && (
                  <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs px-2 py-1 rounded z-10">
                    Coming Soon
                  </div>
                )}

              {/* Product Image */}
              <div className="aspect-square mb-3 relative bg-gray-100 rounded-md overflow-hidden">
                {product.main_image_url ? (
                  <Image
                    src={getProxiedImageUrl(product.main_image_url)}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/api/placeholder-image';
                    }}
                  />
                ) : (
                  <Image
                    src="/api/placeholder-image"
                    alt="Product placeholder"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                <h3 className={`font-medium line-clamp-2 transition-colors ${
                  isAvailable
                    ? "text-gray-900 group-hover:text-blue-600"
                    : "text-gray-700"
                }`}>
                  {product.name}
                </h3>

                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 capitalize">
                    {product.category}
                  </span>
                  {product.brand && (
                    <span className="text-gray-500">
                      {product.brand}
                    </span>
                  )}
                </div>

                {product.price && (
                  <p className="text-lg font-semibold text-green-600">
                    ${product.price.toFixed(2)}
                  </p>
                )}

                <p className="text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </p>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            No products found{searchQuery ? ` for "${searchQuery}"` : ''}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Try adjusting your search or category filter
          </p>
        </div>
      )}

      {/* Manual Entry Option */}
      <div className="border-t pt-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-3">
            Can&apos;t find your product? Enter details manually.
          </p>
          <Button
            onClick={onManualEntry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Enter Product Manually
          </Button>
        </div>
      </div>
    </div>
  );
}