type Env = {
  AI: any;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      const formData = await request.formData();
      const prompt = formData.get("prompt")?.toString() || "";

      const inputs = { prompt };

      const aiResponse = await env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        inputs,
      );

      return new Response(aiResponse, {
        headers: { "content-type": "image/png" },
      });
    }

    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>AI Ad Image Generator</title>
        <style>
          body {
            font-family: sans-serif;
            padding: 2rem;
            max-width: 800px;
            margin: auto;
            background: #f4f4f8;
            color: #333;
          }
          input[type="submit"] {
            padding: 0.5rem 1rem;
            background: #1F497D;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          textarea {
            width: 100%;
            height: 120px;
            font-size: 1rem;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
            border: 1px solid #ccc;
          }
          img {
            display: block;
            margin-top: 2rem;
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <h1>AI Ad Image Generator</h1>
        <form method="POST">
          <label for="prompt">Prompt:</label><br />
          <textarea name="prompt">
A confident business owner standing in a modern office with large glass windows overlooking a city skyline at sunrise, ambient warm lighting, wearing a tailored suit, holding a digital tablet displaying analytics, diverse team working collaboratively in the background, high contrast, ultra-realistic style, clean and minimal aesthetic, corporate color palette (blue, gray, white), depth of field focus on the business owner, professional branding atmosphere, 16:9 composition, perfect lighting, cinematic
          </textarea><br />
          <input type="submit" value="Generate Image" />
        </form>

        <script>
          const form = document.querySelector('form');
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const response = await fetch('/', {
              method: 'POST',
              body: formData,
            });
            const blob = await response.blob();
            const imgUrl = URL.createObjectURL(blob);
            const existing = document.querySelector('img');
            if (existing) existing.remove();
            const img = document.createElement('img');
            img.src = imgUrl;
            document.body.appendChild(img);
          });
        </script>
      </body>
      </html>
      `,
      {
        headers: { "content-type": "text/html" },
      }
    );
  },
};
