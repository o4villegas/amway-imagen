# API Documentation

## Health & Monitoring Endpoints

### GET /api/health

Comprehensive health check endpoint that verifies all system components.

#### Response

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": true,
    "storage": true,
    "ai": true
  },
  "environment": "production",
  "version": "1.0.0",
  "uptime": 123456
}
```

#### Status Codes

- `200 OK` - All services healthy
- `503 Service Unavailable` - Some services degraded
- `500 Internal Server Error` - Critical services unhealthy

#### Usage

```bash
curl https://your-app.pages.dev/api/health
```

### GET /api/health/ready

Readiness probe to check if the application is ready to serve traffic.

#### Response

```json
{
  "ready": true,
  "checks": {
    "database": true,
    "storage": true,
    "ai": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "message": "Application is ready"
}
```

#### Status Codes

- `200 OK` - Application is ready
- `503 Service Unavailable` - Application not ready

#### Usage

```bash
curl https://your-app.pages.dev/api/health/ready
```

### GET /api/health/live

Simple liveness check to verify the application is running.

#### Response

```json
{
  "alive": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "Application is alive"
}
```

#### Status Code

- `200 OK` - Always returns 200 if the application responds

#### Usage

```bash
curl https://your-app.pages.dev/api/health/live
```

## Core API Endpoints

### POST /api/products/load

Load product information from an Amway URL.

#### Request Body

```json
{
  "productUrl": "https://www.amway.com/en_US/p/124481"
}
```

#### Response

```json
{
  "product": {
    "id": 1,
    "amway_product_id": "124481",
    "name": "Nutrilite Vitamin C",
    "description": "...",
    "benefits": "...",
    "category": "health",
    "brand": "Nutrilite",
    "price": 29.99,
    "currency": "USD",
    "main_image_url": "...",
    "available": true
  }
}
```

#### Error Responses

- `400 Bad Request` - Invalid URL format
- `404 Not Found` - Product not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Scraping failed

### GET /api/products/search

Search for products in the database.

#### Query Parameters

- `q` - Search query (optional)
- `limit` - Number of results (default: 10, max: 50)

#### Response

```json
{
  "products": [
    {
      "id": 1,
      "name": "Nutrilite Vitamin C",
      "category": "health",
      "available": true,
      // ... other fields
    }
  ],
  "total": 1
}
```

### POST /api/campaign/generate

Generate a new campaign with AI images.

#### Request Body

```json
{
  "productId": 1,
  "preferences": {
    "campaign_type": "product_focus",
    "brand_style": "professional",
    "color_scheme": "amway_brand",
    "text_overlay": "moderate",
    "campaign_size": 5,
    "image_formats": ["instagram_post", "instagram_story"]
  }
}
```

#### Response

```json
{
  "success": true,
  "campaignId": 123,
  "downloadUrl": "/api/campaign/download/abc123.zip",
  "expiresAt": "2024-01-02T00:00:00.000Z",
  "totalImages": 5,
  "successfulImages": 5,
  "requestedImages": 5,
  "generationTimeSeconds": 15.5
}
```

#### Error Responses

- `400 Bad Request` - Invalid request data
- `404 Not Found` - Product not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Generation failed

### GET /api/campaign/[id]/images

Get all images for a campaign.

#### Response

```json
{
  "campaignId": 123,
  "images": [
    {
      "id": 1,
      "format": "instagram_post",
      "width": 1080,
      "height": 1080,
      "selected": true,
      "r2_path": "campaigns/123/images/instagram_post_1.jpg",
      "generated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### PATCH /api/campaign/[campaignId]/images/[imageId]

Update image selection status.

#### Request Body

```json
{
  "selected": true
}
```

#### Response

```json
{
  "success": true
}
```

### GET /api/campaign/download/[key]

Download the campaign ZIP file.

#### Response

Binary ZIP file with appropriate headers:
- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="campaign-[timestamp].zip"`

#### Error Response

- `404 Not Found` - Campaign not found or expired

## Rate Limiting

All API endpoints are protected by rate limiting:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Scraping | 10 requests | 5 minutes |
| Generation | 5 requests | 10 minutes |
| Search | 30 requests | 1 minute |
| Health | 100 requests | 1 minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp
- `Retry-After` - Seconds until retry (when limited)

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional context (optional)
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Rate limit exceeded
- `GENERATION_ERROR` - AI generation failed
- `DATABASE_ERROR` - Database operation failed
- `STORAGE_ERROR` - Storage operation failed

## Authentication

Currently, the API does not require authentication. In production, consider implementing:
- API key authentication
- JWT tokens for session management
- CORS configuration for allowed origins

## Monitoring Integration

The health endpoints are designed for integration with monitoring services:

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 8080
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Uptime Monitoring

Configure your monitoring service to check:
- `/api/health` - Every 5 minutes for comprehensive status
- `/api/health/live` - Every 30 seconds for basic uptime

### Alerting Thresholds

Recommended alert configurations:
- **Critical**: `/api/health` returns `unhealthy` status
- **Warning**: `/api/health` returns `degraded` status
- **Info**: Response time > 2 seconds for health checks