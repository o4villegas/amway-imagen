'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GenerationResult } from '@/app/campaign/new/page';
import { Download, Clock, FileArchive, RotateCcw, CheckCircle, Copy, ExternalLink, ArrowLeft } from 'lucide-react';

interface DownloadManagerProps {
  result: GenerationResult;
  onNewCampaign: () => void;
}

export function DownloadManager({ result, onNewCampaign }: DownloadManagerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(result.downloadUrl);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Campaign not found or has expired');
        } else if (response.status === 410) {
          throw new Error('Campaign has expired and is no longer available');
        } else {
          throw new Error('Download failed. Please try again.');
        }
      }

      // Get the filename from the response headers or create one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'amway_campaign.zip';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error: any) {
      console.error('Download error:', error);
      setDownloadError(error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyDownloadLink = () => {
    const fullUrl = `${window.location.origin}${result.downloadUrl}`;
    navigator.clipboard.writeText(fullUrl);
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursLeft <= 0) {
      return 'Expired';
    } else if (hoursLeft === 1) {
      return '1 hour';
    } else {
      return `${hoursLeft} hours`;
    }
  };

  const isExpired = () => {
    const expiry = new Date(result.expiresAt);
    return new Date() > expiry;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Campaign Generated Successfully!
        </h2>
        <p className="text-gray-600">
          Your {result.totalImages} professional marketing images are ready for download.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Download Section */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-lg">
                <FileArchive className="h-5 w-5 text-gray-600" />
                <span className="font-medium">Campaign Package Ready</span>
              </div>

              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Download className="h-4 w-4" />
                  <span>{result.totalImages} images</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Expires in {formatExpiryTime(result.expiresAt)}</span>
                </div>
              </div>

              {!isExpired() ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    size="lg"
                    className="min-w-48"
                  >
                    {isDownloading ? (
                      <>
                        <Download className="h-4 w-4 mr-2 animate-bounce" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Campaign ZIP
                      </>
                    )}
                  </Button>

                  <div className="flex justify-center space-x-2">
                    <Button
                      onClick={copyDownloadLink}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      onClick={() => window.open(result.downloadUrl, '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Campaign Expired</p>
                  <p className="text-red-600 text-sm mt-1">
                    This campaign has expired and is no longer available for download.
                  </p>
                </div>
              )}

              {downloadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Download Failed</p>
                  <p className="text-red-600 text-sm mt-1">{downloadError}</p>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>

            {/* Package Contents */}
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-3">Package Contents</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>📁 Images organized by format (Instagram, Facebook, Pinterest)</div>
                <div>📄 Campaign information and metadata</div>
                <div>📋 Usage guidelines and best practices</div>
                <div>⚖️ Compliance disclaimers included</div>
                <div>🎨 Professional quality, marketing-ready images</div>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">Quick Usage Tips</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Each format is optimized for its specific platform</p>
                <p>• Follow the included usage guidelines for best results</p>
                <p>• Compliance text is embedded - do not modify</p>
                <p>• Use relevant hashtags and engage authentically</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          onClick={onNewCampaign}
          variant="outline"
          size="lg"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Create Another Campaign
        </Button>
      </div>
    </div>
  );
}