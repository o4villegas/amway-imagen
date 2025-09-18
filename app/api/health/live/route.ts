import { NextRequest, NextResponse } from 'next/server';


/**
 * Liveness probe - simple check to see if the app is alive
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      alive: true,
      timestamp: new Date().toISOString(),
      message: 'Application is alive'
    },
    { status: 200 }
  );
}