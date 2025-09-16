# Comprehensive Manual Testing Checklist

## Overview
This checklist covers all aspects of testing the Amway IBO Image Campaign Generator.
Each test should be performed and results documented.

## FUNCTIONAL TESTS

### URL Input & Validation

#### 1. Empty URL submission (MEDIUM)

**Steps:**
- Navigate to /campaign/new
- Leave URL field empty
- Click 'Analyze Product'

**Expected Result:** Should show validation error

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Invalid URL format (MEDIUM)

**Steps:**
- Enter 'not-a-url'
- Submit form

**Expected Result:** Should show URL format error

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Non-Amway URL (HIGH)

**Steps:**
- Enter 'https://www.google.com'
- Submit form

**Expected Result:** Should show 'must be Amway URL' error

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 4. Valid Amway URL (CRITICAL)

**Steps:**
- Enter 'https://www.amway.com/en_US/p/nutrilite-double-x-vitamin-mineral-phytonutrient-supplement-p-100291'
- Submit

**Expected Result:** Should successfully scrape and show product info

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 5. Rate limiting test (MEDIUM)

**Steps:**
- Submit multiple URLs rapidly (>5 requests in 60 seconds)

**Expected Result:** Should show rate limit error after threshold

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

### Product Scraping

#### 1. Product information extraction (CRITICAL)

**Steps:**
- Use valid Amway URL
- Verify extracted data

**Expected Result:** Should show product name, description, price, image

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Caching behavior (MEDIUM)

**Steps:**
- Scrape same URL twice within 24 hours

**Expected Result:** Second request should return cached data quickly

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Invalid product page (MEDIUM)

**Steps:**
- Use Amway URL that doesn't exist

**Expected Result:** Should show appropriate error message

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

### Campaign Configuration

#### 1. Campaign type selection (HIGH)

**Steps:**
- Select 'Product Focus' vs 'Lifestyle'
- Verify prompts change

**Expected Result:** Different prompt styles should be generated

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Brand style options (HIGH)

**Steps:**
- Test Professional, Casual, Wellness, Luxury styles

**Expected Result:** Each should produce different visual characteristics

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Image format selection (HIGH)

**Steps:**
- Select different combinations of Instagram, Facebook, Pinterest

**Expected Result:** Should generate correct dimensions for each format

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 4. Campaign size limits (MEDIUM)

**Steps:**
- Test 5, 10, 15 image campaigns

**Expected Result:** Should generate exact number requested

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

### AI Image Generation

#### 1. Successful generation (CRITICAL)

**Steps:**
- Configure campaign
- Generate images
- Wait for completion

**Expected Result:** Should generate all requested images without errors

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Generation progress tracking (MEDIUM)

**Steps:**
- Start generation
- Monitor progress indicators

**Expected Result:** Should show real-time progress updates

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Error handling in generation (HIGH)

**Steps:**
- Test with problematic inputs
- Verify error recovery

**Expected Result:** Should handle partial failures gracefully

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 4. Generation timeout (MEDIUM)

**Steps:**
- Monitor generation for extended time

**Expected Result:** Should complete within reasonable time or show timeout

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

### Download & ZIP Creation

#### 1. ZIP file creation (CRITICAL)

**Steps:**
- Complete generation
- Download campaign ZIP

**Expected Result:** Should create properly structured ZIP with all images

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. File organization (MEDIUM)

**Steps:**
- Extract ZIP
- Verify folder structure

**Expected Result:** Images should be organized by format in folders

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Download expiration (LOW)

**Steps:**
- Wait 24+ hours
- Try to download expired campaign

**Expected Result:** Should show expiration message

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 4. Multiple downloads (LOW)

**Steps:**
- Download same campaign multiple times

**Expected Result:** Should allow repeated downloads within expiration

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

## PERFORMANCE TESTS

### Page Load Performance

#### 1. Initial page load (HIGH)

**Steps:**
- Navigate to homepage
- Measure load time

**Expected Result:** Should load in under 3 seconds

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Campaign page load (MEDIUM)

**Steps:**
- Navigate to /campaign/new
- Measure load time

**Expected Result:** Should load in under 2 seconds

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Large campaign generation (MEDIUM)

**Steps:**
- Generate 15-image campaign
- Monitor performance

**Expected Result:** Should complete without browser hanging

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

### API Performance

#### 1. Scraping API response time (MEDIUM)

**Steps:**
- Submit product URL
- Measure response time

**Expected Result:** Should respond in under 5 seconds

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Generation API response time (MEDIUM)

**Steps:**
- Start image generation
- Measure total time

**Expected Result:** Should complete generation within reasonable time based on size

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

## SECURITY TESTS

### Input Validation

#### 1. XSS in URL input (CRITICAL)

**Steps:**
- Enter '<script>alert(1)</script>' in URL field

**Expected Result:** Should sanitize input and not execute script

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. SQL injection attempts (CRITICAL)

**Steps:**
- Try SQL injection patterns in form inputs

**Expected Result:** Should not affect database operations

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. CSRF protection (HIGH)

**Steps:**
- Attempt cross-site form submission

**Expected Result:** Should have CSRF protection in place

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

### Data Protection

#### 1. Sensitive data exposure (CRITICAL)

**Steps:**
- Check browser dev tools for exposed secrets

**Expected Result:** No API keys or secrets should be visible

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Session security (MEDIUM)

**Steps:**
- Check cookie security attributes

**Expected Result:** Cookies should have Secure and HttpOnly flags

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

## ACCESSIBILITY TESTS

### Screen Reader Compatibility

#### 1. Form labels (HIGH)

**Steps:**
- Navigate form with screen reader

**Expected Result:** All inputs should have proper labels

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Image alt text (MEDIUM)

**Steps:**
- Check all images for alt attributes

**Expected Result:** Generated images should have descriptive alt text

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Keyboard navigation (HIGH)

**Steps:**
- Navigate entire interface using only keyboard

**Expected Result:** All interactive elements should be keyboard accessible

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

### Visual Accessibility

#### 1. Color contrast (MEDIUM)

**Steps:**
- Check text/background contrast ratios

**Expected Result:** Should meet WCAG AA standards (4.5:1 ratio)

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Font size and readability (MEDIUM)

**Steps:**
- Test with browser zoom at 200%

**Expected Result:** Interface should remain usable at high zoom levels

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

## MOBILE RESPONSIVE TESTS

### Mobile Layout

#### 1. Mobile viewport (375px) (HIGH)

**Steps:**
- Resize browser to mobile width
- Test all functionality

**Expected Result:** Should work properly on mobile without horizontal scrolling

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Tablet viewport (768px) (MEDIUM)

**Steps:**
- Resize to tablet width
- Test interface

**Expected Result:** Should adapt layout appropriately for tablet

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Touch interactions (MEDIUM)

**Steps:**
- Test on actual touch device
- Verify touch targets

**Expected Result:** Touch targets should be at least 44px for easy tapping

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

## BROWSER COMPATIBILITY TESTS

### Cross-Browser Testing

#### 1. Chrome compatibility (CRITICAL)

**Steps:**
- Test all functionality in latest Chrome

**Expected Result:** Should work perfectly

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Firefox compatibility (HIGH)

**Steps:**
- Test all functionality in latest Firefox

**Expected Result:** Should work without major issues

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Safari compatibility (MEDIUM)

**Steps:**
- Test in Safari if available

**Expected Result:** Should work with potential minor styling differences

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 4. Edge compatibility (MEDIUM)

**Steps:**
- Test in Microsoft Edge

**Expected Result:** Should work properly

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

## EDGE CASE TESTS

### Unusual Scenarios

#### 1. Very long product names (LOW)

**Steps:**
- Test with products having extremely long names

**Expected Result:** Should handle gracefully without breaking layout

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 2. Products without images (MEDIUM)

**Steps:**
- Test with product pages lacking main images

**Expected Result:** Should provide fallback or appropriate handling

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 3. Network interruption during generation (MEDIUM)

**Steps:**
- Disconnect internet during image generation

**Expected Result:** Should show appropriate error and allow retry

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

#### 4. Browser refresh during generation (LOW)

**Steps:**
- Refresh page while images are generating

**Expected Result:** Should handle gracefully without corrupting state

**Status:** [ ] Pass [ ] Fail [ ] N/A

**Notes:** ________________________

---

