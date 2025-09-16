import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    console.log('[BINDING_TEST] Starting binding test');

    const context = getRequestContext();
    const { AI, CAMPAIGN_STORAGE, DB } = context.env;

    const bindingStatus = {
      timestamp: new Date().toISOString(),
      hasAI: !!AI,
      hasCampaignStorage: !!CAMPAIGN_STORAGE,
      hasDB: !!DB,
      aiType: typeof AI,
      envKeys: Object.keys(context.env || {}),
      nodeEnv: process.env.NODE_ENV
    };

    console.log('[BINDING_TEST] Binding status:', bindingStatus);

    // If AI binding exists, try a simple test
    if (AI) {
      try {
        console.log('[BINDING_TEST] Testing AI binding...');

        // Try to access AI properties
        const aiInfo = {
          hasRun: typeof AI.run === 'function',
          toString: AI.toString(),
          constructor: AI.constructor?.name
        };

        console.log('[BINDING_TEST] AI info:', aiInfo);

        // Try a very simple AI call with safe prompt
        const testResult = await AI.run('@cf/black-forest-labs/flux-1-schnell', {
          prompt: 'A beautiful landscape with mountains and blue sky',
          num_steps: 4,
          guidance: 7.5,
          width: 256,
          height: 256
        });

        console.log('[BINDING_TEST] AI test successful');

        return NextResponse.json({
          ...bindingStatus,
          aiTest: {
            success: true,
            hasImage: !!testResult.image,
            resultKeys: Object.keys(testResult || {})
          }
        });

      } catch (aiError: any) {
        console.error('[BINDING_TEST] AI test failed:', {
          name: aiError.name,
          message: aiError.message,
          code: aiError.code,
          stack: aiError.stack?.substring(0, 500)
        });

        return NextResponse.json({
          ...bindingStatus,
          aiTest: {
            success: false,
            error: aiError.message,
            errorCode: aiError.code,
            errorName: aiError.name
          }
        });
      }
    } else {
      console.error('[BINDING_TEST] AI binding not available');

      return NextResponse.json({
        ...bindingStatus,
        aiTest: {
          success: false,
          error: 'AI binding not available'
        }
      });
    }

  } catch (error: any) {
    console.error('[BINDING_TEST] Test failed:', error);

    return NextResponse.json({
      error: 'Binding test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}