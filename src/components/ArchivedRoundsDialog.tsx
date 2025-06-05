
"use client";

import type { ArchivedGameRound, Player, PlayerOverallState } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter, 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlameIcon } from '@/components/icons/FlameIcon';
import { TrophyIcon } from '@/components/icons/TrophyIcon';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';

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
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>العشرات السابقة</DialogTitle>
          <DialogDescription>
            هنا يمكنك مراجعة نتائج الجولات (العشرات) المنتهية.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6">
          {archivedRounds.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">لا توجد عشرات مؤرشفة بعد.</p>
          ) : (
            <div className="space-y-8 p-1">
              {archivedRounds.slice().reverse().map((round) => {
                const playerStatesArray = round.playerOverallStates ? Object.values(round.playerOverallStates) : [];
                return (
                <div key={round.id} className="p-4 border rounded-lg shadow-sm bg-card">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-semibold font-headline">
                      عشرة رقم {round.roundNumber}
                    </h3>
                    <div className="text-sm text-muted-foreground">
                       {format(new Date(round.startTime), "d MMMM yyyy, HH:mm", { locale: arSA })}
                    </div>
                  </div>
                  
                  {round.heroId && (
                     <p className="text-green-600 font-semibold mb-2 flex items-center">
                        <TrophyIcon className="w-5 h-5 ms-2 text-yellow-500" data-ai-hint="trophy award"/> 
                        بطل العشرة: {getPlayerName(round.heroId)}
                     </p>
                  )}
                  {!round.heroId && playerStatesArray.length > 0 && playerStatesArray.every(ps => ps.isBurned) && (
                    <p className="text-destructive font-semibold mb-2 flex items-center">
                        <FlameIcon className="w-5 h-5 ms-2" data-ai-hint="fire flame"/> 
                        جميع اللاعبين احترقوا
                     </p>
                  )}
                  
                  {playerStatesArray.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">اللاعب</TableHead>
                          <TableHead className="text-right">مجموع النقاط</TableHead>
                           <TableHead className="text-right w-1/4">سجل النقاط (التوزيعات)</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerStatesArray.map((ps: PlayerOverallState) => {
                          const playerDistributionScores = round.distributions
                            .map(dist => dist.scores[ps.playerId] ?? 0)
                            .join(', ');
                          return (
                            <TableRow 
                              key={ps.playerId}
                              className={cn(
                                ps.isBurned && "bg-destructive/10",
                                ps.isHero && "bg-yellow-100/30"
                              )}
                            >
                              <TableCell className="font-medium">{getPlayerName(ps.playerId)}</TableCell>
                              <TableCell className="font-semibold text-lg">{ps.totalScore}</TableCell>
                              <TableCell className="text-xs text-muted-foreground break-all">
                                {playerDistributionScores}
                              </TableCell>
                              <TableCell>
                                {ps.isBurned ? <span className="text-destructive font-semibold flex items-center"><FlameIcon className="w-4 h-4 me-1" data-ai-hint="fire flame"/>محروق</span> : 
                                 ps.isHero ? <span className="text-yellow-600 font-semibold flex items-center"><TrophyIcon className="w-4 h-4 me-1" data-ai-hint="trophy award"/>بطل</span> : 
                                 "أكمل"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                     <p className="text-sm text-muted-foreground">لا يوجد لاعبون مسجلون في هذه العشرة.</p>
                  )}
                   <p className="text-xs text-muted-foreground mt-3">
                    انتهت في: {format(new Date(round.endTime), "d MMMM yyyy, HH:mm", { locale: arSA })}
                  </p>
                </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
         <DialogFooter className="mt-4">
            <Button onClick={() => (document.querySelector('[aria-label="Close"]') as HTMLElement)?.click()} variant="outline">
                إغلاق
            </Button>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
