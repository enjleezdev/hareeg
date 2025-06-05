"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Player, PlayerRoundState, GameRound, ArchivedGameRound } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerCard } from './PlayerCard';
import { ArchivedRoundsDialog } from './ArchivedRoundsDialog';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { AlertCircle, PlusCircle, RotateCcw, FileArchive, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


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
       // Archive current round as is
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
      if (ps.isBurned) return ps; // Skip burned players

      const scoreStr = distributionValues[ps.playerId] || "0";
      const score = parseInt(scoreStr, 10);

      if (isNaN(score)) {
         toast({ title: "خطأ في الإدخال", description: `القيمة المدخلة للاعب ${ps.name} غير صحيحة.`, variant: "destructive" });
        // To prevent partial updates, we might want to return early or mark an error state.
        // For now, we'll just skip this player's score update if invalid.
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


    // Check for hero
    const activePlayers = updatedPlayerStates.filter(p => !p.isBurned);
    let heroId: string | undefined = undefined;
    if (activePlayers.length === 1 && updatedPlayerStates.length > 1) {
      heroId = activePlayers[0].playerId;
      updatedPlayerStates.forEach(ps => ps.isHero = ps.playerId === heroId); // Set hero flag
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
        const newScores = [...ps.scores, adjustment]; // Add adjustment as a new score entry
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
    
    // Re-check for hero after score edit
    const activePlayers = updatedPlayerStates.filter(p => !p.isBurned);
    let heroId: string | undefined = undefined;
    if (activePlayers.length === 1 && updatedPlayerStates.length > 1) {
      heroId = activePlayers[0].playerId;
      updatedPlayerStates.forEach(ps => ps.isHero = ps.playerId === heroId);
      if (currentRound.heroId !== heroId) { // New hero or hero changed
        toast({ title: "بطل العشرة!", description: `اللاعب ${activePlayers[0].name} هو بطل العشرة بعد التعديل!`, className: "bg-yellow-400 text-black" });
      }
    } else { // No hero or more than one active player
        updatedPlayerStates.forEach(ps => ps.isHero = false); // Clear any previous hero flag if conditions changed
        if (currentRound.heroId && !heroId) { // Hero was lost
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
    if (currentRound && currentRound.scores.some(s => s !== 0)) { // Check if any score was entered in current round
         toast({ title: "خطأ", description: "لا يمكن استرجاع العشرة السابقة بعد إدخال توزيعات في العشرة الحالية.", variant: "destructive"});
      return;
    }

    const lastArchivedRound = archivedRounds[archivedRounds.length - 1];
    // Ensure players in the last archived round still exist in allPlayers, or filter/map accordingly.
    // For simplicity, we assume player list consistency or that this is handled by how rounds are structured.
    // Critical: Ensure names are up-to-date if they can be edited globally (not implemented here).
    const restoredPlayerStates = lastArchivedRound.playerStates.map(archivedPs => {
        const currentPlayerInfo = allPlayers.find(p => p.id === archivedPs.playerId);
        return {
            ...archivedPs,
            name: currentPlayerInfo ? currentPlayerInfo.name : archivedPs.name, // Update name if changed
        };
    });


    setCurrentRound({...lastArchivedRound, playerStates: restoredPlayerStates});
    setArchivedRounds(prev => prev.slice(0, -1));
    setRoundCounter(lastArchivedRound.roundNumber); // Reset round counter to the restored round's number
    toast({ title: "تم الاسترجاع", description: `تم استرجاع العشرة رقم ${lastArchivedRound.roundNumber}.` });
  };
  
  const canUndoStartNewRound = currentRound?.playerStates.every(ps => ps.scores.length === 0) && archivedRounds.length > 0;


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
            {currentRound.heroId && <TrophyIcon className="inline-block w-6 h-6 ms-2 text-yellow-500" />}
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


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentRound.playerStates.map(ps => (
              <PlayerCard key={ps.playerId} playerState={ps} onEditScore={handleEditScore} isGameConcluded={currentRound.isConcluded} />
            ))}
          </div>

          {!currentRound.isConcluded && currentRound.playerStates.filter(ps => !ps.isBurned).length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-accent">إضافة توزيعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {currentRound.playerStates.filter(ps => !ps.isBurned).map(ps => (
                    <div key={ps.playerId} className="flex items-center gap-2">
                      <label htmlFor={`score-${ps.playerId}`} className="w-1/3 truncate">{ps.name}:</label>
                      <Input
                        id={`score-${ps.playerId}`}
                        type="number"
                        value={distributionValues[ps.playerId] || ''}
                        onChange={(e) => setDistributionValues(prev => ({ ...prev, [ps.playerId]: e.target.value }))}
                        placeholder="النقاط"
                        className="flex-grow"
                        aria-label={`نقاط ${ps.name}`}
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={handleAddDistribution} className="w-full">إضافة النقاط للتوزيعة</Button>
              </CardContent>
            </Card>
          )}
           {currentRound.playerStates.length > 0 && currentRound.playerStates.filter(ps => !ps.isBurned).length === 0 && !currentRound.isConcluded && (
             <Alert variant="destructive">
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
