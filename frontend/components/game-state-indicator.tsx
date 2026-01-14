import { GameState } from '@/lib/websocket-events';

interface GameStateIndicatorProps {
  gameState: GameState;
  questionNumber: number;
}

export function GameStateIndicator({ gameState, questionNumber }: GameStateIndicatorProps) {
  const stateConfig = {
    [GameState.WAITING]: {
      label: 'Waiting',
      color: 'bg-gray-500',
      borderColor: 'border-gray-200',
      bgColor: 'bg-gray-50',
      description: 'Ready for next question',
      emoji: '⏸️'
    },
    [GameState.ACTIVE]: {
      label: 'Active',
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      description: `Question ${questionNumber} - Buzzers enabled`,
      emoji: '🔔'
    },
    [GameState.SCORING]: {
      label: 'Scoring',
      color: 'bg-blue-500',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50',
      description: `Question ${questionNumber} - Assign points`,
      emoji: '📊'
    },
    [GameState.ENDED]: {
      label: 'Ended',
      color: 'bg-purple-500',
      borderColor: 'border-purple-200',
      bgColor: 'bg-purple-50',
      description: 'Game complete - View leaderboard',
      emoji: '🏆'
    }
  };

  const config = stateConfig[gameState as GameState];

  return (
    <div className={`flex flex-col items-center gap-2 p-4 sm:p-6 border-2 ${config.borderColor} rounded-lg ${config.bgColor} transition-all duration-300 shadow-sm`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label={config.label}>{config.emoji}</span>
        <div className={`w-3 h-3 rounded-full ${config.color} animate-pulse shadow-lg`} />
        <span className="font-bold text-lg sm:text-xl">{config.label}</span>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground text-center font-medium">
        {config.description}
      </p>
    </div>
  );
}
