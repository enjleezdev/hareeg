
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Player, GameRound, ArchivedGameRound, Distribution, PlayerOverallState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArchivedRoundsDialog } from './ArchivedRoundsDialog';
// SelectPlayersForNewRoundDialog is no longer used
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { AlertCircle, PlusCircle, RotateCcw, FileArchive, CheckCircle, Minus, Printer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FlameIcon } from '@/components/icons/FlameIcon';
import { TrophyIcon } from '@/components/icons/TrophyIcon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditScoreDialog } from './EditScoreDialog';
import { cn } from '@/lib/utils';

const BURN_LIMIT = 31;

export default function GameDashboard() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [archivedRounds, setArchivedRounds] = useState<ArchivedGameRound[]>([]);
  const [newDistributionScores, setNewDistributionScores] = useState<Record<string, string>>({});
  const [roundCounter, setRoundCounter] = useState(1);
  // isSelectPlayersDialogOpen is no longer used

  const { toast } = useToast();

  const getPlayerName = (playerId: string): string => {
    return allPlayers.find(p => p.id === playerId)?.name || 'لاعب غير معروف';
  };
  
  const disableAddPlayerGlobal = currentRound && !currentRound.isConcluded && currentRound.participatingPlayerIds.some(pid => currentRound.playerOverallStates[pid]?.isBurned);


  const resetNewDistributionScores = useCallback((participatingPlayerIdsForReset?: string[]) => {
    const initialScores: Record<string, string> = {};
    const idsToReset = participatingPlayerIdsForReset || currentRound?.participatingPlayerIds || [];
    
    idsToReset.forEach(playerId => {
        if (!currentRound?.playerOverallStates[playerId]?.isBurned) {
          initialScores[playerId] = '';
        }
      });
    setNewDistributionScores(initialScores);
  }, [currentRound?.participatingPlayerIds, currentRound?.playerOverallStates]);


  useEffect(() => {
    if (currentRound) {
        resetNewDistributionScores(currentRound.participatingPlayerIds);
    } else {
        setNewDistributionScores({}); 
    }
  }, [currentRound?.id, currentRound?.participatingPlayerIds, resetNewDistributionScores]);
  
  const calculateOverallStates = (distributions: Distribution[], playerIds: string[], existingPlayersList: Player[]): Record<string, PlayerOverallState> => {
    const newOverallStates: Record<string, PlayerOverallState> = {};
    playerIds.forEach(playerId => {
      const playerName = existingPlayersList.find(p => p.id === playerId)?.name || 'لاعب مجهول';
      const totalScore = distributions.reduce((sum, dist) => sum + (dist.scores[playerId] || 0), 0);
      const isBurned = totalScore >= BURN_LIMIT;
      newOverallStates[playerId] = { playerId, name: playerName, totalScore, isBurned, isHero: false };
    });

    const activePlayers = playerIds.filter(pid => newOverallStates[pid] && !newOverallStates[pid].isBurned);
    if (activePlayers.length === 1 && playerIds.length > 1) {
      const heroId = activePlayers[0];
      if (newOverallStates[heroId]) {
        newOverallStates[heroId].isHero = true;
      }
    }
    return newOverallStates;
  };

  const handleAddPlayer = () => {
    if (newPlayerName.trim() === '') {
      toast({ title: "خطأ", description: "الرجاء إدخال اسم اللاعب.", variant: "destructive" });
      return;
    }
     if (disableAddPlayerGlobal) {
      toast({ title: "لا يمكن إضافة لاعب", description: "لا يمكن إضافة لاعب جديد حالياً بسبب وجود لاعب محروق في العشرة الحالية. أكمل العشرة أو ابدأ عشرة جديدة.", variant: "destructive" });
      return;
    }

    const newPlayerId = crypto.randomUUID();
    const newPlayer: Player = { id: newPlayerId, name: newPlayerName.trim() };
    const updatedAllPlayers = [...allPlayers, newPlayer];
    setAllPlayers(updatedAllPlayers);
    setNewPlayerName('');
    toast({ title: "تمت الإضافة", description: `تم إضافة اللاعب ${newPlayer.name} إلى قائمة اللاعبين الكلية.` });

    // If there's an active, non-concluded round, add the player to it with the highest current score.
    if (currentRound && !currentRound.isConcluded) {
        const existingPlayerScores = currentRound.participatingPlayerIds
            .map(pid => currentRound.playerOverallStates[pid]?.totalScore || 0);
        const highestScore = Math.max(0, ...existingPlayerScores);

        const updatedParticipatingPlayerIds = [...currentRound.participatingPlayerIds, newPlayerId];
        
        const scoresForCatchUpDistribution: Record<string, number> = {};
        updatedParticipatingPlayerIds.forEach(pid => {
            scoresForCatchUpDistribution[pid] = (pid === newPlayerId) ? highestScore : 0;
        });

        const catchUpDistribution: Distribution = {
          id: crypto.randomUUID(),
          name: `انضمام: ${newPlayer.name}`,
          scores: scoresForCatchUpDistribution,
        };

        const updatedDistributions = [...currentRound.distributions, catchUpDistribution];
        const updatedOverallStates = calculateOverallStates(updatedDistributions, updatedParticipatingPlayerIds, updatedAllPlayers);

        let heroId: string | undefined = currentRound.heroId; // Preserve existing hero
        const activePlayersCount = updatedParticipatingPlayerIds.filter(pid => updatedOverallStates[pid] && !updatedOverallStates[pid].isBurned).length;
        
        if (!heroId && activePlayersCount === 1 && updatedParticipatingPlayerIds.length > 1) {
            const currentHeroId = updatedParticipatingPlayerIds.find(pid => updatedOverallStates[pid] && !updatedOverallStates[pid].isBurned);
            if (currentHeroId && updatedOverallStates[currentHeroId]) {
                 updatedOverallStates[currentHeroId].isHero = true;
                 heroId = currentHeroId;
                 // No toast for hero here, as it's just a catch-up. The game continues.
            }
        }
        const isRoundNowConcluded = heroId !== undefined || (activePlayersCount === 0 && updatedParticipatingPlayerIds.length > 0);

        setCurrentRound(prev => ({
          ...prev!,
          participatingPlayerIds: updatedParticipatingPlayerIds,
          distributions: updatedDistributions,
          playerOverallStates: updatedOverallStates,
          heroId: heroId,
          isConcluded: prev!.isConcluded || isRoundNowConcluded,
        }));
        
        resetNewDistributionScores(updatedParticipatingPlayerIds);

        toast({ title: "انضم لاعب!", description: `${newPlayer.name} انضم إلى العشرة الحالية بنقاط ${highestScore}.` });
      }
  };
  
  const archiveCurrentRound = () => {
    if (currentRound) {
        // Recalculate final states just before archiving to ensure consistency
        const finalPlayerOverallStates = calculateOverallStates(currentRound.distributions, currentRound.participatingPlayerIds, allPlayers);
        
        // Determine hero if not already set and conditions are met
        let finalHeroId = currentRound.heroId;
        if (!finalHeroId) {
            const activePlayers = currentRound.participatingPlayerIds.filter(pid => finalPlayerOverallStates[pid] && !finalPlayerOverallStates[pid].isBurned);
            if (activePlayers.length === 1 && currentRound.participatingPlayerIds.length > 1) {
                finalHeroId = activePlayers[0];
                if (finalPlayerOverallStates[finalHeroId]) {
                    finalPlayerOverallStates[finalHeroId].isHero = true; // Ensure hero flag is set in states
                }
            }
        }

        const roundToArchive: ArchivedGameRound = {
            ...currentRound,
            endTime: new Date(),
            isConcluded: true, 
            playerOverallStates: finalPlayerOverallStates,
            heroId: finalHeroId, // Use the potentially newly determined heroId
         };
        setArchivedRounds(prev => [...prev, roundToArchive]);
    }
  }

  const handleStartNewRound = () => {
    if (currentRound && !currentRound.isConcluded) {
      const confirmStartNew = window.confirm("العشرة الحالية لم تنته بعد. هل أنت متأكد أنك تريد بدء عشرة جديدة وأرشفة الحالية؟");
      if (!confirmStartNew) return;
      archiveCurrentRound(); 
    } else if (currentRound && currentRound.isConcluded) {
       archiveCurrentRound(); 
    }

    if (allPlayers.length === 0) {
      toast({ title: "لا يوجد لاعبين", description: "الرجاء إضافة لاعبين أولاً لبدء عشرة جديدة.", variant: "destructive" });
      return;
    }
    
    const participatingPlayerIdsForNewRound = allPlayers.map(p => p.id);
    const initialOverallStates = calculateOverallStates([], participatingPlayerIdsForNewRound, allPlayers);

    setCurrentRound({
      id: crypto.randomUUID(),
      roundNumber: roundCounter,
      startTime: new Date(),
      participatingPlayerIds: participatingPlayerIdsForNewRound,
      distributions: [],
      playerOverallStates: initialOverallStates,
      isConcluded: false,
      heroId: undefined, // Ensure heroId is reset for a new round
    });
    
    resetNewDistributionScores(participatingPlayerIdsForNewRound); 
    toast({ title: `بدء عشرة جديدة (رقم ${roundCounter})`, description: "تم تجهيز لوحة النقاط بجميع اللاعبين المسجلين." });
    setRoundCounter(prev => prev + 1);
  };


  const internalAddDistribution = (scoresToAdd: Record<string, number>, distributionName?: string) => {
    if (!currentRound || currentRound.isConcluded) {
      toast({ title: "خطأ", description: "لا توجد عشرة حالية نشطة أو أن العشرة الحالية انتهت.", variant: "destructive" });
      return false;
    }
    
    const name = distributionName || `توزيعة ${currentRound.distributions.filter(d => !d.name.startsWith("انضمام:") && !d.name.startsWith("تعديل لـ")).length + 1}`;
    
    // Ensure all participating players have a score entry, defaulting to 0 if not provided
    const completeScores: Record<string, number> = {};
    currentRound.participatingPlayerIds.forEach(pid => {
      completeScores[pid] = scoresToAdd[pid] || 0;
    });

    const newDistribution: Distribution = {
      id: crypto.randomUUID(),
      name,
      scores: completeScores,
    };

    const updatedDistributions = [...currentRound.distributions, newDistribution];
    const updatedOverallStates = calculateOverallStates(updatedDistributions, currentRound.participatingPlayerIds, allPlayers);

    let heroIdFromThisDistribution: string | undefined = undefined;
    const activePlayersCount = currentRound.participatingPlayerIds.filter(pid => updatedOverallStates[pid] && !updatedOverallStates[pid].isBurned).length;
    
    if (activePlayersCount === 1 && currentRound.participatingPlayerIds.length > 1) {
        heroIdFromThisDistribution = currentRound.participatingPlayerIds.find(pid => updatedOverallStates[pid] && !updatedOverallStates[pid].isBurned);
        if (heroIdFromThisDistribution && updatedOverallStates[heroIdFromThisDistribution]) {
             updatedOverallStates[heroIdFromThisDistribution].isHero = true;
        }
        toast({ title: "بطل العشرة!", description: `اللاعب ${getPlayerName(heroIdFromThisDistribution!)} هو بطل العشرة!`, className:"bg-yellow-400 text-black" });
    }

    const isRoundConcludedByThis = heroIdFromThisDistribution !== undefined || (activePlayersCount === 0 && currentRound.participatingPlayerIds.length > 0);

    setCurrentRound(prev => prev ? { 
        ...prev, 
        distributions: updatedDistributions, 
        playerOverallStates: updatedOverallStates,
        heroId: prev.heroId || heroIdFromThisDistribution, 
        isConcluded: prev.isConcluded || isRoundConcludedByThis
    } : null);
    
    return true;
  };

  const handleAddDistribution = () => {
    if (!currentRound || currentRound.isConcluded) return;

    const parsedScores: Record<string, number> = {};
    let changesMade = false;
    let validInput = true;

    for (const playerId of currentRound.participatingPlayerIds) {
      if (currentRound.playerOverallStates[playerId]?.isBurned) {
        parsedScores[playerId] = 0; 
        continue;
      }
      const scoreStr = newDistributionScores[playerId] || "0";
      const score = parseInt(scoreStr, 10);

      if (isNaN(score)) {
        toast({ title: "خطأ في الإدخال", description: `القيمة المدخلة للاعب ${getPlayerName(playerId)} غير صحيحة.`, variant: "destructive" });
        validInput = false;
        break;
      }
      parsedScores[playerId] = score;
      if (score !== 0) changesMade = true;
    }

    if (!validInput) return;

    if (!changesMade && Object.values(newDistributionScores).every(val => val === "" || val === "0")) {
        toast({ title: "لا تغيير", description: "الرجاء إدخال نقاط للتوزيعة.", variant: "default" });
        return;
    }
    
    const success = internalAddDistribution(parsedScores);
    if (success) {
        toast({ title: "تمت إضافة التوزيعة", description: "تم تحديث النقاط." });
        resetNewDistributionScores(currentRound.participatingPlayerIds);
    }
  };
  
  const handleEditScore = (playerId: string, adjustment: number) => {
    if (!currentRound || currentRound.isConcluded) return;
    
    const playerName = getPlayerName(playerId);
    // PlayerOverallState is already calculated and available in currentRound.playerOverallStates[playerId]
    const playerStateBeforeAdjustment = currentRound.playerOverallStates[playerId];


    const scoresForAdjustment: Record<string, number> = {};
     currentRound.participatingPlayerIds.forEach(pid => {
        scoresForAdjustment[pid] = (pid === playerId) ? adjustment : 0;
    });


    const success = internalAddDistribution(scoresForAdjustment, `تعديل لـ ${playerName} (${adjustment > 0 ? '+' : ''}${adjustment})`);
    
    if(success) {
        toast({ title: "تم تعديل النقاط", description: `تمت إضافة توزيعة تعديل لنقاط ${playerName}.` });
        
        // Access the latest state directly from currentRound after internalAddDistribution updates it
        // Need to be careful if internalAddDistribution's setCurrentRound is async or batched
        // For simplicity, we assume it's synchronous enough for the next lines.
        // A more robust way might be to re-fetch from the state or pass updated states back.
        // However, calculateOverallStates is pure and re-run inside internalAddDistribution.
        // So, the `currentRound` state updated by `internalAddDistribution` will have the latest.

        // To get the state *after* adjustment for the toast, we can rely on the updated currentRound
        // This might be slightly delayed if setCurrentRound batches, but for toasts it's usually fine.
        // Let's assume currentRound is updated for the toasts below.
        
        const playerStateAfterAdjustment = currentRound?.playerOverallStates[playerId];


        if (playerStateAfterAdjustment?.isBurned && !playerStateBeforeAdjustment?.isBurned) {
             toast({ title: "حريق!", description: `اللاعب ${playerName} احترق بسبب التعديل!`, variant: "destructive" });
        } else if (playerStateAfterAdjustment && !playerStateAfterAdjustment.isBurned && playerStateBeforeAdjustment?.isBurned) {
             toast({ title: "عاد للحياة!", description: `اللاعب ${playerName} لم يعد محروقاً بعد التعديل.`});
        }
    }
  };

 const handleUndoStartNewRound = () => {
    if (archivedRounds.length === 0) {
      toast({ title: "خطأ", description: "لا توجد عشرات مؤرشفة لاسترجاعها.", variant: "destructive"});
      return;
    }
    if (currentRound && currentRound.distributions.length > 0 && !currentRound.isConcluded) {
      const nonJoinOrEditDistributions = currentRound.distributions.filter(
        d => !d.name.startsWith("انضمام:") && !d.name.startsWith("تعديل لـ")
      ).length;
      if (nonJoinOrEditDistributions > 0) {
         toast({ title: "خطأ", description: "لا يمكن استرجاع العشرة السابقة بعد إدخال توزيعات أساسية في العشرة الحالية. قم بأرشفة العشرة الحالية أولاً أو تراجع عن التوزيعات.", variant: "destructive"});
         return;
      }
    }

    const lastArchivedRoundData = archivedRounds[archivedRounds.length - 1];
    
    const restoredRound: GameRound = {
        id: lastArchivedRoundData.id,
        roundNumber: lastArchivedRoundData.roundNumber,
        startTime: new Date(lastArchivedRoundData.startTime),
        participatingPlayerIds: lastArchivedRoundData.participatingPlayerIds,
        distributions: lastArchivedRoundData.distributions, 
        playerOverallStates: lastArchivedRoundData.playerOverallStates, 
        heroId: lastArchivedRoundData.heroId,
        isConcluded: lastArchivedRoundData.isConcluded,
    };
    
    const restoredPlayerDetailsFromStates = Object.values(lastArchivedRoundData.playerOverallStates).map(pos => ({id: pos.playerId, name: pos.name}));
    
    setAllPlayers(prevAllPlayers => {
        const existingPlayerIds = new Set(prevAllPlayers.map(p => p.id));
        const playersToUpdate = [...prevAllPlayers];
        restoredPlayerDetailsFromStates.forEach(restoredPlayer => {
            if (!existingPlayerIds.has(restoredPlayer.id)) {
                playersToUpdate.push({id: restoredPlayer.id, name: restoredPlayer.name});
            } else { 
                const playerInAll = playersToUpdate.find(p => p.id === restoredPlayer.id);
                if (playerInAll && playerInAll.name !== restoredPlayer.name) {
                    playerInAll.name = restoredPlayer.name;
                }
            }
        });
        return playersToUpdate;
    });


    setCurrentRound(restoredRound);
    setArchivedRounds(prev => prev.slice(0, -1));
    setRoundCounter(restoredRound.roundNumber); 
    resetNewDistributionScores(restoredRound.participatingPlayerIds);
    toast({ title: "تم الاسترجاع", description: `تم استرجاع العشرة رقم ${restoredRound.roundNumber}.` });
  };
  
  const canUndoStartNewRound = (currentRound?.distributions.filter(d => !d.name.startsWith("انضمام:") && !d.name.startsWith("تعديل لـ")).length === 0 || currentRound?.isConcluded === true) && archivedRounds.length > 0;


  const handleMakeScoreNegative = (playerId: string) => {
    setNewDistributionScores(prevScores => {
      const currentScoreStr = prevScores[playerId] || '';
      const scoreNum = parseFloat(currentScoreStr);
  
      if (isNaN(scoreNum)) {
        return prevScores; 
      }
  
      if (scoreNum > 0) {
        return { ...prevScores, [playerId]: (-scoreNum).toString() };
      } else if (scoreNum === 0 && !Object.is(scoreNum, -0) ) { 
        return { ...prevScores, [playerId]: "-0"};
      }
      return prevScores; 
    });
  };

  // participatingPlayerIdsForDialog is no longer used
  // const participatingPlayerIdsForDialog = useMemo(() => currentRound?.participatingPlayerIds || [], [currentRound]);


  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="text-center py-6 no-print">
        <h1 className="text-4xl font-bold font-headline text-primary">دفتر الحريق – كوشتينة 🔥</h1>
        <p className="text-muted-foreground">ما تبقى كيشة وما تلعب طوف</p>
      </header>

      <Card className="shadow-lg no-print">
        <CardHeader>
          <CardTitle className="font-headline text-accent">إدارة اللاعبين</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="اسم اللاعب الجديد"
              className="flex-grow"
              disabled={disableAddPlayerGlobal}
              aria-label="اسم اللاعب الجديد"
            />
            <Button onClick={handleAddPlayer} disabled={disableAddPlayerGlobal} variant="secondary">
              <PlusCircle className="ms-2 h-4 w-4" /> إضافة لاعب للقائمة
            </Button>
          </div>
           {disableAddPlayerGlobal && (
             <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>تنبيه</AlertTitle>
                <AlertDescription>لا يمكن إضافة لاعبين جدد للقائمة أو تعديل اللاعبين الحاليين أثناء وجود لاعب محروق في العشرة الحالية. أكمل العشرة أو ابدأ عشرة جديدة أولاً.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 justify-center no-print">
        <Button onClick={handleStartNewRound} size="lg" className="min-w-[180px]">
           <PlusCircle className="ms-2 h-5 w-5"/> عشرة جديدة
        </Button>
        <ArchivedRoundsDialog archivedRounds={archivedRounds} allPlayers={allPlayers} />
        <Button onClick={handleUndoStartNewRound} disabled={!canUndoStartNewRound} variant="outline" className="min-w-[180px]">
          <RotateCcw className="ms-2 h-4 w-4"/>  استرجاع العشرة السابقة
        </Button>
         {currentRound && currentRound.isConcluded && (
          <Button onClick={handlePrint} variant="outline" size="lg" className="min-w-[180px] no-print">
            <Printer className="ms-2 h-5 w-5" /> طباعة العشرة
          </Button>
        )}
      </div>
      
      <Separator className="no-print" />

      {/* SelectPlayersForNewRoundDialog is no longer rendered */}

      {currentRound && currentRound.participatingPlayerIds.length > 0 ? (
        <div id="printable-round-content" className="space-y-6">
          <h2 className="text-2xl font-semibold text-center font-headline">
            العشرة الحالية (رقم {currentRound.roundNumber})
            {currentRound.heroId && <TrophyIcon className="inline-block w-6 h-6 ms-2 text-yellow-500" data-ai-hint="trophy award" />}
          </h2>

          {currentRound.isConcluded && currentRound.heroId && (
            <Alert variant="default" className="bg-green-100 border-green-400 text-green-700 no-print">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="font-bold">انتهت العشرة!</AlertTitle>
              <AlertDescription>
                بطل هذه العشرة هو: <span className="font-semibold">{getPlayerName(currentRound.heroId)}</span>. اضغط "عشرة جديدة" للبدء من جديد.
              </AlertDescription>
            </Alert>
          )}
          {currentRound.isConcluded && !currentRound.heroId && currentRound.participatingPlayerIds.length > 0 && currentRound.participatingPlayerIds.every(pid => currentRound.playerOverallStates[pid]?.isBurned) && (
             <Alert variant="destructive" className="no-print">
              <FlameIcon className="h-5 w-5" data-ai-hint="fire flame"/>
              <AlertTitle className="font-bold">كل اللاعبين احترقوا!</AlertTitle>
              <AlertDescription>
                لا يوجد بطل لهذه العشرة. اضغط "عشرة جديدة" للبدء من جديد.
              </AlertDescription>
            </Alert>
          )}
          
          <Card className="shadow-lg">
            <CardContent className="p-0">
             <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right sticky left-0 bg-card z-10 min-w-[120px] whitespace-nowrap">التوزيعة</TableHead>
                    {currentRound.participatingPlayerIds.map(playerId => (
                      <TableHead key={playerId} className="text-right min-w-[100px] whitespace-nowrap">{getPlayerName(playerId)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-secondary/50 font-bold">
                    <TableCell className="sticky left-0 bg-secondary/50 z-10 whitespace-nowrap">المجموع</TableCell>
                    {currentRound.participatingPlayerIds.map(playerId => {
                      const playerState = currentRound.playerOverallStates[playerId];
                      return (
                        <TableCell key={playerId} className={cn("text-lg",playerState?.isBurned && "text-destructive flame-animation")}>
                          {playerState?.totalScore ?? 0}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {currentRound.distributions.slice().reverse().map((dist) => (
                    <TableRow key={dist.id}>
                      <TableCell className="font-medium sticky left-0 bg-card z-10 whitespace-nowrap">{dist.name}</TableCell>
                      {currentRound.participatingPlayerIds.map(playerId => (
                        <TableCell key={playerId} className={cn(dist.scores[playerId] < 0 && "bg-red-100/70")}>
                          {dist.scores[playerId] ?? '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                  {!currentRound.isConcluded && (
                    <TableRow className="no-print">
                      <TableCell className="font-semibold sticky left-0 bg-card z-10 whitespace-nowrap">نقاط التوزيعة الجديدة</TableCell>
                      {currentRound.participatingPlayerIds.map(playerId => (
                        <TableCell key={playerId}>
                          {!currentRound.playerOverallStates[playerId]?.isBurned ? (
                            <div className="flex items-center gap-1 min-w-[120px]">
                              <Input
                                id={`new-score-${playerId}`}
                                type="number" 
                                value={newDistributionScores[playerId] || ''}
                                onChange={(e) => setNewDistributionScores(prev => ({ ...prev, [playerId]: e.target.value }))}
                                placeholder="0"
                                className="h-8 w-full min-w-[60px]"
                                aria-label={`نقاط ${getPlayerName(playerId)} للتوزيعة الجديدة`}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0 p-1.5"
                                onClick={() => handleMakeScoreNegative(playerId)}
                                aria-label={`تحويل نقاط ${getPlayerName(playerId)} إلى سالب`}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                  
                  <TableRow className="bg-secondary/50">
                    <TableCell className="font-semibold sticky left-0 bg-secondary/50 z-10 whitespace-nowrap">
                         الحالة
                         {!currentRound.isConcluded && <span className="ms-1 text-xs font-normal no-print">(تعديل)</span>}
                    </TableCell>
                    {currentRound.participatingPlayerIds.map(playerId => {
                      const playerState = currentRound.playerOverallStates[playerId];
                      return (
                        <TableCell key={playerId} className="relative">
                          <div className="flex items-center justify-end">
                            {playerState?.isBurned ? <span className="text-destructive font-semibold flex items-center"><FlameIcon className="w-4 h-4 me-1" data-ai-hint="fire flame"/>محروق!</span> : 
                             playerState?.isHero ? <span className="text-yellow-600 font-semibold flex items-center"><TrophyIcon className="w-4 h-4 me-1" data-ai-hint="trophy award"/>بطل العشرة!</span> : 
                             "في اللعب"}
                            
                            {!currentRound.isConcluded && (
                               <EditScoreDialog 
                                   playerState={{ 
                                       playerId: playerId, 
                                       name: getPlayerName(playerId), 
                                       totalScore: playerState?.totalScore || 0,
                                   }} 
                                   onEditScore={handleEditScore} 
                               />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          {!currentRound.isConcluded && currentRound.participatingPlayerIds.length > 0 && currentRound.participatingPlayerIds.filter(pid => currentRound.playerOverallStates[pid] && !currentRound.playerOverallStates[pid]?.isBurned).length > 0 && (
            <Button onClick={handleAddDistribution} className="w-full mt-4 no-print">إضافة النقاط للتوزيعة</Button>
          )}

           {currentRound.participatingPlayerIds.length > 0 && currentRound.participatingPlayerIds.filter(pid => currentRound.playerOverallStates[pid] && !currentRound.playerOverallStates[pid]?.isBurned).length === 0 && !currentRound.isConcluded && (
             <Alert variant="destructive" className="mt-4 no-print">
                <FlameIcon className="h-4 w-4" data-ai-hint="fire flame" />
                <AlertTitle>جميع اللاعبين النشطين احترقوا!</AlertTitle>
                <AlertDescription>الرجاء الضغط على "عشرة جديدة" لبدء جولة أخرى.</AlertDescription>
            </Alert>
           )}

        </div>
      ) : (
        <div className="text-center py-10 no-print">
          <p className="text-xl text-muted-foreground">
            {allPlayers.length === 0 ? "أضف لاعبين إلى القائمة الكلية لبدء اللعبة!" : "اضغط على 'عشرة جديدة' لاختيار اللاعبين وبدء اللعب!"}
          </p>
          {allPlayers.length > 0 &&  <FileArchive className="mx-auto mt-4 h-12 w-12 text-muted-foreground/50" />}
        </div>
      )}
    </div>
  );
}
