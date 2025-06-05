"use client";

import type { PlayerRoundState } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FlameIcon } from '@/components/icons/FlameIcon';
import { TrophyIcon } from '@/components/icons/TrophyIcon';
import { EditScoreDialog } from './EditScoreDialog';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  playerState: PlayerRoundState;
  onEditScore: (playerId: string, adjustment: number) => void;
  isGameConcluded: boolean;
}

export function PlayerCard({ playerState, onEditScore, isGameConcluded }: PlayerCardProps) {
  return (
    <Card className={cn("shadow-md", playerState.isBurned && "bg-destructive/10 flame-animation", playerState.isHero && "border-yellow-500 border-2")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-lg font-medium font-headline">{playerState.name}</CardTitle>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {playerState.isHero && <TrophyIcon data-ai-hint="trophy award" className="w-6 h-6 text-yellow-500" />}
          {playerState.isBurned && <FlameIcon data-ai-hint="fire flame" className="w-6 h-6 text-destructive" />}
          {!isGameConcluded && !playerState.isBurned && (
            <EditScoreDialog playerState={playerState} onEditScore={onEditScore} />
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-3xl font-bold">{playerState.totalScore}</div>
        <CardDescription className="text-xs">
          {playerState.isBurned ? "محروق!" : playerState.isHero ? "بطل العشرة!" : "في اللعب"}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
