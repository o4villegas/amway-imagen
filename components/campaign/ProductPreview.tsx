'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StoredProduct } from '@/lib/db';
import { Package, Tag, DollarSign, CheckCircle } from 'lucide-react';

interface ProductPreviewProps {
  product: StoredProduct;
}

export function ProductPreview({ product }: ProductPreviewProps) {
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'nutrition':
        return 'bg-green-100 text-green-800';
      case 'beauty':
        return 'bg-pink-100 text-pink-800';
      case 'home':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInventoryColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in stock':
        return 'text-green-600';
      case 'out of stock':
        return 'text-red-600';
      case 'limited':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Product Information
        </h2>
        <p className="text-gray-600">
          Review the extracted product details before creating your campaign.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Image */}
            <div className="space-y-4">
              {product.main_image_url ? (
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={product.main_image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Badge className={getCategoryColor(product.category)}>
                  {product.category}
                </Badge>
                <div className={`flex items-center text-sm ${getInventoryColor(product.inventory_status)}`}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {product.inventory_status}
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {product.name}
                </h3>
                {product.brand && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Tag className="h-4 w-4 mr-1" />
                    {product.brand}
                  </div>
                )}
                {product.price && (
                  <div className="flex items-center text-lg font-medium text-gray-900">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {formatPrice(product.price, product.currency)}
                  </div>
                )}
              </div>

              {product.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                    {product.description}
                  </p>
                </div>
              )}

              {product.benefits && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Key Benefits</h4>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                    {product.benefits}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Product ID: {product.amway_product_id} •
                  Last updated: {new Date(product.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-green-800 mb-1">
              Product Information Extracted Successfully
            </h3>
            <p className="text-sm text-green-700">
              All required product details have been extracted. You can now configure your image campaign preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}