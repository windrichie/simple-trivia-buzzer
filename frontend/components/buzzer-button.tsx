'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { BuzzerSound, GameState } from '@/lib/websocket-events';
import { useAudio } from '@/hooks/use-audio';
import { useVibration } from '@/hooks/use-vibration';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface BuzzerButtonProps {
  playerId: string;
  joinCode: string;
  buzzerSound: BuzzerSound;
  gameState: GameState;
  hasBuzzed: boolean;
  isFirst: boolean;
  onPressBuzzer: (data: { joinCode: string; playerId: string }) => Promise<{ success: boolean; error?: string }>;
  className?: string;
}

export function BuzzerButton({
  playerId,
  joinCode,
  buzzerSound,
  gameState,
  hasBuzzed,
  isFirst,
  onPressBuzzer,
  className,
}: BuzzerButtonProps) {
  const { play, isLoaded } = useAudio();
  const { vibrateMedium, vibrateSuccess } = useVibration();
  const [isPressing, setIsPressing] = useState(false);
  const [showFirstIndicator, setShowFirstIndicator] = useState(false);
  const pressedRef = useRef(false);

  // Reset pressed state when question changes (hasBuzzed becomes false)
  useEffect(() => {
    if (!hasBuzzed) {
      pressedRef.current = false;
    }
  }, [hasBuzzed]);

  // Show first indicator animation
  useEffect(() => {
    if (isFirst && hasBuzzed) {
      setShowFirstIndicator(true);
      // T135: Success vibration when player is first
      vibrateSuccess();
      const timer = setTimeout(() => {
        setShowFirstIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isFirst, hasBuzzed, vibrateSuccess]);

  const handleBuzzerPress = useCallback(async () => {
    // Prevent multiple presses
    if (pressedRef.current) {
      return;
    }

    // Check if buzzer is disabled
    if (gameState !== GameState.ACTIVE || hasBuzzed) {
      return;
    }

    pressedRef.current = true;
    setIsPressing(true);

    // T135: Haptic feedback for buzzer press
    vibrateMedium();

    // Play sound immediately for instant feedback
    if (isLoaded) {
      play(buzzerSound);
    }

    // Emit buzzer press to server
    try {
      const response = await onPressBuzzer({ joinCode, playerId });

      if (!response.success) {
        console.error('[Buzzer] Press failed:', response.error);
        // Reset if server rejected
        pressedRef.current = false;
      }
    } catch (error) {
      console.error('[Buzzer] Press error:', error);
      pressedRef.current = false;
    }

    // Visual feedback duration
    setTimeout(() => {
      setIsPressing(false);
    }, 300);
  }, [playerId, joinCode, buzzerSound, gameState, hasBuzzed, isLoaded, play, onPressBuzzer, vibrateMedium]);

  // Handle touch events (no 300ms delay on mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleBuzzerPress();
  }, [handleBuzzerPress]);

  // Determine button state and styling
  const isDisabled = gameState !== GameState.ACTIVE || hasBuzzed;
  const buttonState = hasBuzzed ? 'buzzed' : isPressing ? 'pressing' : 'ready';

  return (
    <div className={cn('relative flex flex-col items-center gap-4', className)}>
      {/* First indicator - shown when this player buzzed first */}
      {showFirstIndicator && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="text-4xl font-bold text-yellow-500 drop-shadow-lg">
            🏆 FIRST!
          </div>
        </div>
      )}

      {/* Main buzzer button */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleBuzzerPress}
        onTouchStart={handleTouchStart}
        className={cn(
          'relative w-64 h-64 rounded-full font-bold text-2xl transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-offset-4',
          'active:scale-95',
          'disabled:cursor-not-allowed disabled:opacity-50',

          // Ready state - enabled and not buzzed
          !isDisabled && buttonState === 'ready' && [
            'bg-gradient-to-b from-red-500 to-red-600',
            'hover:from-red-600 hover:to-red-700',
            'shadow-2xl shadow-red-500/50',
            'text-white',
            'focus:ring-red-400',
          ],

          // Pressing state - visual feedback
          buttonState === 'pressing' && [
            'bg-gradient-to-b from-red-700 to-red-800',
            'shadow-xl shadow-red-600/50',
            'scale-95',
            'text-white',
          ],

          // Buzzed state - already pressed
          buttonState === 'buzzed' && [
            'bg-gradient-to-b from-gray-400 to-gray-500',
            'text-gray-100',
            'cursor-not-allowed',
          ],

          // Disabled state (game not active)
          isDisabled && gameState !== GameState.ACTIVE && [
            'bg-gradient-to-b from-gray-300 to-gray-400',
            'text-gray-500',
          ]
        )}
        aria-label="Press buzzer"
        aria-disabled={isDisabled}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {hasBuzzed ? (
            <>
              <span className="text-5xl">✓</span>
              <span className="text-lg">BUZZED</span>
            </>
          ) : gameState === GameState.ACTIVE ? (
            <>
              <span className="text-5xl">🔔</span>
              <span className="text-lg">BUZZ!</span>
            </>
          ) : (
            <>
              <span className="text-5xl">⏸</span>
              <span className="text-lg">WAIT</span>
            </>
          )}
        </div>

        {/* Ripple effect on press */}
        {isPressing && (
          <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
        )}
      </button>

      {/* Status text */}
      <div className="text-center text-sm text-muted-foreground">
        {hasBuzzed ? (
          isFirst ? (
            <span className="font-bold text-yellow-600">You buzzed first!</span>
          ) : (
            <span>You buzzed</span>
          )
        ) : gameState === GameState.ACTIVE ? (
          <span>Press to buzz in</span>
        ) : (
          <span>Buzzer disabled</span>
        )}
      </div>
    </div>
  );
}
