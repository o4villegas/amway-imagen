'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StoredProduct } from '@/lib/db';
import { AlertCircle, Save } from 'lucide-react';

interface ManualProductEntryProps {
  onProductSaved: (product: StoredProduct) => void;
  onCancel: () => void;
}

export function ManualProductEntry({ onProductSaved, onCancel }: ManualProductEntryProps) {
  const [formData, setFormData] = useState({
    product_url: '',
    amway_product_id: '',
    name: '',
    description: '',
    benefits: '',
    category: 'other',
    brand: '',
    price: '',
    currency: 'USD',
    main_image_url: '',
    inventory_status: 'in_stock'
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.name || !formData.product_url) {
      setError('Product name and URL are required');
      return;
    }

    setSaving(true);

    try {
      // Save the manually entered product data
      const productData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        id: Math.floor(Math.random() * 1000000), // Temporary ID
        scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // In a real implementation, this would save to the database
      // For now, we'll just pass it to the parent component
      onProductSaved(productData as StoredProduct);
    } catch (err) {
      setError('Failed to save product information');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">Manual Product Entry</h2>
          <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Automatic scraping requires authentication. You can manually enter product details below,
              or set up authentication for automatic scraping.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="w-full">
              <Label htmlFor="product_url" className="block text-sm font-medium mb-2">Product URL *</Label>
              <Input
                id="product_url"
                type="url"
                value={formData.product_url}
                onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                placeholder="https://www.amway.com/p/..."
                className="w-full min-h-[44px] text-base"
                required
              />
            </div>

            <div className="w-full">
              <Label htmlFor="amway_product_id" className="block text-sm font-medium mb-2">Product ID</Label>
              <Input
                id="amway_product_id"
                value={formData.amway_product_id}
                onChange={(e) => setFormData({ ...formData, amway_product_id: e.target.value })}
                placeholder="e.g., 110050"
                className="w-full min-h-[44px] text-base"
              />
            </div>

            <div className="w-full lg:col-span-2">
              <Label htmlFor="name" className="block text-sm font-medium mb-2">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Nutrilite Daily Multivitamin"
                className="w-full min-h-[44px] text-base"
                required
              />
            </div>

            <div className="w-full">
              <Label htmlFor="brand" className="block text-sm font-medium mb-2">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Nutrilite"
                className="w-full min-h-[44px] text-base"
              />
            </div>

            <div className="w-full">
              <Label htmlFor="category" className="block text-sm font-medium mb-2">Category</Label>
              <select
                id="category"
                className="w-full min-h-[44px] px-3 py-2 text-base bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="nutrition">Nutrition</option>
                <option value="beauty">Beauty</option>
                <option value="home">Home</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="w-full">
              <Label htmlFor="price" className="block text-sm font-medium mb-2">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g., 29.99"
                className="w-full min-h-[44px] text-base"
              />
            </div>

            <div className="w-full">
              <Label htmlFor="currency" className="block text-sm font-medium mb-2">Currency</Label>
              <Input
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="USD"
                className="w-full min-h-[44px] text-base"
              />
            </div>

            <div className="w-full lg:col-span-2">
              <Label htmlFor="main_image_url" className="block text-sm font-medium mb-2">Product Image URL</Label>
              <Input
                id="main_image_url"
                type="url"
                value={formData.main_image_url}
                onChange={(e) => setFormData({ ...formData, main_image_url: e.target.value })}
                placeholder="https://..."
                className="w-full min-h-[44px] text-base"
              />
            </div>

            <div className="w-full lg:col-span-2">
              <Label htmlFor="description" className="block text-sm font-medium mb-2">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description..."
                rows={4}
                className="w-full min-h-[100px] text-base resize-vertical"
              />
            </div>

            <div className="w-full lg:col-span-2">
              <Label htmlFor="benefits" className="block text-sm font-medium mb-2">Benefits</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="Enter product benefits..."
                rows={3}
                className="w-full min-h-[80px] text-base resize-vertical"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 min-h-[44px] text-base font-medium px-6"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Product'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="min-h-[44px] text-base font-medium px-6"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}