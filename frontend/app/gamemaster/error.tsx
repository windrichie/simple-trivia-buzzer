'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

// T139: Error boundary for Game Master page
export default function GameMasterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[GM Error Boundary]', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An error occurred in the Game Master interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-mono">
              {error.message || 'Unknown error'}
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={reset} className="flex-1">
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              Go Home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If this problem persists, try refreshing the page or creating a new session.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
