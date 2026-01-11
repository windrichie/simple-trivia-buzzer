'use client';

import { useCallback, useEffect, useState } from 'react';

// T135: Vibration API hook for haptic feedback
export function useVibration() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if vibration API is supported
    setIsSupported('vibrate' in navigator);
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (isSupported && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.error('[Vibration] Error:', error);
      }
    }
  }, [isSupported]);

  const vibrateShort = useCallback(() => {
    vibrate(50); // Short tap (50ms)
  }, [vibrate]);

  const vibrateMedium = useCallback(() => {
    vibrate(100); // Medium tap (100ms)
  }, [vibrate]);

  const vibrateLong = useCallback(() => {
    vibrate(200); // Long press (200ms)
  }, [vibrate]);

  const vibratePattern = useCallback(() => {
    vibrate([50, 50, 50]); // Pattern: vibrate-pause-vibrate-pause-vibrate
  }, [vibrate]);

  const vibrateSuccess = useCallback(() => {
    vibrate([30, 30, 30, 30, 100]); // Success pattern
  }, [vibrate]);

  const vibrateError = useCallback(() => {
    vibrate([100, 50, 100]); // Error pattern
  }, [vibrate]);

  const cancel = useCallback(() => {
    if (isSupported && 'vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  return {
    vibrate,
    vibrateShort,
    vibrateMedium,
    vibrateLong,
    vibratePattern,
    vibrateSuccess,
    vibrateError,
    cancel,
    isSupported,
  };
}
