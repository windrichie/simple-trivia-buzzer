import { BuzzerSound } from './websocket-events';

/**
 * Audio manager for preloading and playing buzzer sounds
 * Supports both file-based sounds and Web Audio API synthesis
 */

// Map to store preloaded audio elements
const audioCache = new Map<BuzzerSound, HTMLAudioElement>();

// Audio context for synthesized sounds
let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Generate a synthetic buzzer sound using Web Audio API
 * Each buzzer sound has a unique frequency and envelope
 */
function generateSynthSound(sound: BuzzerSound, volume: number = 0.7): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Sound characteristics based on buzzer type
  const soundConfigs: Record<BuzzerSound, { freq: number; duration: number; type: OscillatorType }> = {
    [BuzzerSound.CLASSIC]: { freq: 440, duration: 0.3, type: 'square' },
    [BuzzerSound.HORN]: { freq: 220, duration: 0.5, type: 'sawtooth' },
    [BuzzerSound.BELL]: { freq: 880, duration: 0.4, type: 'sine' },
    [BuzzerSound.BOING]: { freq: 200, duration: 0.6, type: 'sine' },
    [BuzzerSound.CHIME]: { freq: 1320, duration: 0.3, type: 'sine' },
    [BuzzerSound.WHOOSH]: { freq: 800, duration: 0.2, type: 'sawtooth' },
    [BuzzerSound.BEEP]: { freq: 1000, duration: 0.15, type: 'square' },
    [BuzzerSound.DING]: { freq: 2000, duration: 0.25, type: 'triangle' },
    [BuzzerSound.BUZZ]: { freq: 150, duration: 0.4, type: 'square' },
    [BuzzerSound.WHISTLE]: { freq: 1500, duration: 0.35, type: 'sine' },
  };

  const config = soundConfigs[sound];

  // Create oscillator for tone
  const oscillator = ctx.createOscillator();
  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(config.freq, now);

  // Special frequency sweeps for certain sounds
  if (sound === BuzzerSound.BOING) {
    oscillator.frequency.exponentialRampToValueAtTime(100, now + config.duration);
  } else if (sound === BuzzerSound.WHOOSH) {
    oscillator.frequency.exponentialRampToValueAtTime(400, now + config.duration);
  }

  // Create gain node for volume envelope
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * 0.3, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Play sound
  oscillator.start(now);
  oscillator.stop(now + config.duration);
}

/**
 * Get the appropriate audio format based on browser support
 */
function getSupportedFormat(): 'mp3' | 'ogg' {
  const audio = new Audio();

  // Check OGG support first (better quality, open format)
  if (audio.canPlayType('audio/ogg; codecs="vorbis"')) {
    return 'ogg';
  }

  // Fall back to MP3 (universal support)
  return 'mp3';
}

/**
 * Get the audio file path for a buzzer sound
 */
export function getAudioPath(sound: BuzzerSound): string {
  const format = getSupportedFormat();
  return `/sounds/${sound}.${format}`;
}

/**
 * Preload a buzzer sound into the audio cache
 */
export function preloadSound(sound: BuzzerSound): Promise<void> {
  return new Promise((resolve, reject) => {
    // Return immediately if already cached
    if (audioCache.has(sound)) {
      resolve();
      return;
    }

    const audio = new Audio();
    const path = getAudioPath(sound);

    audio.addEventListener('canplaythrough', () => {
      audioCache.set(sound, audio);
      resolve();
    }, { once: true });

    audio.addEventListener('error', (e) => {
      console.error(`Failed to load sound: ${sound}`, e);
      reject(new Error(`Failed to load sound: ${sound}`));
    }, { once: true });

    audio.preload = 'auto';
    audio.src = path;
    audio.load();
  });
}

/**
 * Preload all buzzer sounds
 * Call this on app initialization for instant playback
 * If files are not available, will fall back to synthesized sounds
 */
export async function preloadAllSounds(): Promise<void> {
  const sounds = Object.values(BuzzerSound);

  try {
    await Promise.all(sounds.map(sound => preloadSound(sound)));
    console.log('[Audio] All buzzer sounds preloaded successfully');
  } catch (error) {
    console.log('[Audio] Sound files not found, using Web Audio API synthesis');
    // Don't throw - we'll use synthesized sounds as fallback
  }
}

/**
 * Play a buzzer sound
 * @param sound - The buzzer sound to play
 * @param volume - Volume level (0-1), defaults to 0.7
 * @returns Promise that resolves when sound finishes playing
 */
export async function playSound(sound: BuzzerSound, volume: number = 0.7): Promise<void> {
  try {
    // Try to play from cache first (file-based)
    let audio = audioCache.get(sound);

    if (audio) {
      // Clone the audio element to allow overlapping plays
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = Math.max(0, Math.min(1, volume));
      await audioClone.play();
    } else {
      // Fall back to synthesized sound using Web Audio API
      generateSynthSound(sound, volume);
    }
  } catch (error) {
    console.error(`Failed to play sound: ${sound}, falling back to synthesis`, error);
    // Fall back to synthesized sound if file playback fails
    try {
      generateSynthSound(sound, volume);
    } catch (synthError) {
      console.error('Synthesis also failed:', synthError);
    }
  }
}

/**
 * Stop all currently playing sounds
 */
export function stopAllSounds(): void {
  audioCache.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
}

/**
 * Clear the audio cache
 * Useful for memory management or when switching contexts
 */
export function clearAudioCache(): void {
  stopAllSounds();
  audioCache.clear();
}
