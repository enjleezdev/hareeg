
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Player, PlayerRoundState, GameRound, ArchivedGameRound } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArchivedRoundsDialog } from './ArchivedRoundsDialog';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { AlertCircle, PlusCircle, RotateCcw, FileArchive, CheckCircle, Pencil } from 'lucide-react';
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
  const [distributionValues, setDistributionValues] = useState<Record<string, string>>({});
  const [roundCounter, setRoundCounter] = useState(1);

  const { toast } = useToast();

  const isAddPlayerDisabled = !!currentRound?.playerStates.some(p => p.isBurned) && !currentRound?.isConcluded;

  const resetDistributionInputs = useCallback(() => {
    const newDistValues: Record<string, string> = {};
    currentRound?.playerStates.forEach(p => {
      if (!p.isBurned) {
        newDistValues[p.playerId] = '';
      }
    });
    setDistributionValues(newDistValues);
  }, [currentRound]);

  useEffect(() => {
    resetDistributionInputs();
  }, [currentRound, resetDistributionInputs]);
  
  const handleAddPlayer = () => {
    if (newPlayerName.trim() === '') {
      toast({ title: "خطأ", description: "الرجاء إدخال اسم اللاعب.", variant: "destructive" });
      return;
    }
    if (isAddPlayerDisabled) {
      toast({ title: "لا يمكن إضافة لاعب", description: "لا يمكن إضافة لاعب جديد أثناء وجود لاعب محروق في العشرة الحالية. ابدأ عشرة جديدة أولاً.", variant: "destructive" });
      return;
    }
    const newPlayerId = crypto.randomUUID();
    const newPlayer: Player = { id: newPlayerId, name: newPlayerName.trim() };
    setAllPlayers(prev => [...prev, newPlayer]);

    if (currentRound && !currentRound.isConcluded) {
        setCurrentRound(prevRound => {
            if (!prevRound) return null;
            const newPlayerState: PlayerRoundState = {
                playerId: newPlayerId,
                name: newPlayer.name,
                scores: [],
                totalScore: 0,
                isBurned: false,
            };
            return {
                ...prevRound,
                playerStates: [...prevRound.playerStates, newPlayerState]
            };
        });
    }
    setNewPlayerName('');
    toast({ title: "تمت الإضافة", description: `تم إضافة اللاعب ${newPlayer.name}.` });
  };

  const startNewRound = () => {
    if (currentRound && !currentRound.isConcluded) {
      const confirmStartNew = window.confirm("العشرة الحالية لم تنته بعد. هل أنت متأكد أنك تريد بدء عشرة جديدة وأرشفة الحالية؟");
      if (!confirmStartNew) return;
      setArchivedRounds(prev => [...prev, { ...currentRound, endTime: new Date(), isConcluded: true }]);
    } else if (currentRound && currentRound.isConcluded) {
       setArchivedRounds(prev => [...prev, { ...currentRound, endTime: new Date() }]);
    }

    if (allPlayers.length === 0) {
      toast({ title: "لا يوجد لاعبين", description: "الرجاء إضافة لاعبين أولاً لبدء عشرة جديدة.", variant: "destructive" });
      return;
    }

    const newRoundPlayerStates: PlayerRoundState[] = allPlayers.map(p => ({
      playerId: p.id,
      name: p.name,
      scores: [],
      totalScore: 0,
      isBurned: false,
    }));
    setCurrentRound({
      id: crypto.randomUUID(),
      playerStates: newRoundPlayerStates,
      isConcluded: false,
      startTime: new Date(),
      roundNumber: roundCounter,
    });
    setRoundCounter(prev => prev + 1);
    resetDistributionInputs();
    toast({ title: `بدء عشرة جديدة (رقم ${roundCounter})`, description: "تم تجهيز لوحة النقاط." });
  };

  const handleAddDistribution = () => {
    if (!currentRound || currentRound.isConcluded) {
      toast({ title: "خطأ", description: "لا توجد عشرة حالية نشطة أو أن العشرة الحالية انتهت.", variant: "destructive" });
      return;
    }

    let changesMade = false;
    const updatedPlayerStates = currentRound.playerStates.map(ps => {
      if (ps.isBurned) return ps; 

      const scoreStr = distributionValues[ps.playerId] || "0";
      const score = parseInt(scoreStr, 10);

      if (isNaN(score)) {
         toast({ title: "خطأ في الإدخال", description: `القيمة المدخلة للاعب ${ps.name} غير صحيحة.`, variant: "destructive" });
        return ps; 
      }
      
      changesMade = true;
      const newScores = [...ps.scores, score];
      const newTotalScore = newScores.reduce((sum, s) => sum + s, 0);
      const isBurned = newTotalScore >= BURN_LIMIT;
      if(isBurned && !ps.isBurned) {
        toast({ title: "حريق!", description: `اللاعب ${ps.name} احترق!`, variant: "destructive" });
      }
      return { ...ps, scores: newScores, totalScore: newTotalScore, isBurned };
    });
    
    if (!changesMade && Object.values(distributionValues).every(val => val === "" || val === "0")) {
        toast({ title: "لا تغيير", description: "الرجاء إدخال نقاط للتوزيعة.", variant: "default" });
        return;
    }

    const activePlayers = updatedPlayerStates.filter(p => !p.isBurned);
    let heroId: string | undefined = undefined;
    if (activePlayers.length === 1 && updatedPlayerStates.length > 1) {
      heroId = activePlayers[0].playerId;
      updatedPlayerStates.forEach(ps => ps.isHero = ps.playerId === heroId); 
      toast({ title: "بطل العشرة!", description: `اللاعب ${activePlayers[0].name} هو بطل العشرة!`, className:"bg-yellow-400 text-black" });
    }
    
    const isRoundConcluded = heroId !== undefined || activePlayers.length === 0 && updatedPlayerStates.length > 0;

    setCurrentRound(prev => prev ? { ...prev, playerStates: updatedPlayerStates, heroId, isConcluded: isRoundConcluded } : null);
    if(changesMade) {
        toast({ title: "تمت إضافة التوزيعة", description: "تم تحديث النقاط." });
    }
    resetDistributionInputs();
  };
  
  const handleEditScore = (playerId: string, adjustment: number) => {
    if (!currentRound || currentRound.isConcluded) return;

    const updatedPlayerStates = currentRound.playerStates.map(ps => {
      if (ps.playerId === playerId) {
        const newScores = [...ps.scores, adjustment]; 
        const newTotalScore = newScores.reduce((sum, s) => sum + s, 0);
        const isBurned = newTotalScore >= BURN_LIMIT;
         if(isBurned && !ps.isBurned) {
           toast({ title: "حريق!", description: `اللاعب ${ps.name} احترق بسبب التعديل!`, variant: "destructive" });
         } else if (!isBurned && ps.isBurned) {
            toast({ title: "عاد للحياة!", description: `اللاعب ${ps.name} لم يعد محروقاً بعد التعديل.`});
         }
        return { ...ps, scores: newScores, totalScore: newTotalScore, isBurned };
      }
      return ps;
    });
    
    const activePlayers = updatedPlayerStates.filter(p => !p.isBurned);
    let heroId: string | undefined = undefined;
    if (activePlayers.length === 1 && updatedPlayerStates.length > 1) {
      heroId = activePlayers[0].playerId;
      updatedPlayerStates.forEach(ps => ps.isHero = ps.playerId === heroId);
      if (currentRound.heroId !== heroId) { 
        toast({ title: "بطل العشرة!", description: `اللاعب ${activePlayers[0].name} هو بطل العشرة بعد التعديل!`, className: "bg-yellow-400 text-black" });
      }
    } else { 
        updatedPlayerStates.forEach(ps => ps.isHero = false); 
        if (currentRound.heroId && !heroId) { 
             toast({ title: "تغيير في البطولة", description: "لم يعد هناك بطل وحيد للعشرة بعد التعديل."});
        }
    }
    
    const isRoundConcluded = heroId !== undefined || (activePlayers.length === 0 && updatedPlayerStates.length > 0);

    setCurrentRound(prev => prev ? { ...prev, playerStates: updatedPlayerStates, heroId, isConcluded: isRoundConcluded } : null);
    toast({ title: "تم تعديل النقاط", description: `تم تعديل نقاط اللاعب.` });
  };

  const handleUndoStartNewRound = () => {
    if (archivedRounds.length === 0) {
      toast({ title: "خطأ", description: "لا توجد عشرات مؤرشفة لاسترجاعها.", variant: "destructive"});
      return;
    }
    if (currentRound && currentRound.playerStates.some(ps => ps.scores.length > 0 && ps.scores.some(s => s !== 0 || s === 0 ))) {
      toast({ title: "خطأ", description: "لا يمكن استرجاع العشرة السابقة بعد إدخال توزيعات في العشرة الحالية.", variant: "destructive"});
      return;
    }

    const lastArchivedRound = archivedRounds[archivedRounds.length - 1];
    const restoredPlayerStates = lastArchivedRound.playerStates.map(archivedPs => {
        const currentPlayerInfo = allPlayers.find(p => p.id === archivedPs.playerId);
        return {
            ...archivedPs,
            name: currentPlayerInfo ? currentPlayerInfo.name : archivedPs.name, 
        };
    });

    setCurrentRound({...lastArchivedRound, playerStates: restoredPlayerStates});
    setArchivedRounds(prev => prev.slice(0, -1));
    setRoundCounter(lastArchivedRound.roundNumber); 
    toast({ title: "تم الاسترجاع", description: `تم استرجاع العشرة رقم ${lastArchivedRound.roundNumber}.` });
  };
  
  const canUndoStartNewRound = currentRound?.playerStates.every(ps => ps.scores.length === 0) && archivedRounds.length > 0;
  const showDistributionInputColumn = !currentRound?.isConcluded && currentRound?.playerStates.some(p => !p.isBurned);


  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="text-center py-6">
        <h1 className="text-4xl font-bold font-headline text-primary">دفتر الحريق – كوشتينة 🔥</h1>
        <p className="text-muted-foreground">أدر نقاط لعبتك بسهولة واعرف مين المحروق ومين البطل!</p>
      </header>

      <Card className="shadow-lg">
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
              disabled={isAddPlayerDisabled}
              aria-label="اسم اللاعب الجديد"
            />
            <Button onClick={handleAddPlayer} disabled={isAddPlayerDisabled} variant="secondary">
              <PlusCircle className="ms-2 h-4 w-4" /> إضافة لاعب
            </Button>
          </div>
          {isAddPlayerDisabled && (
             <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>تنبيه</AlertTitle>
                <AlertDescription>لا يمكن إضافة لاعبين جدد حالياً بسبب وجود لاعب محروق. ابدأ عشرة جديدة أولاً.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button onClick={startNewRound} size="lg" className="min-w-[180px]">
           <PlusCircle className="ms-2 h-5 w-5"/> عشرة جديدة
        </Button>
        <ArchivedRoundsDialog archivedRounds={archivedRounds} allPlayers={allPlayers} />
        <Button onClick={handleUndoStartNewRound} disabled={!canUndoStartNewRound} variant="outline" className="min-w-[180px]">
          <RotateCcw className="ms-2 h-4 w-4"/>  استرجاع العشرة السابقة
        </Button>
      </div>
      
      <Separator />

      {currentRound ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-center font-headline">
            العشرة الحالية (رقم {currentRound.roundNumber})
            {currentRound.heroId && <TrophyIcon className="inline-block w-6 h-6 ms-2 text-yellow-500" data-ai-hint="trophy award" />}
          </h2>

          {currentRound.isConcluded && currentRound.heroId && (
            <Alert variant="default" className="bg-green-100 border-green-400 text-green-700">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="font-bold">انتهت العشرة!</AlertTitle>
              <AlertDescription>
                بطل هذه العشرة هو: <span className="font-semibold">{allPlayers.find(p=>p.id === currentRound.heroId)?.name}</span>. اضغط "عشرة جديدة" للبدء من جديد.
              </AlertDescription>
            </Alert>
          )}
          {currentRound.isConcluded && !currentRound.heroId && currentRound.playerStates.length > 0 && currentRound.playerStates.every(p=>p.isBurned) && (
             <Alert variant="destructive">
              <FlameIcon className="h-5 w-5" />
              <AlertTitle className="font-bold">كل اللاعبين احترقوا!</AlertTitle>
              <AlertDescription>
                لا يوجد بطل لهذه العشرة. اضغط "عشرة جديدة" للبدء من جديد.
              </AlertDescription>
            </Alert>
          )}
          
          {currentRound.playerStates.length > 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اللاعب</TableHead>
                      <TableHead className="text-right">مجموع النقاط</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      {showDistributionInputColumn && <TableHead className="text-right">نقاط التوزيعة</TableHead>}
                      <TableHead className="text-right">أدوات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRound.playerStates.map(ps => (
                      <TableRow 
                        key={ps.playerId} 
                        className={cn(
                          ps.isBurned && "bg-destructive/10 flame-animation",
                          ps.isHero && "border-yellow-500 border-2 bg-yellow-100/50"
                        )}
                      >
                        <TableCell className="font-medium">{ps.name}</TableCell>
                        <TableCell className="text-lg font-bold">{ps.totalScore}</TableCell>
                        <TableCell>
                          {ps.isBurned ? <span className="text-destructive font-semibold flex items-center"><FlameIcon className="w-4 h-4 me-1" data-ai-hint="fire flame"/>محروق!</span> : 
                           ps.isHero ? <span className="text-yellow-600 font-semibold flex items-center"><TrophyIcon className="w-4 h-4 me-1" data-ai-hint="trophy award"/>بطل العشرة!</span> : 
                           "في اللعب"}
                        </TableCell>
                        {showDistributionInputColumn && (
                          <TableCell>
                            {!ps.isBurned ? (
                              <Input
                                id={`score-${ps.playerId}`}
                                type="number"
                                value={distributionValues[ps.playerId] || ''}
                                onChange={(e) => setDistributionValues(prev => ({ ...prev, [ps.playerId]: e.target.value }))}
                                placeholder="النقاط"
                                className="h-8"
                                aria-label={`نقاط ${ps.name} للتوزيعة`}
                              />
                            ) : (
                              <span>-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          {!currentRound.isConcluded && !ps.isBurned && (
                            <EditScoreDialog playerState={ps} onEditScore={handleEditScore} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-muted-foreground">لا يوجد لاعبون في هذه العشرة بعد.</p>
          )}

          {showDistributionInputColumn && currentRound.playerStates.length > 0 && (
            <Button onClick={handleAddDistribution} className="w-full mt-4">إضافة النقاط للتوزيعة</Button>
          )}

           {currentRound.playerStates.length > 0 && currentRound.playerStates.filter(ps => !ps.isBurned).length === 0 && !currentRound.isConcluded && (
             <Alert variant="destructive" className="mt-4">
                <FlameIcon className="h-4 w-4" />
                <AlertTitle>جميع اللاعبين النشطين احترقوا!</AlertTitle>
                <AlertDescription>الرجاء الضغط على "عشرة جديدة" لبدء جولة أخرى.</AlertDescription>
            </Alert>
           )}

        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">
            {allPlayers.length === 0 ? "أضف لاعبين لبدء اللعبة!" : "اضغط على 'عشرة جديدة' لبدء اللعب!"}
          </p>
          {allPlayers.length > 0 &&  <FileArchive className="mx-auto mt-4 h-12 w-12 text-muted-foreground/50" />}
        </div>
      )}
    </div>
  );
}

    