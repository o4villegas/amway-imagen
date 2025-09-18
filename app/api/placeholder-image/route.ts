import { NextResponse } from 'next/server';


export async function GET() {
  // Create a simple SVG placeholder
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#f3f4f6"/>
      <rect x="150" y="150" width="100" height="100" fill="#d1d5db"/>
      <circle cx="175" cy="175" r="15" fill="#9ca3af"/>
      <path d="M160 200 L190 200 L200 210 L150 210 Z" fill="#9ca3af"/>
      <text x="200" y="260" font-family="Arial" font-size="16" fill="#6b7280" text-anchor="middle">Product Image</text>
      <text x="200" y="280" font-family="Arial" font-size="12" fill="#9ca3af" text-anchor="middle">Not Available</text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    }
  });
}