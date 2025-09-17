/**
 * Helper functions for simulating complete campaign flow in tests
 * Provides realistic user journey simulation for proper state management
 */

import { Page, expect } from '@playwright/test';

export interface CampaignFlowOptions {
  productIndex?: number;
  campaignType?: 'product_focus' | 'lifestyle';
  brandStyle?: 'professional' | 'casual' | 'wellness' | 'luxury';
  campaignSize?: 1 | 3 | 5;
  mockGeneration?: boolean;
  waitForGeneration?: boolean;
}

export class CampaignFlowHelper {
  constructor(private page: Page) {}

  /**
   * Complete campaign flow simulation from product selection to preview
   */
  async simulateCompleteFlow(options: CampaignFlowOptions = {}) {
    const {
      productIndex = 0,
      campaignType = 'product_focus',
      brandStyle = 'professional',
      campaignSize = 3,
      mockGeneration = true,
      waitForGeneration = false
    } = options;

    console.log('🚀 Starting complete campaign flow simulation...');

    // Step 1: Navigate to campaign page
    await this.navigateToCampaign();

    // Step 2: Select a product
    await this.selectProduct(productIndex);

    // Step 3: Configure campaign preferences
    await this.configurePreferences({ campaignType, brandStyle, campaignSize });

    // Step 4: Generate campaign (with mocking if needed)
    if (mockGeneration) {
      await this.mockGenerationEndpoints(campaignSize);
    }

    await this.startGeneration(mockGeneration);

    // Step 5: Wait for generation to complete
    if (waitForGeneration) {
      await this.waitForGenerationComplete();
    } else {
      // For mocked flows, wait for the success state
      await this.waitForMockedGenerationComplete();
    }

    console.log('✅ Campaign flow simulation completed - now in preview state');
  }

  async navigateToCampaign() {
    await this.page.goto('/campaign/new');
    await this.page.waitForLoadState('domcontentloaded');

    // Verify we're on the select step
    await expect(this.page.locator('h2:has-text("Select Product")')).toBeVisible();
    console.log('✅ Step 1: Navigated to campaign page');
  }

  async selectProduct(index: number = 0) {
    try {
      // Wait for the grid to be populated with products
      await this.page.waitForSelector('.grid > .cursor-pointer', {
        timeout: 10000
      });

      // Click the product card at the specified index
      const productCard = this.page.locator('.grid > .cursor-pointer').nth(index);

      // Ensure the product card exists
      const productCount = await productCard.count();
      if (productCount === 0) {
        const currentStep = await this.getCurrentStep();
        throw new Error(`Product at index ${index} not found. Current step: ${currentStep}`);
      }

      console.log(`🎯 Clicking product at index ${index}`);
      await productCard.click();

      // Wait for transition to configure step
      await this.page.locator('h2:has-text("Configure Campaign")').or(this.page.locator('h2:has-text("Campaign Preferences")')).first().waitFor({
        timeout: 5000
      });

      console.log('✅ Step 2: Product selected');
    } catch (error) {
      console.error('❌ Failed to select product:', error);
      const currentStep = await this.getCurrentStep();
      console.log(`Current step when error occurred: ${currentStep}`);
      throw error;
    }
  }

  async configurePreferences(options: {
    campaignType?: string;
    brandStyle?: string;
    campaignSize?: number;
  }) {
    try {
      const { campaignType, brandStyle, campaignSize } = options;

      // Select campaign type
      if (campaignType) {
        const typeSelector = `input[value="${campaignType}"], label:has-text("${this.formatLabel(campaignType)}")`;
        console.log(`🎯 Selecting campaign type: ${campaignType}`);
        await this.page.locator(typeSelector).first().click();
      }

      // Select brand style
      if (brandStyle) {
        const styleSelector = `input[value="${brandStyle}"], label:has-text("${this.formatLabel(brandStyle)}")`;
        console.log(`🎯 Selecting brand style: ${brandStyle}`);
        await this.page.locator(styleSelector).first().click();
      }

      // Select campaign size
      if (campaignSize) {
        const sizeSelector = `input[value="${campaignSize}"], label:has-text("${campaignSize}")`;
        console.log(`🎯 Selecting campaign size: ${campaignSize}`);
        await this.page.locator(sizeSelector).first().click();
      }

      // Wait for generate button to be available
      const generateBtn = this.page.locator('button:has-text("Start Generating Images"), button:has-text("Generate"), button:has-text("Start Generation"), button:has-text("Create Campaign")').first();
      await expect(generateBtn).toBeVisible();
      console.log('🎯 Generate button is now visible');

      console.log('✅ Step 3: Campaign configured');
    } catch (error) {
      console.error('❌ Failed to configure preferences:', error);
      const currentStep = await this.getCurrentStep();
      console.log(`Current step when error occurred: ${currentStep}`);
      throw error;
    }
  }

  async mockGenerationEndpoints(campaignSize: number = 3) {
    // Mock the generation API endpoint
    await this.page.route('/api/campaign/generate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          campaignId: 1,
          downloadUrl: '/api/campaign/download/test-campaign.zip',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          totalImages: campaignSize,
          successfulImages: campaignSize,
          requestedImages: campaignSize,
          generationTimeSeconds: 2.5
        })
      });
    });

    // Mock the images list endpoint
    await this.page.route('/api/campaign/1/images', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          campaignId: 1,
          images: [
            {
              id: 1,
              campaign_id: 1,
              format: 'instagram_post',
              prompt: 'Professional product shot with modern styling',
              width: 1080,
              height: 1080,
              selected: true,
              r2_path: 'campaigns/1/images/instagram_post_1.jpg',
              generated_at: new Date().toISOString()
            },
            {
              id: 2,
              campaign_id: 1,
              format: 'instagram_story',
              prompt: 'Professional product shot for Instagram Story',
              width: 1080,
              height: 1920,
              selected: true,
              r2_path: 'campaigns/1/images/instagram_story_1.jpg',
              generated_at: new Date().toISOString()
            },
            {
              id: 3,
              campaign_id: 1,
              format: 'facebook_cover',
              prompt: 'Professional product shot for Facebook Cover',
              width: 1200,
              height: 630,
              selected: false,
              r2_path: 'campaigns/1/images/facebook_cover_1.jpg',
              generated_at: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Mock individual image endpoints
    for (let i = 1; i <= campaignSize; i++) {
      await this.page.route(`/api/campaign/1/images/${i}`, async route => {
        if (route.request().method() === 'GET') {
          // Return a small test image
          await route.fulfill({
            status: 200,
            contentType: 'image/jpeg',
            body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
          });
        } else if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });
    }

    console.log('✅ Mock endpoints configured');
  }

  async startGeneration(isMocked: boolean = false) {
    const generateBtn = this.page.locator('button:has-text("Start Generating Images"), button:has-text("Generate"), button:has-text("Start Generation"), button:has-text("Create Campaign")').first();

    // Ensure the button is enabled before clicking
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // For mocked flows, skip waiting for loading state as it may complete too quickly
    if (!isMocked) {
      // Wait for loading state to appear (indicates generation has started)
      await this.page.locator('text=Generating Your Campaign')
        .or(this.page.locator('h2:has-text("Generating Your Campaign")'))
        .or(this.page.locator('text=Generating AI images'))
        .first().waitFor({
          timeout: 5000
        });
    } else {
      // For mocked flows, just wait a moment for the state transition
      await this.page.waitForTimeout(100);
    }

    console.log('✅ Step 4: Generation started');
  }

  async waitForGenerationComplete() {
    // Wait for real generation to complete (could take time)
    await this.page.waitForSelector('text=Generation Complete, text=Campaign Complete, text=Preview & Select', {
      timeout: 60000
    });

    console.log('✅ Step 5: Generation completed (real)');
  }

  async waitForMockedGenerationComplete() {
    try {
      console.log('🎯 Waiting for mocked generation to complete...');

      // For mocked generation, wait for the preview step
      // Look for the specific h2 text "Preview & Select Images" from the actual UI
      await this.page.waitForSelector('h2:has-text("Preview & Select Images")', {
        timeout: 10000
      });
      console.log('🎯 Preview heading found');

      // Wait for image gallery to be visible with the selection summary
      await this.page.waitForSelector('text=/\\d+ of \\d+ images selected/', {
        timeout: 5000
      });
      console.log('🎯 Image selection summary found');

      console.log('✅ Step 5: Generation completed (mocked) - Preview state active');
    } catch (error) {
      console.error('❌ Failed to wait for mocked generation completion:', error);
      const currentStep = await this.getCurrentStep();
      console.log(`Current step when error occurred: ${currentStep}`);

      // Try to take a screenshot for debugging
      try {
        await this.page.screenshot({ path: 'debug-generation-failure.png', fullPage: true });
        console.log('📸 Screenshot saved as debug-generation-failure.png');
      } catch (screenshotError) {
        console.log('Could not take screenshot:', screenshotError);
      }

      throw error;
    }
  }

  private formatLabel(value: string): string {
    return value.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Verify we're in the preview state with ImageGallery visible
   */
  async verifyPreviewState() {
    // Check for preview indicators using correct UI selectors
    const previewIndicators = [
      'h2:has-text("Preview & Select Images")',
      'text=/\\d+ of \\d+ images selected/',
      'button:has-text("Select All")',
      'button:has-text("Deselect All")'
    ];

    for (const selector of previewIndicators) {
      const element = this.page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`✅ Preview state verified with selector: ${selector}`);
        return true;
      }
    }

    throw new Error('Preview state not reached - ImageGallery not visible');
  }

  /**
   * Get the current campaign step
   */
  async getCurrentStep(): Promise<string> {
    // Check which step indicator is active with updated selectors
    const stepIndicators = {
      select: 'h2:has-text("Select Product")',
      configure: 'h2:has-text("Configure Campaign"), h2:has-text("Campaign Preferences")',
      generate: 'text=Generating, text=Processing, text=Creating',
      preview: 'h2:has-text("Preview & Select Images")',
      download: 'text=Download Campaign, text=Campaign Complete'
    };

    for (const [step, selector] of Object.entries(stepIndicators)) {
      const element = this.page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`📍 Current step detected: ${step}`);
        return step;
      }
    }

    console.log('⚠️ Current step could not be determined');
    return 'unknown';
  }
}

/**
 * Factory function to create flow helper
 */
export function createCampaignFlowHelper(page: Page) {
  return new CampaignFlowHelper(page);
}