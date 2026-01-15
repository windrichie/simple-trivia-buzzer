import { BuzzerSound } from './websocket-events';

/**
 * Audio manager optimized for mobile devices (especially iOS Safari)
 * Key optimizations:
 * - AudioContext resumption on every interaction
 * - Audio pool to avoid cloning
 * - Explicit audio unlock for iOS
 * - Eager preloading
 */

// Map to store preloaded audio pools (multiple instances per sound)
const audioPools = new Map<BuzzerSound, HTMLAudioElement[]>();
const POOL_SIZE = 3; // Number of audio instances per sound

// Audio context for synthesized sounds
let audioContext: AudioContext | null = null;
let audioUnlocked = false;

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
 * Resume AudioContext (required for iOS Safari)
 * MUST be called on every user interaction
 */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      console.log('[Audio] AudioContext resumed');
    } catch (error) {
      console.error('[Audio] Failed to resume AudioContext:', error);
    }
  }
}

/**
 * Unlock audio on iOS by playing a silent sound on first user interaction
 * This is required for iOS Safari to allow audio playback
 */
export async function unlockAudioOnMobile(): Promise<void> {
  if (audioUnlocked) return;

  try {
    // Resume AudioContext
    await resumeAudioContext();

    // Play a silent sound to unlock
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4S0O0m5AAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwBLkAAAAAAAAAABUgJAMGQgABzAAABITRDk2+AAAAAAD/+xBkAA/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZDoPwAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
    silentAudio.volume = 0.001;

    await silentAudio.play();
    silentAudio.pause();
    silentAudio.currentTime = 0;

    audioUnlocked = true;
    console.log('[Audio] Audio unlocked for iOS');
  } catch (error) {
    console.log('[Audio] Audio unlock not needed or failed:', error);
    // Not a critical error - some browsers don't need this
    audioUnlocked = true;
  }
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
    [BuzzerSound.PARTY_HORN]: { freq: 220, duration: 0.5, type: 'sawtooth' },
    [BuzzerSound.BURPS]: { freq: 150, duration: 0.4, type: 'square' },
    [BuzzerSound.FARTS]: { freq: 100, duration: 0.6, type: 'sawtooth' },
    [BuzzerSound.SCREAMS]: { freq: 1500, duration: 0.35, type: 'sine' },
    [BuzzerSound.SNORE]: { freq: 120, duration: 0.8, type: 'square' },
    [BuzzerSound.MOAN]: { freq: 300, duration: 0.7, type: 'sine' },
  };

  const config = soundConfigs[sound];

  // Create oscillator for tone
  const oscillator = ctx.createOscillator();
  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(config.freq, now);

  // Special frequency sweeps for certain sounds
  if (sound === BuzzerSound.FARTS || sound === BuzzerSound.BURPS) {
    oscillator.frequency.exponentialRampToValueAtTime(80, now + config.duration);
  } else if (sound === BuzzerSound.SNORE) {
    oscillator.frequency.exponentialRampToValueAtTime(90, now + config.duration);
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
 * Map buzzer sound enum to actual file names
 */
const soundFileMap: Record<BuzzerSound, string> = {
  [BuzzerSound.PARTY_HORN]: 'party_horn',
  [BuzzerSound.BURPS]: 'human_burps',
  [BuzzerSound.FARTS]: 'human_farts',
  [BuzzerSound.SCREAMS]: 'kid_screams',
  [BuzzerSound.SNORE]: 'male_snore',
  [BuzzerSound.MOAN]: 'female_moan',
};

/**
 * Get the audio file path for a buzzer sound
 */
export function getAudioPath(sound: BuzzerSound): string {
  const fileName = soundFileMap[sound];
  return `/sounds/${fileName}.mp3`;
}

/**
 * Create an audio pool for a specific sound
 * This avoids slow cloning on mobile
 */
function createAudioPool(sound: BuzzerSound): HTMLAudioElement[] {
  const pool: HTMLAudioElement[] = [];
  const path = getAudioPath(sound);

  for (let i = 0; i < POOL_SIZE; i++) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = path;
    audio.load();
    pool.push(audio);
  }

  return pool;
}

/**
 * Preload a buzzer sound into an audio pool
 * Creates multiple audio instances for overlapping plays
 */
export function preloadSound(sound: BuzzerSound): Promise<void> {
  return new Promise((resolve, reject) => {
    // Return immediately if already cached
    if (audioPools.has(sound)) {
      resolve();
      return;
    }

    const pool = createAudioPool(sound);
    let loadedCount = 0;
    let hasError = false;

    pool.forEach((audio) => {
      audio.addEventListener('canplaythrough', () => {
        loadedCount++;
        if (loadedCount === POOL_SIZE && !hasError) {
          audioPools.set(sound, pool);
          console.log(`[Audio] Sound pool ready: ${sound}`);
          resolve();
        }
      }, { once: true });

      audio.addEventListener('error', (e) => {
        if (!hasError) {
          hasError = true;
          console.error(`Failed to load sound: ${sound}`, e);
          reject(new Error(`Failed to load sound: ${sound}`));
        }
      }, { once: true });
    });

    // Timeout fallback (resolve even if not all loaded)
    setTimeout(() => {
      if (loadedCount > 0 && !hasError) {
        audioPools.set(sound, pool);
        resolve();
      }
    }, 3000);
  });
}

/**
 * Preload all buzzer sounds
 * Call this on app initialization for instant playback
 */
export async function preloadAllSounds(): Promise<void> {
  const sounds = Object.values(BuzzerSound);

  try {
    await Promise.all(sounds.map(sound => preloadSound(sound)));
    console.log('[Audio] All buzzer sound pools preloaded successfully');
  } catch (error) {
    console.log('[Audio] Some sounds failed to load, will use synthesis as fallback');
    // Don't throw - we'll use synthesized sounds as fallback
  }
}

/**
 * Get an available audio instance from the pool
 * Uses round-robin to distribute load
 */
let poolIndexes = new Map<BuzzerSound, number>();

function getAudioFromPool(sound: BuzzerSound): HTMLAudioElement | null {
  const pool = audioPools.get(sound);
  if (!pool || pool.length === 0) return null;

  // Get current index (round-robin)
  const currentIndex = poolIndexes.get(sound) || 0;
  const audio = pool[currentIndex];

  // Update index for next call
  poolIndexes.set(sound, (currentIndex + 1) % pool.length);

  return audio;
}

/**
 * Play a buzzer sound (optimized for mobile)
 * @param sound - The buzzer sound to play
 * @param volume - Volume level (0-1), defaults to 0.7
 * @returns Promise that resolves when sound starts playing
 */
export async function playSound(sound: BuzzerSound, volume: number = 0.7): Promise<void> {
  // CRITICAL: Resume AudioContext on EVERY interaction (iOS requirement)
  await resumeAudioContext();

  // Unlock audio if first interaction
  if (!audioUnlocked) {
    await unlockAudioOnMobile();
  }

  try {
    // Try to play from pool first (file-based)
    const audio = getAudioFromPool(sound);

    if (audio) {
      // Reset if already playing
      if (!audio.paused) {
        audio.currentTime = 0;
      }

      audio.volume = Math.max(0, Math.min(1, volume));

      // Play with error handling
      try {
        await audio.play();
      } catch (playError: any) {
        // If play fails due to interaction requirements, try synthesis
        if (playError.name === 'NotAllowedError') {
          console.log('[Audio] Play blocked, falling back to synthesis');
          generateSynthSound(sound, volume);
        } else {
          throw playError;
        }
      }
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
 * Eagerly load a specific sound (useful when switching sounds)
 * Ensures the sound is ready immediately when needed
 */
export async function ensureSoundLoaded(sound: BuzzerSound): Promise<void> {
  if (!audioPools.has(sound)) {
    await preloadSound(sound);
  }
}

/**
 * Stop all currently playing sounds
 */
export function stopAllSounds(): void {
  audioPools.forEach(pool => {
    pool.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  });
}

/**
 * Clear the audio cache
 * Useful for memory management or when switching contexts
 */
export function clearAudioCache(): void {
  stopAllSounds();
  audioPools.clear();
  poolIndexes.clear();
}
