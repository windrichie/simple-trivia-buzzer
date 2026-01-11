'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { BuzzerSound } from '@/lib/websocket-events';
import { playSound, preloadAllSounds } from '@/lib/audio';

/**
 * Hook for managing audio playback in components
 * Preloads sounds on mount and provides play function
 */
export function useAudio() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preload all sounds on mount
  useEffect(() => {
    let mounted = true;

    async function loadSounds() {
      try {
        await preloadAllSounds();
        if (mounted) {
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('[useAudio] Failed to preload sounds:', error);
        // Still mark as loaded to allow fallback audio generation
        if (mounted) {
          setIsLoaded(true);
        }
      }
    }

    loadSounds();

    return () => {
      mounted = false;
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Play a buzzer sound
   * @param sound - The buzzer sound to play
   * @param volume - Volume level (0-1)
   */
  const play = useCallback(async (sound: BuzzerSound, volume: number = 0.7) => {
    setIsPlaying(true);

    try {
      await playSound(sound, volume);
    } catch (error) {
      console.error('[useAudio] Playback error:', error);
    }

    // Clear any existing timeout
    if (playingTimeoutRef.current) {
      clearTimeout(playingTimeoutRef.current);
    }

    // Reset playing state after sound duration (max 2 seconds)
    playingTimeoutRef.current = setTimeout(() => {
      setIsPlaying(false);
    }, 2000);
  }, []);

  return {
    play,
    isLoaded,
    isPlaying,
  };
}
