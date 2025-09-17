/**
 * Test data and mock objects for consistent testing
 */

export const mockProducts = [
  // AVAILABLE PRODUCTS (3 working products)
  {
    id: 1,
    available: true,
    name: 'Artistry Exact Fit Powder Foundation',
    description: 'Perfect coverage with a natural, seamless finish that looks like your skin, only better',
    brand: 'Artistry',
    category: 'beauty',
    price: 42.00,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Long-lasting coverage, natural finish, suitable for all skin types, SPF 15 protection',
    inventory_status: 'In Stock',
    product_url: 'https://www.amway.com/product/123',
    amway_product_id: 'ART001',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    available: true,
    name: 'Nutrilite™ Women\'s Pack',
    description: 'Complete nutritional support specifically formulated for women\'s health needs',
    brand: 'Nutrilite',
    category: 'nutrition',
    price: 89.95,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Essential vitamins and minerals, immune support, energy enhancement, bone health',
    inventory_status: 'In Stock',
    product_url: 'https://www.amway.com/product/456',
    amway_product_id: 'NUT001',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    available: true,
    name: 'eSpring® Water Purifier',
    description: 'Advanced water filtration system that removes over 140 contaminants',
    brand: 'eSpring',
    category: 'home',
    price: 1199.00,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Pure, clean water, advanced filtration, long-lasting filters, UV light technology',
    inventory_status: 'In Stock',
    product_url: 'https://www.amway.com/product/789',
    amway_product_id: 'ESP001',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },

  // DISABLED PRODUCTS (Coming Soon - Professional appearance)
  {
    id: 4,
    available: false,
    name: 'Artistry Supreme LX™ Regenerating Eye Cream',
    description: 'Luxurious anti-aging eye cream with advanced peptide technology',
    brand: 'Artistry',
    category: 'beauty',
    price: 95.00,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Reduces fine lines, firms skin, brightens dark circles, premium ingredients',
    inventory_status: 'Coming Soon',
    product_url: 'https://www.amway.com/product/art-002',
    amway_product_id: 'ART002',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 5,
    available: false,
    name: 'Artistry Skin Nutrition™ Renewing Cleanser',
    description: 'Gentle yet effective daily cleanser enriched with botanical extracts',
    brand: 'Artistry',
    category: 'beauty',
    price: 28.00,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Deep cleansing, maintains moisture, removes impurities, plant-based formula',
    inventory_status: 'Coming Soon',
    product_url: 'https://www.amway.com/product/art-003',
    amway_product_id: 'ART003',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 6,
    available: false,
    name: 'Nutrilite™ Vitamin D',
    description: 'Essential vitamin D3 supplement for bone health and immune support',
    brand: 'Nutrilite',
    category: 'nutrition',
    price: 24.95,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Bone strength, immune function, calcium absorption, high potency',
    inventory_status: 'Coming Soon',
    product_url: 'https://www.amway.com/product/nut-002',
    amway_product_id: 'NUT002',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 7,
    available: false,
    name: 'Nutrilite™ Omega-3 Complex',
    description: 'Premium fish oil supplement with EPA and DHA for heart and brain health',
    brand: 'Nutrilite',
    category: 'nutrition',
    price: 39.95,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Heart health, brain function, joint support, sustainable sourcing',
    inventory_status: 'Coming Soon',
    product_url: 'https://www.amway.com/product/nut-003',
    amway_product_id: 'NUT003',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 8,
    available: false,
    name: 'Legacy of Clean™ Multi-Purpose Cleaner',
    description: 'Biodegradable, concentrated cleaner safe for your family and the environment',
    brand: 'Legacy of Clean',
    category: 'home',
    price: 12.99,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Eco-friendly, versatile cleaning, concentrated formula, plant-based ingredients',
    inventory_status: 'Coming Soon',
    product_url: 'https://www.amway.com/product/loc-001',
    amway_product_id: 'LOC001',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 9,
    available: false,
    name: 'Atmosphere Sky™ Air Treatment System',
    description: 'Advanced air purification system with HEPA filtration and smart monitoring',
    brand: 'Atmosphere',
    category: 'home',
    price: 899.00,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'HEPA filtration, smart controls, quiet operation, removes allergens and pollutants',
    inventory_status: 'Coming Soon',
    product_url: 'https://www.amway.com/product/atm-001',
    amway_product_id: 'ATM001',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 10,
    available: false,
    name: 'XS™ Energy Drink - Variety Pack',
    description: 'Sugar-free energy drinks with natural caffeine and B-vitamins',
    brand: 'XS',
    category: 'nutrition',
    price: 32.95,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Natural energy boost, zero sugar, B-vitamin complex, variety of flavors',
    inventory_status: 'Coming Soon',
    product_url: 'https://www.amway.com/product/xs-001',
    amway_product_id: 'XS001',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 11,
    available: false,
    name: 'Glister™ Multi-Action Fluoride Toothpaste',
    description: 'Advanced oral care toothpaste with REMINACT™ formula for comprehensive protection',
    brand: 'Glister',
    category: 'beauty',
    price: 8.95,
    currency: 'USD',
    main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
    benefits: 'Cavity protection, whitening action, fresh breath, enamel strengthening',
    inventory_status: 'Coming Soon',
    product_url: 'https://www.amway.com/product/gli-001',
    amway_product_id: 'GLI001',
    scraped_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockCampaignPreferences = {
  valid: {
    campaign_type: 'product_focus' as const,
    brand_style: 'professional' as const,
    color_scheme: 'amway_brand' as const,
    text_overlay: 'moderate' as const,
    campaign_size: 1 as const,
    image_formats: ['instagram_post'] as const
  },
  lifestyle: {
    campaign_type: 'lifestyle' as const,
    brand_style: 'casual' as const,
    color_scheme: 'product_inspired' as const,
    text_overlay: 'heavy' as const,
    campaign_size: 3 as const,
    image_formats: ['instagram_post', 'facebook_cover'] as const
  },
  wellness: {
    campaign_type: 'product_focus' as const,
    brand_style: 'wellness' as const,
    color_scheme: 'custom' as const,
    text_overlay: 'minimal' as const,
    campaign_size: 5 as const,
    image_formats: ['instagram_story', 'pinterest'] as const
  }
};

export const mockApiResponses = {
  products: {
    success: {
      status: 200,
      body: { products: mockProducts }
    },
    empty: {
      status: 200,
      body: { products: [] }
    },
    error: {
      status: 500,
      body: { error: 'Failed to load products' }
    }
  },

  generation: {
    success: {
      status: 200,
      body: {
        success: true,
        campaignId: 123,
        downloadUrl: '/api/campaign/download/test-campaign.zip',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        totalImages: 1,
        successfulImages: 1,
        requestedImages: 1,
        generationTimeSeconds: 5.2
      }
    },
    rateLimit: {
      status: 429,
      headers: { 'Retry-After': '300' },
      body: { error: 'Too many generation requests. Please try again later.' }
    },
    serverError: {
      status: 500,
      body: { error: 'AI service temporarily unavailable' }
    },
    validationError: {
      status: 400,
      body: { error: 'Validation failed: productId is required' }
    }
  },

  search: {
    artistry: {
      status: 200,
      body: {
        products: mockProducts.filter(p => p.brand === 'Artistry')
      }
    },
    empty: {
      status: 200,
      body: { products: [] }
    }
  }
};

export const testUrls = {
  campaign: '/campaign/new',
  api: {
    products: '/api/products/load',
    search: '/api/products/search',
    generate: '/api/campaign/generate',
    manual: '/api/products/manual'
  }
};

export const selectors = {
  // Page elements
  mainHeading: 'h1',
  logo: 'img[alt="Amway"]',

  // Product browser
  productCard: '[data-testid="product-card"], .product-card',
  productName: 'text=Artistry, text=Nutrilite, text=eSpring',
  selectButton: 'button:has-text("Select"), button:has-text("Choose")',

  // Campaign configuration
  campaignType: {
    productFocus: 'input[value="product_focus"], label:has-text("Product Focus")',
    lifestyle: 'input[value="lifestyle"], label:has-text("Lifestyle")'
  },
  brandStyle: {
    professional: 'input[value="professional"], label:has-text("Professional")',
    casual: 'input[value="casual"], label:has-text("Casual")',
    wellness: 'input[value="wellness"], label:has-text("Wellness")',
    luxury: 'input[value="luxury"], label:has-text("Luxury")'
  },
  campaignSize: {
    one: 'input[value="1"], label:has-text("1")',
    three: 'input[value="3"], label:has-text("3")',
    five: 'input[value="5"], label:has-text("5")'
  },

  // Actions
  generateButton: 'button:has-text("Generate"), button:has-text("Create Campaign")',
  downloadButton: 'button:has-text("Download"), a[href*="download"]',
  retryButton: 'button:has-text("Retry"), button:has-text("Try Again")',

  // States
  loading: 'text=Loading, text=loading, [data-testid="loading"], .loading',
  error: 'text=error, text=Error, [role="alert"]',
  success: 'text=Success, text=Complete, text=generated'
};

export const timeouts = {
  short: 1000,
  medium: 3000,
  long: 5000,
  networkLoad: 10000
};

export const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 }
};

export const performance = {
  thresholds: {
    pageLoad: 5000,
    apiResponse: 10000,
    generation: 60000,
    memoryUsage: 100 * 1024 * 1024, // 100MB
    lcp: 2500, // Largest Contentful Paint
    fid: 100   // First Input Delay
  }
};