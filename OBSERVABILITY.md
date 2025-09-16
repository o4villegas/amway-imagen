# Observability and Monitoring Setup

## 📊 **Current Observability Status**

### ✅ **Implemented**
- **Structured Logging**: Custom logger utility with JSON formatting
- **Request/Response Tracking**: API call timing and status tracking
- **Campaign Analytics**: Generation progress and success metrics
- **Error Tracking**: Comprehensive error logging with stack traces
- **Performance Metrics**: Duration tracking for operations

### 🔧 **Available via Cloudflare**
- **Real-time Logs**: `npx wrangler pages deployment tail`
- **Analytics Dashboard**: Cloudflare Pages Analytics
- **Performance Insights**: Core Web Vitals tracking
- **Error Rates**: Built-in error monitoring

## 🚀 **Monitoring Commands**

### **Real-time Log Monitoring**
```bash
# Monitor live application logs
npx wrangler pages deployment tail --project-name=amway-image-generator

# Filter logs by level
npx wrangler pages deployment tail --project-name=amway-image-generator --search="ERROR"

# Filter logs for specific operations
npx wrangler pages deployment tail --project-name=amway-image-generator --search="Campaign"
```

### **Analytics Access**
```bash
# View deployment analytics
npx wrangler pages deployment list --project-name=amway-image-generator

# Check recent activity
npx wrangler pages deployment list --project-name=amway-image-generator | head -5
```

## 📈 **Key Metrics to Monitor**

### **Performance Metrics**
- **Page Load Time**: < 3 seconds target
- **API Response Time**: < 2 seconds for scraping, < 60 seconds for generation
- **Image Generation Success Rate**: > 90% target
- **Cache Hit Rate**: Monitor R2 and CDN performance

### **Business Metrics**
- **Campaign Completion Rate**: Track successful vs failed campaigns
- **User Engagement**: Form submission to completion funnel
- **Resource Usage**: AI API calls, R2 storage, D1 queries

### **Error Metrics**
- **4xx Errors**: Client-side issues (validation, rate limiting)
- **5xx Errors**: Server-side issues (AI failures, database errors)
- **Failed Generations**: Track AI generation failures

## 🔍 **Log Structure**

### **Example Log Entry**
```json
{
  "timestamp": "2025-09-15T19:45:23.123Z",
  "level": "INFO",
  "message": "Campaign generation started",
  "context": {
    "campaignId": 123,
    "productId": 456,
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1"
  },
  "data": {
    "preferences": {
      "campaign_type": "lifestyle",
      "brand_style": "wellness",
      "campaign_size": 10
    }
  },
  "metrics": {
    "duration": 1500
  },
  "environment": "production"
}
```

## 🎯 **Alerting Recommendations**

### **Critical Alerts**
1. **Error Rate > 5%** over 5 minutes
2. **AI Generation Failure Rate > 20%** over 10 minutes
3. **Average Response Time > 10 seconds** over 5 minutes
4. **Database Connection Failures**

### **Warning Alerts**
1. **Page Load Time > 5 seconds** over 10 minutes
2. **Rate Limit Hit Rate > 50%** over 15 minutes
3. **R2 Storage > 80% quota**
4. **D1 Database > 80% quota**

## 📱 **Cloudflare Dashboard Monitoring**

### **Key Dashboards to Monitor**

1. **Pages Analytics**
   - Unique Visitors
   - Page Views
   - Core Web Vitals
   - Geographic Distribution

2. **Workers Analytics** (for API routes)
   - Request Volume
   - Error Rates
   - Duration Percentiles
   - Memory Usage

3. **R2 Analytics**
   - Storage Usage
   - Request Volume
   - Bandwidth Usage
   - Geographic Distribution

4. **D1 Analytics**
   - Query Performance
   - Storage Usage
   - Connection Pool Usage

## 🛠️ **Development Monitoring**

### **Local Development**
```bash
# Run with detailed logging
npm run preview

# Monitor logs in separate terminal
npx wrangler pages deployment tail --project-name=amway-image-generator --local
```

### **Testing Observability**
```bash
# Run tests with logging
npx playwright test --reporter=json

# Check test performance
npx playwright show-report
```

## 🔧 **Advanced Setup (Optional)**

### **External Monitoring Integration**

For production-scale monitoring, consider integrating:

1. **Sentry** for error tracking
   ```javascript
   // Add to wrangler.toml
   [vars]
   SENTRY_DSN = "your-sentry-dsn"
   ```

2. **Datadog** for comprehensive monitoring
3. **LogDNA/LogRocket** for user session monitoring
4. **Pingdom/StatusCake** for uptime monitoring

### **Custom Webhooks**
```javascript
// Example webhook for critical alerts
export async function sendAlert(message: string, level: 'critical' | 'warning') {
  if (level === 'critical') {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `🚨 ${message}` })
    });
  }
}
```

## 📊 **Usage Examples**

### **Campaign Generation Monitoring**
```typescript
import { logger } from '@/lib/logger';

// Track campaign start
logger.campaignStart(campaignId, productId, preferences);

// Track progress
logger.campaignProgress('AI Generation', 50, { imagesGenerated: 5, totalImages: 10 });

// Track completion
logger.campaignComplete(10, 9, 45000); // 10 requested, 9 successful, 45 seconds
```

### **API Performance Tracking**
```typescript
import { logRequest, logResponse } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestStart = logRequest(request);

  try {
    // ... API logic
    const response = NextResponse.json({ success: true });
    logResponse(requestStart, response, { recordsProcessed: 123 });
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: 'Internal error' }, { status: 500 });
    logResponse(requestStart, response, { errorType: error.name });
    return response;
  }
}
```

## 🎯 **Monitoring Checklist**

### **Daily**
- [ ] Check error rates in Cloudflare dashboard
- [ ] Monitor campaign success rates
- [ ] Review performance metrics

### **Weekly**
- [ ] Analyze user behavior patterns
- [ ] Review resource usage trends
- [ ] Check for any rate limiting issues

### **Monthly**
- [ ] Resource quota review (R2, D1, AI API)
- [ ] Performance optimization opportunities
- [ ] Cost analysis and optimization

---

**Next Steps**:
1. Deploy with enhanced logging
2. Set up Cloudflare dashboard monitoring
3. Configure alerts for critical metrics
4. Test monitoring with sample campaigns