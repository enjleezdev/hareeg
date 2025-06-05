"use client";

import type { ArchivedGameRound, Player } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FlameIcon } from '@/components/icons/FlameIcon';
import { TrophyIcon } from '@/components/icons/TrophyIcon';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface ArchivedRoundsDialogProps {
  archivedRounds: ArchivedGameRound[];
  allPlayers: Player[];
}

export function ArchivedRoundsDialog({ archivedRounds, allPlayers }: ArchivedRoundsDialogProps) {
  const getPlayerName = (playerId: string) => {
    return allPlayers.find(p => p.id === playerId)?.name || 'لاعب غير معروف';
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">عرض العشرات السابقة</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>العشرات السابقة</DialogTitle>
          <DialogDescription>
            هنا يمكنك مراجعة نتائج الجولات (العشرات) المنتهية.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow">
          {archivedRounds.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">لا توجد عشرات مؤرشفة بعد.</p>
          ) : (
            <div className="space-y-6 p-1">
              {archivedRounds.slice().reverse().map((round) => ( // Show newest first
                <div key={round.id} className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-2 font-headline">
                    عشرة رقم {round.roundNumber} - {format(new Date(round.startTime), "d MMMM yyyy, HH:mm", { locale: arSA })}
                    {round.heroId && <TrophyIcon className="inline-block w-5 h-5 ms-2 text-yellow-500" />}
                  </h3>
                  {round.heroId && (
                     <p className="text-green-600 font-semibold mb-2">بطل العشرة: {getPlayerName(round.heroId)}</p>
                  )}
                  <ul className="space-y-1">
                    {round.playerStates.map((ps) => (
                      <li key={ps.playerId} className="flex justify-between items-center text-sm">
                        <span className="flex items-center">
                           {getPlayerName(ps.playerId)}: {ps.totalScore}
                           {ps.isBurned && <FlameIcon className="w-4 h-4 ms-2 text-destructive" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                   <p className="text-xs text-muted-foreground mt-2">
                    انتهت في: {format(new Date(round.endTime), "d MMMM yyyy, HH:mm", { locale: arSA })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
         <Button onClick={() => (document.querySelector('[aria-label="Close"]') as HTMLElement)?.click()} className="mt-4">
            إغلاق
          </Button>
      </DialogContent>
    </Dialog>
  );
}
