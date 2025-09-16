# NSFW Content Filter Investigation Plan

## Root Cause Confirmed
Our investigation has conclusively identified that:
- ✅ AI binding is properly configured and accessible
- ✅ Simple AI generation works (landscape prompt succeeded)
- ❌ Complex product prompts trigger Cloudflare's NSFW content filter (Error 3030)

## Problem Analysis

### Current Issue
The real campaign generation fails because our generated prompts contain content that Cloudflare's AI safety filter flags as potentially inappropriate. This is happening despite having:
- Comprehensive prompt sanitization (`lib/prompt-sanitizer.ts`)
- Professional marketing-focused templates (`lib/prompt-templates.ts`)
- Product-specific benefit extraction

### Potential Trigger Points

Based on code analysis, these elements could trigger NSFW filtering:

1. **Product Benefit Keywords** (lines 98-118 in `prompt-generator.ts`):
   - "skin and beauty"
   - "weight management and fitness"
   - "digestive wellness"
   - Combined benefit phrases might create problematic context

2. **Template Variables** in `prompt-templates.ts`:
   - "{demographic} {action}" combinations
   - Lifestyle context descriptions
   - Body/health-related terminology

3. **Product Names/Descriptions**:
   - Amway product names may contain wellness terms
   - Product descriptions might include body-related language

4. **Prompt Construction Logic**:
   - Multiple layers of text concatenation
   - Complex template substitution
   - Potential for unintended phrase combinations

## Investigation Plan

### Phase 1: Prompt Logging (No Code Changes)
1. **Add temporary logging endpoint** to capture generated prompts
2. **Test with real product** to see exact prompts being sent to AI
3. **Identify specific triggering words/phrases**

### Phase 2: Content Analysis
1. **Map flagged content** to specific generation logic
2. **Test individual prompt components** (benefits, templates, etc.)
3. **Identify minimum viable safe prompt structure**

### Phase 3: Remediation Strategy
1. **Enhanced NSFW-aware sanitization**:
   - Add wellness/body terminology filter
   - Implement safe synonym replacement
   - Create approved word lists for health products

2. **Template Refinement**:
   - Remove potentially problematic template combinations
   - Focus on product-centric rather than body-centric language
   - Simplify prompt structure to reduce complexity

3. **Fallback Mechanism**:
   - Implement progressive prompt simplification
   - Retry with safer prompts if NSFW error occurs
   - Maintain quality while ensuring compliance

## Proposed Implementation

### Step 1: Diagnostic Endpoint
```typescript
// Add to /api/debug-prompts/route.ts
// - Generate prompts without sending to AI
// - Return all generated prompts for inspection
// - Test with real product data
```

### Step 2: Enhanced Sanitization
```typescript
// Enhance prompt-sanitizer.ts with:
// - NSFW-aware keyword filtering
// - Body/wellness terminology replacement
// - Safe synonym mapping
// - Progressive prompt simplification
```

### Step 3: Retry Logic
```typescript
// Add to campaign generation:
// - Catch NSFW errors (code 3030)
// - Generate simplified prompts
// - Retry with safer alternatives
// - Log successful prompt patterns
```

### Step 4: Quality Assurance
```typescript
// - Test with various Amway products
// - Validate image quality with safer prompts
// - Monitor success rates
// - Build approved prompt library
```

## Expected Outcome
After implementation:
- ✅ Campaign generation will work reliably
- ✅ Generated images maintain professional quality
- ✅ NSFW filter compliance achieved
- ✅ User experience restored

## Risk Assessment
- **Low Risk**: Changes are additive (logging, enhanced filtering)
- **High Confidence**: We've identified the exact root cause
- **Measurable Success**: Can validate with real tests before deployment

## Next Steps
1. **Get approval** for this investigation plan
2. **Implement diagnostic endpoint** to capture prompts
3. **Analyze specific trigger content**
4. **Design targeted remediation** based on findings
5. **Test and deploy solution**

This approach will solve the NSFW filtering issue while maintaining the quality and effectiveness of our AI-generated marketing images.