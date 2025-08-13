# Voice Synthesis API

## Setup

1. Install the chatterbox TTS package:
```bash
pip install chatterbox-tts
```

2. Make sure you have the required dependencies:
```bash
pip install torch torchaudio
```

3. Start the server:
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
