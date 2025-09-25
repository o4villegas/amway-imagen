import { NextRequest, NextResponse } from 'next/server';


// This API route is dynamic and should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params.path.join('/');

    // Handle different image sources
    let imageUrl: string;
    if (imagePath.startsWith('amway/')) {
      imageUrl = `https://www.amway.com/medias/${imagePath.replace('amway/', '')}`;
    } else {
      // For other external images
      imageUrl = decodeURIComponent(imagePath);
    }

    console.log('Proxying image:', imageUrl);

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.amway.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);

      // Return a placeholder image instead of failing
      return new NextResponse(null, {
        status: 302,
        headers: {
          'Location': '/api/placeholder-image'
        }
      });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', // Cache for 24 hours, stale for 7 days
        'Access-Control-Allow-Origin': '*',
        'Content-Length': imageBuffer.byteLength.toString(),
      }
    });

  } catch (error) {
    console.error('Image proxy error:', error);

    // Return placeholder on error
    return new NextResponse(null, {
      status: 302,
      headers: {
        'Location': '/api/placeholder-image'
      }
    });
  }
}