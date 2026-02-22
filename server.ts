import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

interface VoiceRequest {
  text: string;
  voice: string;
  exageration?: number;
  cfg_weight?: number;
  output_filename?: string;
}

async function getAvailableVoices(): Promise<string[]> {
  try {
    const voices: string[] = [];
    for await (const dirEntry of Deno.readDir("./references")) {
      if (dirEntry.isFile && dirEntry.name.endsWith(".wav")) {
        // Remove .wav extension to get voice name
        voices.push(dirEntry.name.slice(0, -4));
      }
    }
    return voices.sort();
  } catch (error) {
    console.error("Error reading references directory:", error);
    return [];
  }
}

async function synthesizeVoice(
  text: string,
  voice: string,
  exageration: number = 0.5,
  cfg_weight: number = 0.5,
  output_filename?: string,
): Promise<string> {
  const outputDir = "./output";
  await ensureDir(outputDir);

  let filename = output_filename ||
    `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`;

  // Ensure filename has .wav extension
  if (filename && !filename.toLowerCase().endsWith(".wav")) {
    filename = filename + ".wav";
  }

  const outputPath = join(outputDir, filename);
  const referencePath = join("./references", `${voice}.wav`);

  // Use voice_synthesizer.py with all required parameters
  const command = new Deno.Command("uv", {
    args: [
      "run",
      "python",
      "voice_synthesizer.py",
      "--text",
      text,
      "--exageration",
      exageration.toString(),
      "--cfg_weight",
      cfg_weight.toString(),
      "--output",
      outputPath,
      "--reference",
      referencePath,
    ],
    stdout: "piped",
    stderr: "piped",
    env: {
      ...Deno.env.toObject(), // Inherit current environment
    },
  });

  const { code, stderr, stdout } = await command.output();

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    const outputText = new TextDecoder().decode(stdout);
    console.error("Python script failed:");
    console.error("STDERR:", errorText);
    console.error("STDOUT:", outputText);
    console.error("Exit code:", code);
    throw new Error(
      `voice_synthesizer.py failed (exit code ${code}): ${
        errorText || outputText
      }`,
    );
  }

  return outputPath;
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/synthesize") {
    try {
      const body: VoiceRequest = await req.json();

      if (!body.text || !body.voice) {
        return new Response(
          JSON.stringify({ error: "text and voice parameters are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const availableVoices = await getAvailableVoices();
      if (!availableVoices.includes(body.voice)) {
        return new Response(
          JSON.stringify({
            error: "Invalid voice. Available voices: " +
              availableVoices.join(", "),
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const audioPath = await synthesizeVoice(
        body.text,
        body.voice,
        body.exageration,
        body.cfg_weight,
        body.output_filename,
      );
      const audioFile = await Deno.readFile(audioPath);

      // Clean up the file after reading
      await Deno.remove(audioPath);

      return new Response(audioFile, {
        headers: {
          "Content-Type": "audio/wav",
          "Content-Disposition":
            `attachment; filename="${body.voice}_voice.wav"`,
        },
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  if (req.method === "GET" && url.pathname === "/voices") {
    const availableVoices = await getAvailableVoices();
    return new Response(
      JSON.stringify({ voices: availableVoices }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (req.method === "GET" && url.pathname === "/") {
    const availableVoices = await getAvailableVoices();
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Chatterbox Voice Synthesis API</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-2xl">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Chatterbox Voice Synthesis API</h1>
        <p class="text-gray-600 mb-8">Generate realistic voice synthesis using AI</p>

        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold text-gray-700 mb-6">Voice Synthesis</h2>
            <form id="voiceForm" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Text to synthesize</label>
                    <textarea id="text" rows="3" required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter the text you want to convert to speech...">Hello, this is a test of the voice synthesis system.</textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Voice</label>
                    <select id="voice" required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        ${
      availableVoices.map((voice) =>
        `<option value="${voice}">${voice}</option>`
      ).join("")
    }
                    </select>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Exaggeration</label>
                        <input type="number" id="exageration" step="0.1" min="0" max="10" value="0.5"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <p class="text-xs text-gray-500 mt-1">Default: 0.5</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">CFG Weight</label>
                        <input type="number" id="cfg_weight" step="0.1" min="0" max="10" value="0.5"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <p class="text-xs text-gray-500 mt-1">Default: 0.5</p>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Output Filename (optional)</label>
                    <input type="text" id="output_filename" placeholder="custom_voice"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <p class="text-xs text-gray-500 mt-1">.wav extension will be added automatically</p>
                </div>

                <button type="submit"
                    class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium">
                    Generate Voice
                </button>
            </form>
        </div>

        <div id="result" class="mt-6"></div>
    </div>

    <script>
        document.getElementById('voiceForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const text = document.getElementById('text').value;
            const voice = document.getElementById('voice').value;
            const exageration = parseFloat(document.getElementById('exageration').value);
            const cfg_weight = parseFloat(document.getElementById('cfg_weight').value);
            const output_filename = document.getElementById('output_filename').value || undefined;

            // Show loading state
            const submitBtn = document.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Generating...';
            submitBtn.disabled = true;

            document.getElementById('result').innerHTML =
                '<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">' +
                '<div class="flex items-center space-x-2">' +
                '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>' +
                '<span class="text-blue-800 font-medium">🎵 Generating voice... This may take 30-60 seconds</span>' +
                '</div></div>';

            try {
                const response = await fetch('/synthesize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voice, exageration, cfg_weight, output_filename })
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);

                    document.getElementById('result').innerHTML =
                        '<div class="bg-green-50 border border-green-200 rounded-lg p-4">' +
                        '<div class="flex items-center space-x-2 mb-4">' +
                        '<span class="text-green-600">✅</span>' +
                        '<span class="text-green-800 font-medium">Voice generated successfully!</span>' +
                        '</div>' +
                        '<div class="space-y-3">' +
                        '<audio controls class="w-full"><source src="' + url + '" type="audio/wav"></audio>' +
                        '<a href="' + url + '" download="' + voice + '_voice.wav" ' +
                        'class="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">Download WAV</a>' +
                        '</div></div>';
                } else {
                    const error = await response.json();
                    document.getElementById('result').innerHTML =
                        '<div class="bg-red-50 border border-red-200 rounded-lg p-4">' +
                        '<div class="flex items-center space-x-2">' +
                        '<span class="text-red-600">❌</span>' +
                        '<span class="text-red-800 font-medium">Error: ' + error.error + '</span>' +
                        '</div></div>';
                }
            } catch (error) {
                document.getElementById('result').innerHTML =
                    '<div class="bg-red-50 border border-red-200 rounded-lg p-4">' +
                    '<div class="flex items-center space-x-2">' +
                    '<span class="text-red-600">❌</span>' +
                    '<span class="text-red-800 font-medium">Error: ' + error.message + '</span>' +
                    '</div></div>';
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response("Not Found", { status: 404 });
}

console.log(
  "Chatterbox voice synthesis server starting on http://localhost:8001",
);

// Load and display available voices at startup
const startupVoices = await getAvailableVoices();
console.log("Available voices:", startupVoices.join(", "));

await serve(handler, { port: 8001 });
