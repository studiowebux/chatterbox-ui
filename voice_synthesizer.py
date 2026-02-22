import argparse
import sys
import torch

try:
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS
except ImportError as e:
    print(f"Error: Missing required package. Please install with:")
    print("pip install chatterbox-tts torch torchaudio")
    print(f"Original error: {e}")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Chatterbox TTS CLI')
    parser.add_argument('--text', required=True, help='Text to synthesize')
    parser.add_argument('--reference', required=True, help='Reference audio file path')
    parser.add_argument('--exageration', type=float, default=1.0, help='Exaggeration level (default: 1.0)')
    parser.add_argument('--cfg_weight', type=float, default=1.0, help='CFG weight (default: 1.0)')
    parser.add_argument('--output', required=True, help='Output audio file path')

    args = parser.parse_args()

    # Automatically detect the best available device
    if torch.cuda.is_available():
        device = "cuda"
    elif torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"

    print(f"Using device: {device}")

    model = ChatterboxTTS.from_pretrained(device=device)

    wav = model.generate(
        args.text,
        audio_prompt_path=args.reference,
        exaggeration=args.exageration,
        cfg_weight=args.cfg_weight
    )

    ta.save(args.output, wav, model.sr)
    print(f"Audio saved to: {args.output}")

if __name__ == "__main__":
    main()
