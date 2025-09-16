export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/test-ai') {
      try {
        // Check if AI binding exists
        if (!env.AI) {
          return new Response(JSON.stringify({
            error: 'AI binding not available',
            bindings: Object.keys(env)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Try to run a simple AI request
        const response = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
          prompt: 'A simple test image',
          num_steps: 1,
          guidance: 7.5,
          width: 128,
          height: 128
        });

        return new Response(JSON.stringify({
          success: true,
          hasImage: !!response.image,
          responseKeys: Object.keys(response)
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          error: error.message,
          stack: error.stack,
          name: error.name
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Test Worker Running - Try /test-ai');
  }
};