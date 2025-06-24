export default {
  async fetch(request, env) {
    const inputs = {
      prompt: "A confident business owner standing in a modern office with large glass windows overlooking a city skyline at sunrise, ambient warm lighting, wearing a tailored suit, holding a digital tablet displaying analytics, diverse team working collaboratively in the background, high contrast, ultra-realistic style, clean and minimal aesthetic, corporate color palette (blue, gray, white), depth of field focus on the business owner, professional branding atmosphere, 16:9 composition, perfect lighting, cinematic",
    };

    const response = await env.AI.run(
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      inputs,
    );

    return new Response(response, {
      headers: {
        "content-type": "image/png",
      },
    });
  },
} satisfies ExportedHandler<Env>;
