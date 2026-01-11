# Buzzer Sound System

## Overview

The trivia buzzer app uses a dual-approach sound system:
1. **File-based sounds** (optional): Load MP3/OGG files from `/public/sounds/`
2. **Web Audio API synthesis** (fallback): Generate sounds programmatically

## How It Works

The audio system in `frontend/lib/audio.ts` attempts to load sound files first, but if they're not available, it automatically generates synthetic buzzer sounds using the Web Audio API.

## Sound Characteristics

Each of the 10 buzzer sounds has unique characteristics:

- **CLASSIC** (440 Hz, square wave) - Traditional buzzer tone
- **HORN** (220 Hz, sawtooth) - Deep horn-like sound
- **BELL** (880 Hz, sine) - Clear bell tone
- **BOING** (200→100 Hz sweep, sine) - Bouncy cartoon sound
- **CHIME** (1320 Hz, sine) - High-pitched chime
- **WHOOSH** (800→400 Hz sweep, sawtooth) - Sweeping sound
- **BEEP** (1000 Hz, square) - Short electronic beep
- **DING** (2000 Hz, triangle) - Bright ding sound
- **BUZZ** (150 Hz, square) - Low harsh buzz
- **WHISTLE** (1500 Hz, sine) - High whistle tone

## Adding Custom Sound Files (Optional)

If you want to use custom audio files instead of synthesized sounds:

1. Create sound files in MP3 and/or OGG format
2. Name them after the buzzer sounds (e.g., `classic.mp3`, `horn.ogg`)
3. Place them in `frontend/public/sounds/`

The system will automatically prefer files over synthesis when available.

### Recommended Sound File Specs
- **Format**: MP3 (universal) or OGG (better quality)
- **Duration**: 0.15-0.6 seconds
- **Sample Rate**: 44.1 kHz
- **Bit Rate**: 128 kbps or higher
- **Channels**: Mono (stereo not necessary for buzzer sounds)

## Usage

The sound system is automatically initialized when a player joins. Sounds play instantly when the buzzer button is pressed, with no server round-trip delay for optimal user experience.
