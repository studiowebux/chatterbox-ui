# Voice Synthesis API

2026-02-22: Moved to https://github.com/studiowebux/ollama-webui

## Setup

```bash
uv sync
```

**Start the server:**

```bash
deno run -A server.ts
```

## Usage

### API Endpoints

- `POST /synthesize` - Generate voice from text
- `GET /voices` - List available voices
- `GET /` - Web interface

### Example API Call

```bash
curl -X POST http://localhost:8001/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "voice": "my_voice",
    "exageration": 1.2,
    "cfg_weight": 1.5
  }' \
  --output voice.wav
```

### Parameters

- `text` (required): Text to synthesize
- `voice` (required): Voice name
- `exageration` (optional): Exaggeration level, default 0.5
- `cfg_weight` (optional): CFG weight, default 0.5
- `output_filename` (optional): Custom output filename
