'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
        <div className="text-center space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            🎯 Trivia Buzzer
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Real-time buzzer app for your trivia night
          </p>
        </div>

        <div className="space-y-4">
          <Card className="transition-all hover:shadow-lg hover:scale-[1.02] border-2">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <span>🎮</span> Game Master
              </CardTitle>
              <CardDescription>
                Host a trivia game and manage questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/gamemaster">
                <Button className="w-full transition-all hover:scale-105" size="lg">
                  Create Game Session
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg hover:scale-[1.02] border-2">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <span>👤</span> Player
              </CardTitle>
              <CardDescription>
                Join a game and buzz in to answer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/player">
                <Button className="w-full transition-all hover:scale-105" variant="outline" size="lg">
                  Join Game
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <span>📱</span> Best experienced on mobile devices
          </p>
          <p className="text-xs text-muted-foreground">
            Up to 5 players per game
          </p>
        </div>
      </div>
    </main>
  );
}
