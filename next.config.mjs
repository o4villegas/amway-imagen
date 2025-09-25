import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize Cloudflare development environment
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.amway.com',
        port: '',
        pathname: '/medias/**',
      },
      {
        protocol: 'https',
        hostname: 'campaign-storage.imagenie-by-amway.workers.dev',
        port: '',
        pathname: '/**',
      },
      // Allow common image hosting domains for manual entry
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      // Allow localhost for image proxy during development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/**',
      },
      // Allow production domain for image proxy
      {
        protocol: 'https',
        hostname: 'imagenie-by-amway.workers.dev',
        port: '',
        pathname: '/api/**',
      }
    ],
    // Allow data URLs for development mode base64 images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
