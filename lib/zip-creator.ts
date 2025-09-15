// ZIP file creation utilities for campaign downloads

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
  async createCampaignZip(
    images: CampaignFile[],
    metadata: CampaignMetadata
  ): Promise<ArrayBuffer> {
    // We'll use a simple ZIP implementation that works in Workers
    // This is a basic implementation - in production you might want to use a more robust library

    const files: Array<{ name: string; data: ArrayBuffer }> = [];

    // Add all images organized by format
    const formatFolders = new Set(images.map(img => img.format));

    for (const format of formatFolders) {
      const formatImages = images.filter(img => img.format === format);

      formatImages.forEach((img, index) => {
        const paddedIndex = String(index + 1).padStart(2, '0');
        const folderName = this.formatToFolderName(format);
        const extension = 'jpg'; // All images are JPEG
        const filename = `${folderName}/${metadata.product.name.replace(/[^a-zA-Z0-9]/g, '_')}_${paddedIndex}.${extension}`;

        files.push({
          name: filename,
          data: img.content
        });
      });
    }

    // Add campaign info file
    const campaignInfoContent = JSON.stringify(metadata, null, 2);
    files.push({
      name: 'campaign_info.json',
      data: new TextEncoder().encode(campaignInfoContent)
    });

    // Add usage guidelines
    const usageGuidelines = this.generateUsageGuidelines(metadata);
    files.push({
      name: 'USAGE_GUIDELINES.txt',
      data: new TextEncoder().encode(usageGuidelines)
    });

    // Create ZIP using manual implementation
    return this.createZipBuffer(files);
  }

  private formatToFolderName(format: string): string {
    switch (format) {
      case 'instagram_post':
        return '01_Instagram_Posts';
      case 'instagram_story':
        return '02_Instagram_Stories';
      case 'facebook_cover':
        return '03_Facebook_Covers';
      case 'pinterest':
        return '04_Pinterest_Pins';
      default:
        return '05_Other';
    }
  }

  private generateUsageGuidelines(metadata: CampaignMetadata): string {
    return `
AMWAY IBO IMAGE CAMPAIGN - USAGE GUIDELINES
===========================================

Generated: ${metadata.generated}
Product: ${metadata.product.name}
Brand: ${metadata.product.brand}
Campaign Type: ${metadata.preferences.campaign_type}
Style: ${metadata.preferences.brand_style}

FOLDER STRUCTURE:
${metadata.formats.map(format => `- ${this.formatToFolderName(format)}/`).join('\n')}

IMAGE SPECIFICATIONS:
- Instagram Posts: 1080x1080px (Square format)
- Instagram Stories: 1080x1920px (Vertical format)
- Facebook Covers: 1200x675px (Landscape format)
- Pinterest Pins: 1000x1500px (Vertical format)

COMPLIANCE REMINDERS:
✓ All images include appropriate disclaimers
✓ Follow Amway brand guidelines when posting
✓ Ensure compliance with local advertising regulations
✓ Individual results may vary - communicate honestly

SOCIAL MEDIA BEST PRACTICES:
• Use relevant hashtags for your market
• Tag @amway when appropriate
• Include personal testimonials responsibly
• Engage authentically with your audience
• Post consistently for best results

LEGAL CONSIDERATIONS:
- These images are for authorized Amway IBOs only
- Do not modify compliance text or disclaimers
- Follow platform-specific advertising policies
- Respect copyright and trademark guidelines

For questions about proper usage, consult your upline or Amway compliance resources.

Generated with Amway IBO Image Campaign Generator
© ${new Date().getFullYear()} Amway Corp. All rights reserved.
`.trim();
  }

  private async createZipBuffer(files: Array<{ name: string; data: ArrayBuffer }>): Promise<ArrayBuffer> {
    // This is a simplified ZIP implementation
    // In a real production environment, you'd want to use a proper ZIP library

    const zipData: ArrayBuffer[] = [];
    const centralDirectory: ArrayBuffer[] = [];
    let offset = 0;

    for (const file of files) {
      // Local file header
      const filename = new TextEncoder().encode(file.name);
      const fileData = file.data;

      const localHeader = new ArrayBuffer(30 + filename.length);
      const headerView = new DataView(localHeader);

      // Local file header signature
      headerView.setUint32(0, 0x04034b50, true);
      // Version needed to extract
      headerView.setUint16(4, 20, true);
      // General purpose bit flag
      headerView.setUint16(6, 0, true);
      // Compression method (stored)
      headerView.setUint16(8, 0, true);
      // Last mod time
      headerView.setUint16(10, 0, true);
      // Last mod date
      headerView.setUint16(12, 0, true);
      // CRC-32
      headerView.setUint32(14, this.crc32(new Uint8Array(fileData)), true);
      // Compressed size
      headerView.setUint32(18, fileData.byteLength, true);
      // Uncompressed size
      headerView.setUint32(22, fileData.byteLength, true);
      // Filename length
      headerView.setUint16(26, filename.length, true);
      // Extra field length
      headerView.setUint16(28, 0, true);

      // Copy filename
      new Uint8Array(localHeader, 30).set(filename);

      zipData.push(localHeader);
      zipData.push(fileData);

      // Central directory entry
      const centralEntry = new ArrayBuffer(46 + filename.length);
      const centralView = new DataView(centralEntry);

      // Central directory signature
      centralView.setUint32(0, 0x02014b50, true);
      // Version made by
      centralView.setUint16(4, 20, true);
      // Version needed to extract
      centralView.setUint16(6, 20, true);
      // General purpose bit flag
      centralView.setUint16(8, 0, true);
      // Compression method
      centralView.setUint16(10, 0, true);
      // Last mod time
      centralView.setUint16(12, 0, true);
      // Last mod date
      centralView.setUint16(14, 0, true);
      // CRC-32
      centralView.setUint32(16, this.crc32(new Uint8Array(fileData)), true);
      // Compressed size
      centralView.setUint32(20, fileData.byteLength, true);
      // Uncompressed size
      centralView.setUint32(24, fileData.byteLength, true);
      // Filename length
      centralView.setUint16(28, filename.length, true);
      // Extra field length
      centralView.setUint16(30, 0, true);
      // Comment length
      centralView.setUint16(32, 0, true);
      // Disk number start
      centralView.setUint16(34, 0, true);
      // Internal file attributes
      centralView.setUint16(36, 0, true);
      // External file attributes
      centralView.setUint32(38, 0, true);
      // Relative offset
      centralView.setUint32(42, offset, true);

      // Copy filename
      new Uint8Array(centralEntry, 46).set(filename);

      centralDirectory.push(centralEntry);

      offset += localHeader.byteLength + fileData.byteLength;
    }

    // End of central directory
    const endOfCentral = new ArrayBuffer(22);
    const endView = new DataView(endOfCentral);

    const centralSize = centralDirectory.reduce((sum, entry) => sum + entry.byteLength, 0);

    // End of central directory signature
    endView.setUint32(0, 0x06054b50, true);
    // Number of this disk
    endView.setUint16(4, 0, true);
    // Disk where central directory starts
    endView.setUint16(6, 0, true);
    // Number of central directory entries on this disk
    endView.setUint16(8, files.length, true);
    // Total number of central directory entries
    endView.setUint16(10, files.length, true);
    // Size of central directory
    endView.setUint32(12, centralSize, true);
    // Offset of central directory
    endView.setUint32(16, offset, true);
    // Comment length
    endView.setUint16(20, 0, true);

    // Combine all parts
    const totalSize = zipData.reduce((sum, data) => sum + data.byteLength, 0) +
                     centralSize + endOfCentral.byteLength;

    const result = new ArrayBuffer(totalSize);
    const resultView = new Uint8Array(result);

    let pos = 0;

    // Copy file data
    for (const data of zipData) {
      resultView.set(new Uint8Array(data), pos);
      pos += data.byteLength;
    }

    // Copy central directory
    for (const entry of centralDirectory) {
      resultView.set(new Uint8Array(entry), pos);
      pos += entry.byteLength;
    }

    // Copy end of central directory
    resultView.set(new Uint8Array(endOfCentral), pos);

    return result;
  }

  private crc32(data: Uint8Array): number {
    const crcTable = this.makeCRCTable();
    let crc = 0 ^ (-1);

    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
  }

  private makeCRCTable(): number[] {
    const crcTable: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
    }
    return crcTable;
  }
}