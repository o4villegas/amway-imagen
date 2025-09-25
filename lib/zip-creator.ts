// ZIP file creation utilities for campaign downloads
// Refactored to use modular components for better maintainability

import { ZipFileManager } from './zip/zip-file-manager';
import { ZipBuilder } from './zip/zip-builder';

export interface CampaignFile {
  filename: string;
  content: ArrayBuffer;
  format: string;
}

export interface CampaignMetadata {
  generated: string;
  totalImages: number;
  formats: string[];
  product: {
    name: string;
    brand: string;
    category: string;
  };
  preferences: {
    campaign_type: string;
    brand_style: string;
    campaign_size: number;
  };
  usage: string;
}

export class ZipCreator {
  private fileManager = new ZipFileManager();
  private zipBuilder = new ZipBuilder();

  /**
   * Creates a campaign ZIP file with organized structure
   */
  async createCampaignZip(
    images: CampaignFile[],
    metadata: CampaignMetadata
  ): Promise<ArrayBuffer> {
    // Organize files into proper structure
    const organizedFiles = this.fileManager.organizeFiles(images, metadata);

    // Build ZIP file
    return this.zipBuilder.createZipBuffer(organizedFiles);
  }

  /**
   * Creates a campaign ZIP file with marketing copy included
   */
  async createCampaignZipWithCopy(
    images: CampaignFile[],
    metadata: CampaignMetadata,
    marketingCopy: Array<{ format: string; copy: any }>
  ): Promise<ArrayBuffer> {
    // Organize files into proper structure
    const organizedFiles = this.fileManager.organizeFilesWithCopy(images, metadata, marketingCopy);

    // Build ZIP file
    return this.zipBuilder.createZipBuffer(organizedFiles);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use the modular createCampaignZip method instead
   */
  private async createZipBufferLegacy(files: Array<{ name: string; data: ArrayBuffer }>): Promise<ArrayBuffer> {
    return this.zipBuilder.createZipBuffer(files);
  }
}