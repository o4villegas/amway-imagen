# Security Best Practices

This document outlines the security features and best practices implemented in the Amway IBO Image Campaign Generator.

## Security Features

### 1. Input Validation

All user inputs are validated using Zod schemas before processing:

```typescript
// URL validation with domain restriction
export const urlSchema = z.object({
  productUrl: z.string()
    .url('Invalid URL format')
    .refine(url => new URL(url).hostname.includes('amway.com'))
});
```

**Implementation Files**:
- `/lib/validation.ts` - Core validation schemas and sanitization functions
- All API routes validate input before processing

### 2. XSS Prevention

Multiple layers of protection against Cross-Site Scripting:

#### String Sanitization
```typescript
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>\"']/g, '')         // Remove HTML/JS injection chars
    .replace(/javascript:/gi, '')     // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')       // Remove event handlers
    .replace(/\x00/g, '')             // Remove null bytes
    .trim()
    .substring(0, 1000);              // Limit length
};
```

#### HTML Content Sanitization
```typescript
export const sanitizeHtml = (input: string): string => {
  // Remove script tags and content
  let clean = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  // Remove dangerous protocols
  clean = clean.replace(/javascript:|data:text\/html/gi, '');
  return clean.trim();
};
```

### 3. SQL Injection Prevention

All database queries use parameterized statements:

```typescript
// Safe query execution
const result = await context.env.DB
  .prepare('SELECT * FROM products WHERE id = ?')
  .bind(productId)
  .first();
```

Search queries are sanitized:
```typescript
export const sanitizeSearchQuery = (input: string): string => {
  return input
    .replace(/['";\\]/g, '')      // Remove SQL special characters
    .replace(/--/g, '')           // Remove SQL comments
    .replace(/\/\*/g, '')         // Remove multi-line comments
    .trim()
    .substring(0, 200);
};
```

### 4. Rate Limiting

API endpoints are protected with configurable rate limits:

| Endpoint Type | Limit | Window | Implementation |
|--------------|-------|---------|----------------|
| Scraping | 10 requests | 5 minutes | Memory-based with sliding window |
| Generation | 5 requests | 10 minutes | Per-user tracking |
| Search | 30 requests | 1 minute | Fast lookup protection |
| Health | 100 requests | 1 minute | Monitoring friendly |

**Implementation**: `/lib/rate-limiter.ts`

### 5. Environment Variable Security

Safe access to environment variables in edge runtime:

```typescript
export function getEnvVar(key: string, defaultValue: string = ''): string {
  try {
    // Check process.env (Node.js)
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
    // Check globalThis.env (Cloudflare Workers)
    if (typeof globalThis !== 'undefined' && (globalThis as any).env?.[key]) {
      return (globalThis as any).env[key];
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}
```

**Implementation**: `/lib/env-utils.ts`

### 6. Error Handling

#### Error Boundaries
All critical components are wrapped with error boundaries:
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <CriticalComponent />
</ErrorBoundary>
```

#### Safe Error Messages
Production errors never expose sensitive information:
```typescript
if (!isDevelopment()) {
  return { error: 'An error occurred processing your request' };
} else {
  return { error: error.message, stack: error.stack };
}
```

### 7. Request Deduplication

Prevents duplicate API calls and potential race conditions:

```typescript
const deduplicator = new RequestDeduplicator(5000);
const result = await deduplicator.dedupe(key, async () => {
  return await fetch('/api/endpoint');
});
```

**Implementation**: `/lib/request-dedup.ts`

### 8. Safe Logging

Production-safe logging with sensitive data redaction:

```typescript
export const safeLog = (message: string, data?: any, sensitiveFields: string[] = []) => {
  if (isDevelopment()) {
    const sanitizedData = { ...data };
    sensitiveFields.forEach(field => {
      if (field in sanitizedData) {
        sanitizedData[field] = '[REDACTED]';
      }
    });
    console.log(message, sanitizedData);
  }
};
```

## Security Headers

The application sets appropriate security headers:

```typescript
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
};
```

## File Upload Security

### Image Validation
- File type validation (only specific image formats)
- File size limits enforced
- Content-type verification
- Filename sanitization

### Storage Security
- R2 buckets with appropriate access controls
- Temporary download URLs with expiration
- Campaign files expire after 24 hours

## Authentication & Authorization

While the current implementation doesn't require authentication, the infrastructure is prepared for:
- API key authentication
- JWT token support
- Session management
- Role-based access control

## Monitoring & Alerting

### Health Checks
Three levels of health monitoring:
1. `/api/health` - Comprehensive system status
2. `/api/health/ready` - Readiness probe
3. `/api/health/live` - Liveness check

### Security Event Logging
- Failed validation attempts logged
- Rate limit violations tracked
- Error patterns monitored
- Suspicious activity detection ready

## Development Security Practices

### Code Review Checklist
- [ ] Input validation implemented
- [ ] Output encoding applied
- [ ] SQL queries parameterized
- [ ] Sensitive data not logged
- [ ] Error messages sanitized
- [ ] Rate limiting configured
- [ ] Security headers set

### Dependencies
- Regular dependency updates
- Security vulnerability scanning
- Lock file integrity maintained
- Minimal dependency footprint

### Testing
- Security-focused test cases
- Input fuzzing tests
- XSS payload testing
- SQL injection testing
- Rate limit validation

## Incident Response

### If a Security Issue is Discovered

1. **Immediate Actions**:
   - Assess severity and impact
   - Apply temporary mitigation if possible
   - Document the issue thoroughly

2. **Communication**:
   - Notify development team
   - Update security documentation
   - Consider user notification if data affected

3. **Resolution**:
   - Develop and test fix
   - Deploy with monitoring
   - Post-incident review

## Compliance Considerations

### GDPR & Privacy
- No personal data stored without consent
- Data minimization principle followed
- Right to deletion supported
- Privacy-by-design architecture

### Advertising Compliance
- Amway compliance disclaimers included
- FTC disclosure requirements met
- Copyright and trademark respect

## Security Resources

### References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security Best Practices](https://developers.cloudflare.com/workers/platform/security/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

### Tools Used
- Zod for runtime validation
- Cloudflare WAF for DDoS protection
- Playwright for security testing
- ESLint security plugins

## Regular Security Tasks

### Weekly
- Review error logs for patterns
- Check rate limit effectiveness
- Monitor health endpoints

### Monthly
- Dependency updates
- Security scanning
- Performance review

### Quarterly
- Full security audit
- Penetration testing consideration
- Documentation updates

## Contact

For security concerns or vulnerability reports, please contact the development team through secure channels.

---

**Last Updated**: January 2025
**Version**: 1.0.0