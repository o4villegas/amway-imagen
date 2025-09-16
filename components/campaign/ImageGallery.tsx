'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Eye, Maximize2, Save } from 'lucide-react';

interface GeneratedImage {
  id: number;
  format: string;
  prompt: string;
  width: number;
  height: number;
  selected: boolean;
  r2_path: string;
}

interface ImageGalleryProps {
  campaignId: number;
  onSelectionChange?: (selectedCount: number) => void;
  onComplete?: () => void;
}

export function ImageGallery({ campaignId, onSelectionChange, onComplete }: ImageGalleryProps) {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [groupByFormat, setGroupByFormat] = useState(true);

  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaign/${campaignId}/images`);
      if (!response.ok) throw new Error('Failed to fetch images');
      
      const data: { images: GeneratedImage[] } = await response.json();
      setImages(data.images);

      // Initialize selected images based on database state
      const initialSelected = new Set(data.images.filter(img => img.selected).map(img => img.id));
      setSelectedImages(initialSelected);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    onSelectionChange?.(selectedImages.size);
  }, [selectedImages, onSelectionChange]);

  const handleToggleSelection = async (imageId: number, checked: boolean) => {
    const newSelected = new Set(selectedImages);
    if (checked) {
      newSelected.add(imageId);
    } else {
      newSelected.delete(imageId);
    }
    setSelectedImages(newSelected);

    // Update backend
    try {
      await fetch(`/api/campaign/${campaignId}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected: checked })
      });
    } catch (error) {
      console.error('Error updating selection:', error);
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set(images.map(img => img.id));
    setSelectedImages(allIds);
    images.forEach(img => handleToggleSelection(img.id, true));
  };

  const handleDeselectAll = () => {
    setSelectedImages(new Set());
    images.forEach(img => handleToggleSelection(img.id, false));
  };

  const downloadImage = async (image: GeneratedImage) => {
    try {
      const response = await fetch(`/api/campaign/${campaignId}/images/${image.id}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${image.format}_${image.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const downloadSelectedImages = async () => {
    const selectedImageList = images.filter(img => selectedImages.has(img.id));

    // Download each selected image
    for (const image of selectedImageList) {
      await downloadImage(image);
      // Small delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const formatDisplayName = (format: string) => {
    return format.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDimensions = (width: number, height: number) => {
    return `${width} × ${height}px`;
  };

  const groupedImages = groupByFormat ? images.reduce((acc, img) => {
    if (!acc[img.format]) acc[img.format] = [];
    acc[img.format].push(img);
    return acc;
  }, {} as Record<string, GeneratedImage[]>) : { 'All Images': images };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">
            {selectedImages.size} of {images.length} images selected
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedImages.size > 0 && (
            <Button onClick={downloadSelectedImages} className="gap-2">
              <Save className="h-4 w-4" />
              Save Selected ({selectedImages.size})
            </Button>
          )}
          {onComplete && (
            <Button onClick={onComplete}>
              Continue to Download
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue={Object.keys(groupedImages)[0]} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(groupedImages).length}, 1fr)` }}>
          {Object.keys(groupedImages).map(format => (
            <TabsTrigger key={format} value={format}>
              {formatDisplayName(format)} ({groupedImages[format].length})
            </TabsTrigger>
          ))}
        </TabsList>
        
        {Object.entries(groupedImages).map(([format, formatImages]) => (
          <TabsContent key={format} value={format} className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {formatImages.map(image => (
                <div key={image.id} className="relative group">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={`/api/campaign/${campaignId}/images/${image.id}`}
                      alt={`Generated ${image.format}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                    
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedImages.has(image.id)}
                        onCheckedChange={(checked) => handleToggleSelection(image.id, checked as boolean)}
                        className="bg-white border-2"
                      />
                    </div>

                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => setPreviewImage(image)}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => downloadImage(image)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium">{formatDisplayName(image.format)}</p>
                    <p className="text-xs">{formatDimensions(image.width, image.height)}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewImage && formatDisplayName(previewImage.format)} - {previewImage && formatDimensions(previewImage.width, previewImage.height)}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full" style={{ aspectRatio: `${previewImage.width} / ${previewImage.height}` }}>
              <Image
                src={`/api/campaign/${campaignId}/images/${previewImage.id}`}
                alt={`Preview ${previewImage.format}`}
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}