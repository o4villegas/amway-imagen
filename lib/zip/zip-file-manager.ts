/**
 * File management utilities for ZIP creation
 */

import { CampaignFile, CampaignMetadata } from '../zip-creator';

export interface ZipFileEntry {
  name: string;
  data: ArrayBuffer;
}

export class ZipFileManager {
  /**
   * Organizes campaign files into folder structure
   */
  organizeFiles(images: CampaignFile[], metadata: CampaignMetadata): ZipFileEntry[] {
    const files: ZipFileEntry[] = [];

    // Group images by format
    const formatGroups = this.groupByFormat(images);

    // Add organized image files
    for (const [format, formatImages] of Array.from(formatGroups.entries())) {
      formatImages.forEach((img, index) => {
        const filename = this.generateImageFilename(img, metadata, index);
        files.push({
          name: filename,
          data: img.content
        });
      });
    }

    // Add metadata files
    files.push(...this.generateMetadataFiles(metadata));

    return files;
  }

  /**
   * Groups images by format
   */
  private groupByFormat(images: CampaignFile[]): Map<string, CampaignFile[]> {
    const groups = new Map<string, CampaignFile[]>();

    for (const image of images) {
      if (!groups.has(image.format)) {
        groups.set(image.format, []);
      }
      groups.get(image.format)!.push(image);
    }

    return groups;
  }

  /**
   * Generates standardized filename for image
   */
  private generateImageFilename(
    image: CampaignFile,
    metadata: CampaignMetadata,
    index: number
  ): string {
    const paddedIndex = String(index + 1).padStart(2, '0');
    const folderName = this.formatToFolderName(image.format);
    const safeName = this.sanitizeFileName(metadata.product.name);
    const extension = 'jpg'; // All images are JPEG

    return `${folderName}/${safeName}_${paddedIndex}.${extension}`;
  }

  /**
   * Maps format to organized folder name
   */
  private formatToFolderName(format: string): string {
    const formatMap: Record<string, string> = {
      'instagram_post': '01_Instagram_Posts',
      'instagram_story': '02_Instagram_Stories',
      'facebook_cover': '03_Facebook_Covers',
      'pinterest': '04_Pinterest_Pins'
    };

    return formatMap[format] || '05_Other';
  }

  /**
   * Sanitizes filename to be filesystem safe
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50); // Limit length
  }

  /**
   * Generates metadata files for the campaign
   */
  private generateMetadataFiles(metadata: CampaignMetadata): ZipFileEntry[] {
    return [
      {
        name: 'campaign_info.json',
        data: new TextEncoder().encode(JSON.stringify(metadata, null, 2)).buffer
      },
      {
        name: 'USAGE_GUIDELINES.txt',
        data: new TextEncoder().encode(this.generateUsageGuidelines(metadata)).buffer
      },
      {
        name: 'README.md',
        data: new TextEncoder().encode(this.generateReadme(metadata)).buffer
      }
    ];
  }

  /**
   * Generates comprehensive usage guidelines
   */
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

  /**
   * Generates helpful README file
   */
  private generateReadme(metadata: CampaignMetadata): string {
    return `
# ${metadata.product.name} Campaign Images

## Campaign Details
- **Product**: ${metadata.product.name}
- **Brand**: ${metadata.product.brand}
- **Generated**: ${new Date(metadata.generated).toLocaleDateString()}
- **Total Images**: ${metadata.totalImages}
- **Formats**: ${metadata.formats.join(', ')}

## Quick Start Guide

### 1. Choose Your Images
Each folder contains images optimized for specific social media platforms:
- **Instagram Posts**: Square format, perfect for feed posts
- **Instagram Stories**: Vertical format for stories and reels
- **Facebook Covers**: Wide format for page headers
- **Pinterest Pins**: Tall format for pin discovery

### 2. Upload and Share
1. Select images that match your message
2. Upload to your chosen platform
3. Add your personal caption and hashtags
4. Engage with your audience

### 3. Best Practices
- Maintain consistent posting schedule
- Use platform-appropriate hashtags
- Include calls-to-action
- Follow Amway compliance guidelines

## Support
For technical support or questions about image usage, contact your Amway support team.

---
*Generated with Amway IBO Image Campaign Generator*
`.trim();
  }
}