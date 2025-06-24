type Env = {
  AI: any;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "POST") {
      const formData = await request.formData();

      const businessType = formData.get("businessType")?.toString() || "business";
      const sceneType = formData.get("sceneType")?.toString() || "modern office";
      const timeOfDay = formData.get("timeOfDay")?.toString() || "daytime";
      const visualTone = formData.get("visualTone")?.toString() || "cinematic";
      const seed = parseInt(formData.get("seed")?.toString() || "42");

      const prompt = `A ${visualTone} image of a ${businessType} in a ${sceneType} at ${timeOfDay}, with professional lighting, clear branding, digital tools on display, confident team interaction, high resolution, corporate aesthetic, 16:9 composition`;

      const inputs = {
        prompt,
        negative_prompt: "blurry, distorted, low quality, extra limbs, watermark",
        guidance_scale: 8.0,
        seed,
        num_inference_steps: 40,
      };

      const aiResponse = await env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        inputs
      );

      const headers = new Headers();
      headers.set("content-type", "image/png");
      headers.set("x-generated-prompt", prompt);

      return new Response(aiResponse, { headers });
    }

    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>GVO Ad Image Generator</title>
        <style>
          body {
            background-color: #0f172a;
            color: #f8fafc;
            font-family: system-ui, sans-serif;
            padding: 2rem;
            max-width: 800px;
            margin: auto;
          }
          h1 {
            color: #7ed957;
            font-size: 2rem;
            margin-bottom: 1rem;
          }
          label {
            display: block;
            margin: 1rem 0 0.25rem;
            font-weight: bold;
          }
          select, input[type="submit"], input[type="number"] {
            padding: 0.5rem;
            width: 100%;
            margin-bottom: 1rem;
            border-radius: 5px;
            border: none;
            font-size: 1rem;
          }
          input[type="submit"] {
            background-color: #1f497d;
            color: white;
            cursor: pointer;
          }
          img {
            margin-top: 2rem;
            max-width: 100%;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.6);
          }
          .prompt-output {
            margin-top: 2rem;
            background: #1e293b;
            padding: 1rem;
            border-radius: 5px;
            font-size: 0.9rem;
            color: #cbd5e1;
          }
          a.download {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: #7ed957;
            color: #0f172a;
            text-decoration: none;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <h1>GVO Ad Image Generator</h1>
        <form id="gen-form" method="POST">
          <label for="businessType">Business Type</label>
          <select name="businessType" required>
            <option value="tech startup">Tech Startup</option>
            <option value="law firm">Law Firm</option>
            <option value="retail brand">Retail Brand</option>
            <option value="marketing agency">Marketing Agency</option>
          </select>

          <label for="sceneType">Scene Type</label>
          <select name="sceneType" required>
            <option value="modern office">Modern Office</option>
            <option value="boardroom">Boardroom</option>
            <option value="coworking space">Coworking Space</option>
            <option value="creative studio">Creative Studio</option>
          </select>

          <label for="timeOfDay">Time of Day</label>
          <select name="timeOfDay" required>
            <option value="sunrise">Sunrise</option>
            <option value="daytime">Daytime</option>
            <option value="sunset">Sunset</option>
            <option value="evening">Evening</option>
          </select>

          <label for="visualTone">Visual Tone</label>
          <select name="visualTone" required>
            <option value="ultra-realistic">Ultra-Realistic</option>
            <option value="cinematic">Cinematic</option>
            <option value="minimalist">Minimalist</option>
            <option value="dreamlike">Dreamlike</option>
          </select>

          <label for="seed">Custom Seed (optional)</label>
          <input type="number" name="seed" placeholder="42" min="1" max="9999999" />

          <input type="submit" value="Generate Ad Image" />
        </form>

        <div class="prompt-output" id="prompt-output" style="display: none;">
          <strong>Generated Prompt:</strong>
          <p id="prompt-text"></p>
        </div>

        <a id="download-link" class="download" style="display:none;" download="gvo_ad.png">Download Image</a>

        <img id="result-image" src="" alt="Generated Ad" style="display: none;" />

        <script>
          const form = document.getElementById('gen-form');
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const response = await fetch('/', {
              method: 'POST',
              body: formData,
            });

            const prompt = response.headers.get("x-generated-prompt");
            if (prompt) {
              document.getElementById('prompt-text').textContent = prompt;
              document.getElementById('prompt-output').style.display = "block";
            }

            const blob = await response.blob();
            const imgUrl = URL.createObjectURL(blob);
            const image = document.getElementById('result-image');
            const download = document.getElementById('download-link');

            image.src = imgUrl;
            image.style.display = "block";

            download.href = imgUrl;
            download.style.display = "inline-block";
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
