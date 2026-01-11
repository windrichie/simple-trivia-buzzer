'use client';

import { useState } from 'react';
import { BuzzerSound } from '@/lib/websocket-events';
import { useAudio } from '@/hooks/use-audio';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';

interface BuzzerSoundSelectorProps {
  playerId: string;
  joinCode: string;
  currentSound: BuzzerSound;
  onChangeBuzzerSound: (data: {
    joinCode: string;
    playerId: string;
    buzzerSound: BuzzerSound;
  }) => Promise<{ success: boolean; error?: string }>;
}

// Display names for buzzer sounds
const SOUND_LABELS: Record<BuzzerSound, string> = {
  [BuzzerSound.CLASSIC]: '🔔 Classic',
  [BuzzerSound.HORN]: '📯 Horn',
  [BuzzerSound.BELL]: '🔔 Bell',
  [BuzzerSound.BOING]: '🎵 Boing',
  [BuzzerSound.CHIME]: '🎶 Chime',
  [BuzzerSound.WHOOSH]: '💨 Whoosh',
  [BuzzerSound.BEEP]: '📟 Beep',
  [BuzzerSound.DING]: '🛎 Ding',
  [BuzzerSound.BUZZ]: '🐝 Buzz',
  [BuzzerSound.WHISTLE]: '🎵 Whistle',
};

export function BuzzerSoundSelector({
  playerId,
  joinCode,
  currentSound,
  onChangeBuzzerSound,
}: BuzzerSoundSelectorProps) {
  const { play, isLoaded } = useAudio();
  const [isChanging, setIsChanging] = useState(false);
  // T146: Add preview animation state
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handleSoundChange = async (newSound: string) => {
    const buzzerSound = newSound as BuzzerSound;

    setIsChanging(true);

    // T146: Auto-preview the new sound when changing
    if (isLoaded) {
      play(buzzerSound);
    }

    try {
      const response = await onChangeBuzzerSound({
        joinCode,
        playerId,
        buzzerSound,
      });

      if (!response.success) {
        console.error('[BuzzerSound] Change failed:', response.error);
      }
    } catch (error) {
      console.error('[BuzzerSound] Change error:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const handlePreview = () => {
    if (isLoaded) {
      play(currentSound);
      // T146: Animate preview button
      setIsPreviewing(true);
      setTimeout(() => setIsPreviewing(false), 300);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="buzzer-sound">Buzzer Sound</Label>
      <div className="flex gap-2">
        <Select
          value={currentSound}
          onValueChange={handleSoundChange}
          disabled={isChanging}
        >
          <SelectTrigger id="buzzer-sound" className="flex-1">
            <SelectValue>
              {SOUND_LABELS[currentSound]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuzzerSound).map((sound) => (
              <SelectItem key={sound} value={sound}>
                {SOUND_LABELS[sound]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handlePreview}
          disabled={!isLoaded}
          aria-label="Preview sound"
          className={`transition-all ${isPreviewing ? 'scale-110 bg-primary text-primary-foreground' : ''}`}
        >
          <Volume2 className={`h-4 w-4 transition-transform ${isPreviewing ? 'scale-125' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
