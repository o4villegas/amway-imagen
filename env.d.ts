interface CloudflareEnv {
  AI: AI;
  BUCKET: R2Bucket;
  CAMPAIGN_STORAGE: R2Bucket;
  DB: D1Database;
  CLAUDE_API_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CAMPAIGN_EXPIRY_HOURS: string;
  MAX_IMAGES_PER_CAMPAIGN: string;
}
