type Env = {
  AI: any;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "POST") {
      const formData = await request.formData();

      const businessType = formData.get("businessType")?.toString() || "business";
      const sceneType = formData.get("sceneType")?.toString() || "office";
      const timeOfDay = formData.get("timeOfDay")?.toString() || "daytime";
      const visualTone = formData.get("visualTone")?.toString() || "cinematic";
      const mood = formData.get("mood")?.toString() || "empowering";
      const cameraAngle = formData.get("cameraAngle")?.toString() || "eye-level";
      const focus = formData.get("focus")?.toString() || "founder";
      const seed = parseInt(formData.get("seed")?.toString() || "42");

      const prompt = `An ${visualTone}, ${mood} image of a ${businessType} in a ${sceneType} setting at ${timeOfDay}, captured from a ${cameraAngle} perspective, focusing on the ${focus}, with modern digital elements, confident atmosphere, high clarity, professional color palette, cinematic lighting, 16:9 composition`;

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
            margin-top: 1rem;
            font-weight: bold;
          }
          select, input[type="submit"], input[type="number"] {
            padding: 0.5rem;
            width: 100%;
            margin-top: 0.25rem;
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
          progress {
            width: 100%;
            height: 12px;
            display: none;
            margin-top: 1rem;
            appearance: none;
          }
        </style>
      </head>
      <body>
        <h1>GVO Ad Image Generator</h1>
        <form id="gen-form" method="POST">
          <label>Business Type</label>
          <select name="businessType">
            <option value="tech startup">Tech Startup</option>
            <option value="law firm">Law Firm</option>
            <option value="retail brand">Retail Brand</option>
            <option value="marketing agency">Marketing Agency</option>
            <option value="finance firm">Finance Firm</option>
            <option value="nonprofit">Nonprofit</option>
          </select>

          <label>Scene Type</label>
          <select name="sceneType">
            <option value="modern office">Modern Office</option>
            <option value="boardroom">Boardroom</option>
            <option value="coworking space">Coworking Space</option>
            <option value="creative studio">Creative Studio</option>
            <option value="outdoor terrace">Outdoor Terrace</option>
          </select>

          <label>Time of Day</label>
          <select name="timeOfDay">
            <option value="sunrise">Sunrise</option>
            <option value="daytime">Daytime</option>
            <option value="sunset">Sunset</option>
            <option value="evening">Evening</option>
          </select>

          <label>Visual Tone</label>
          <select name="visualTone">
            <option value="ultra-realistic">Ultra-Realistic</option>
            <option value="cinematic">Cinematic</option>
            <option value="minimalist">Minimalist</option>
            <option value="dreamlike">Dreamlike</option>
          </select>

          <label>Mood</label>
          <select name="mood">
            <option value="empowering">Empowering</option>
            <option value="visionary">Visionary</option>
            <option value="relaxed">Relaxed</option>
            <option value="ambitious">Ambitious</option>
          </select>

          <label>Camera Angle</label>
          <select name="cameraAngle">
            <option value="eye-level">Eye-Level</option>
            <option value="wide shot">Wide Shot</option>
            <option value="over-the-shoulder">Over-the-Shoulder</option>
            <option value="low angle">Low Angle</option>
          </select>

          <label>Subject Focus</label>
          <select name="focus">
            <option value="founder">Founder</option>
            <option value="team">Team Collaboration</option>
            <option value="product">Product Display</option>
            <option value="data analytics screen">Analytics Screen</option>
          </select>

          <label>Custom Seed (optional)</label>
          <input type="number" name="seed" placeholder="42" min="1" max="9999999" />

          <input type="submit" value="Generate Ad Image" />
        </form>

        <progress id="progress-bar" value="0" max="100"></progress>

        <div class="prompt-output" id="prompt-output" style="display: none;">
          <strong>Generated Prompt:</strong>
          <p id="prompt-text"></p>
        </div>

        <a id="download-link" class="download" style="display:none;" download="gvo_ad.png">Download Image</a>
        <img id="result-image" src="" alt="Generated Ad" style="display: none;" />

        <script>
          const form = document.getElementById('gen-form');
          const progressBar = document.getElementById('progress-bar');
          let progressInterval;

          form.addEventListener('submit', async (e) => {
            e.preventDefault();

            document.getElementById('prompt-output').style.display = "none";
            document.getElementById('result-image').style.display = "none";
            document.getElementById('download-link').style.display = "none";

            progressBar.style.display = "block";
            progressBar.value = 0;
            let progress = 0;
            progressInterval = setInterval(() => {
              progress += Math.random() * 5;
              progressBar.value = Math.min(progress, 98);
            }, 300);

            const formData = new FormData(form);
            const response = await fetch('/', {
              method: 'POST',
              body: formData,
            });

            clearInterval(progressInterval);
            progressBar.value = 100;
            setTimeout(() => {
              progressBar.style.display = "none";
            }, 400);

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
