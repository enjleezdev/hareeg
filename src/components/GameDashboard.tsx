
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Player, GameRound, ArchivedGameRound, Distribution, PlayerOverallState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArchivedRoundsDialog } from './ArchivedRoundsDialog';
import { SelectPlayersForNewRoundDialog } from './SelectPlayersForNewRoundDialog';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { AlertCircle, PlusCircle, RotateCcw, FileArchive, CheckCircle, Minus, Printer, Users } from 'lucide-react';
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

const LOCAL_STORAGE_KEYS = {
  ALL_PLAYERS: 'kooshAllPlayers_v1',
  CURRENT_ROUND: 'kooshCurrentRound_v1',
  ARCHIVED_ROUNDS: 'kooshArchivedRounds_v1',
  ROUND_COUNTER: 'kooshRoundCounter_v1',
};

export default function GameDashboard() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [archivedRounds, setArchivedRounds] = useState<ArchivedGameRound[]>([]);
  const [newDistributionScores, setNewDistributionScores] = useState<Record<string, string>>({});
  const [roundCounter, setRoundCounter] = useState(1);
  const [isSelectPlayersDialogOpen, setIsSelectPlayersDialogOpen] = useState(false);
  const [heroForNextRound, setHeroForNextRound] = useState<string | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);


  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true); // Indicate client-side rendering is complete
  }, []);

  // Load state from localStorage on initial client mount
  useEffect(() => {
    if (!isClient) return; // Only run on client

    try {
      const storedPlayers = localStorage.getItem(LOCAL_STORAGE_KEYS.ALL_PLAYERS);
      if (storedPlayers) setAllPlayers(JSON.parse(storedPlayers));

      const storedRoundCounter = localStorage.getItem(LOCAL_STORAGE_KEYS.ROUND_COUNTER);
      if (storedRoundCounter) setRoundCounter(JSON.parse(storedRoundCounter));
      
      const storedCurrentRound = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_ROUND);
      if (storedCurrentRound) {
        const parsedRound: GameRound | null = JSON.parse(storedCurrentRound);
        if (parsedRound && parsedRound.startTime) {
          parsedRound.startTime = new Date(parsedRound.startTime);
        }
        if (parsedRound && parsedRound.participatingPlayerIds) {
             const initialScores: Record<string, string> = {};
             parsedRound.participatingPlayerIds.forEach((playerId: string) => {
                 if (parsedRound.playerOverallStates && parsedRound.playerOverallStates[playerId] && !parsedRound.playerOverallStates[playerId].isBurned) {
                    initialScores[playerId] = '';
                 }
             });
             setNewDistributionScores(initialScores);
        }
        setCurrentRound(parsedRound);
      }

      // Ensure consistent use of storedArchivedRounds
      const storedArchivedRounds = localStorage.getItem(LOCAL_STORAGE_KEYS.ARCHIVED_ROUNDS);
      if (storedArchivedRounds) {
        const parsedArchived: ArchivedGameRound[] = JSON.parse(storedArchivedRounds).map((round: ArchivedGameRound) => ({
          ...round,
          startTime: new Date(round.startTime),
          endTime: new Date(round.endTime),
        }));
        setArchivedRounds(parsedArchived);
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: "لم يتمكن من تحميل بيانات اللعبة السابقة من التخزين المحلي.",
        variant: "destructive",
      });
    }
  }, [isClient, toast]);

  // Save allPlayers to localStorage
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem(LOCAL_STORAGE_KEYS.ALL_PLAYERS, JSON.stringify(allPlayers));
  }, [allPlayers, isClient]);

  // Save currentRound to localStorage
  useEffect(() => {
    if (!isClient) return;
    if (currentRound) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_ROUND, JSON.stringify(currentRound));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_ROUND);
    }
  }, [currentRound, isClient]);

  // Save archivedRounds to localStorage
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem(LOCAL_STORAGE_KEYS.ARCHIVED_ROUNDS, JSON.stringify(archivedRounds));
  }, [archivedRounds, isClient]);

  // Save roundCounter to localStorage
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem(LOCAL_STORAGE_KEYS.ROUND_COUNTER, JSON.stringify(roundCounter));
  }, [roundCounter, isClient]);


  const getPlayerName = (playerId: string): string => {
    return allPlayers.find(p => p.id === playerId)?.name || 'لاعب غير معروف';
  };
  
  const disableAddPlayerGlobal = currentRound && !currentRound.isConcluded && currentRound.participatingPlayerIds.some(pid => currentRound.playerOverallStates[pid]?.isBurned);


  const resetNewDistributionScores = useCallback((participatingPlayerIdsForReset?: string[]) => {
    const initialScores: Record<string, string> = {};
    const idsToReset = participatingPlayerIdsForReset || (currentRound?.participatingPlayerIds ?? []);
    
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
  }, [currentRound?.id, resetNewDistributionScores]); 
  
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
    

    if (currentRound && !currentRound.isConcluded) {
        const updatedParticipatingPlayerIds = [...currentRound.participatingPlayerIds, newPlayerId];
        let updatedDistributions = [...currentRound.distributions];
        let joinMessage = `تم إضافة اللاعب ${newPlayer.name} إلى قائمة اللاعبين الكلية.`;

        const hasGameplayDistributions = currentRound.distributions.some(
            dist => !dist.name.startsWith("join:") && !dist.name.startsWith("تعديل لـ")
        );

        if (hasGameplayDistributions) {
            const existingPlayerScores = currentRound.participatingPlayerIds
                .map(pid => currentRound.playerOverallStates[pid]?.totalScore || 0);
            const highestScore = Math.max(0, ...existingPlayerScores);

            const scoresForCatchUpDistribution: Record<string, number> = {};
            updatedParticipatingPlayerIds.forEach(pid => {
                scoresForCatchUpDistribution[pid] = (pid === newPlayerId) ? highestScore : 0;
            });

            const catchUpDistribution: Distribution = {
              id: crypto.randomUUID(),
              name: `join:${newPlayerId}:${newPlayer.name}`, 
              scores: scoresForCatchUpDistribution,
            };
            updatedDistributions.push(catchUpDistribution);
            joinMessage = `${newPlayer.name} انضم إلى العشرة الحالية بنقاط ${highestScore}.`;
        } else {
            // No gameplay distributions yet, player joins with 0 and no special "join" distribution entry
            // We only update the distributions to include the new player with 0 score in existing "join" or "edit" distributions
            // This primarily ensures their column appears if those are the only distributions.
            updatedDistributions = currentRound.distributions.map(dist => ({
                ...dist,
                scores: {
                    ...dist.scores,
                    [newPlayerId]: 0 
                }
             }));
            joinMessage = `${newPlayer.name} انضم إلى العشرة الحالية بصفر نقاط (لم تبدأ التوزيعات الفعلية بعد).`;
        }
        
        toast({ title: "انضم لاعب!", description: joinMessage });

        const updatedOverallStates = calculateOverallStates(updatedDistributions, updatedParticipatingPlayerIds, updatedAllPlayers);

        let heroId: string | undefined = currentRound.heroId; 
        const activePlayersCount = updatedParticipatingPlayerIds.filter(pid => updatedOverallStates[pid] && !updatedOverallStates[pid].isBurned).length;
        
        if (!heroId && activePlayersCount === 1 && updatedParticipatingPlayerIds.length > 1) {
            const currentHeroId = updatedParticipatingPlayerIds.find(pid => updatedOverallStates[pid] && !updatedOverallStates[pid].isBurned);
            if (currentHeroId && updatedOverallStates[currentHeroId]) {
                 updatedOverallStates[currentHeroId].isHero = true;
                 heroId = currentHeroId;
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
      } else {
         toast({ title: "تمت الإضافة", description: `تم إضافة اللاعب ${newPlayer.name} إلى قائمة اللاعبين الكلية.` });
      }
  };
  
  const archiveCurrentRound = useCallback(() => {
    if (currentRound) {
        const finalPlayerOverallStates = calculateOverallStates(currentRound.distributions, currentRound.participatingPlayerIds, allPlayers);
        
        let determinedHeroId = currentRound.heroId;
        let determinedIsConcluded = currentRound.isConcluded;

        if (!determinedIsConcluded) { 
            const activePlayers = currentRound.participatingPlayerIds.filter(pid => finalPlayerOverallStates[pid] && !finalPlayerOverallStates[pid].isBurned);
            if (activePlayers.length === 1 && currentRound.participatingPlayerIds.length > 1) {
                determinedHeroId = activePlayers[0];
                if (finalPlayerOverallStates[determinedHeroId!]) { 
                    finalPlayerOverallStates[determinedHeroId!].isHero = true;
                }
                determinedIsConcluded = true;
            } else if (activePlayers.length === 0 && currentRound.participatingPlayerIds.length > 0) {
                determinedIsConcluded = true; 
            }
        }
        
        if (determinedHeroId && finalPlayerOverallStates[determinedHeroId] && !finalPlayerOverallStates[determinedHeroId].isHero) {
            finalPlayerOverallStates[determinedHeroId].isHero = true;
        }

        const roundToArchive: ArchivedGameRound = {
            ...currentRound,
            distributions: [...currentRound.distributions], 
            playerOverallStates: finalPlayerOverallStates, 
            heroId: determinedHeroId,
            isConcluded: true, 
            endTime: new Date(),
         };
        
        setArchivedRounds(prev => {
            if (prev.find(r => r.id === roundToArchive.id)) {
                return prev.map(r => r.id === roundToArchive.id ? roundToArchive : r); 
            }
            return [...prev, roundToArchive];
        });
        return roundToArchive; 
    }
    return null;
  }, [currentRound, allPlayers]);

  const handleOpenPlayerSelection = () => {
    let heroIdToPass: string | undefined = undefined;

    if (currentRound) {
        if (!currentRound.isConcluded) { 
            const confirmStartNew = window.confirm("العشرة الحالية لم تنته بعد. هل أنت متأكد أنك تريد بدء عشرة جديدة وأرشفة الحالية؟");
            if (!confirmStartNew) return;
            const archived = archiveCurrentRound();
            heroIdToPass = archived?.heroId;
        } else { 
            heroIdToPass = currentRound.heroId;
            const isAlreadyArchived = archivedRounds.some(r => r.id === currentRound!.id);
            if (!isAlreadyArchived) {
                const archived = archiveCurrentRound(); 
                heroIdToPass = archived?.heroId; 
            }
        }
    }

    if (allPlayers.length === 0) {
      toast({ title: "لا يوجد لاعبين", description: "الرجاء إضافة لاعبين أولاً لبدء عشرة جديدة.", variant: "destructive" });
      return;
    }
    setHeroForNextRound(heroIdToPass); 
    setIsSelectPlayersDialogOpen(true);
  };

  const handleConfirmPlayerSelection = (selectedPlayerIds: string[]) => {
    if (selectedPlayerIds.length === 0) {
        toast({ title: "خطأ", description: "يجب اختيار لاعب واحد على الأقل.", variant: "destructive" });
        return;
    }

    const initialOverallStates = calculateOverallStates([], selectedPlayerIds, allPlayers);

    setCurrentRound({
      id: crypto.randomUUID(),
      roundNumber: roundCounter,
      startTime: new Date(),
      participatingPlayerIds: selectedPlayerIds,
      distributions: [],
      playerOverallStates: initialOverallStates,
      isConcluded: false,
      heroId: undefined,
    });
    
    resetNewDistributionScores(selectedPlayerIds); 
    toast({ title: `بدء عشرة جديدة (رقم ${roundCounter})`, description: `تم اختيار ${selectedPlayerIds.length} لاعبين.` });
    setRoundCounter(prev => prev + 1);
    setIsSelectPlayersDialogOpen(false);
    setHeroForNextRound(undefined); 
  };


  const internalAddDistribution = (scoresToAdd: Record<string, number>, distributionName?: string) => {
    if (!currentRound || currentRound.isConcluded) {
      toast({ title: "خطأ", description: "لا توجد عشرة حالية نشطة أو أن العشرة الحالية انتهت.", variant: "destructive" });
      return false;
    }
    
    const name = distributionName || `توزيعة ${currentRound.distributions.filter(d => !d.name.startsWith("join:") && !d.name.startsWith("تعديل لـ")).length + 1}`;
    
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
      if (score !== 0 || scoreStr === "-0") changesMade = true; 
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
    const playerStateBeforeAdjustment = currentRound.playerOverallStates[playerId];

    const scoresForAdjustment: Record<string, number> = {};
     currentRound.participatingPlayerIds.forEach(pid => {
        scoresForAdjustment[pid] = (pid === playerId) ? adjustment : 0;
    });

    const success = internalAddDistribution(scoresForAdjustment, `تعديل لـ ${playerName} (${adjustment > 0 ? '+' : ''}${adjustment})`);
    
    if(success) {
        toast({ title: "تم تعديل النقاط", description: `تمت إضافة توزيعة تعديل لنقاط ${playerName}.` });
        
        // Need to re-access currentRound as it's updated by internalAddDistribution via setCurrentRound
        // This requires a slight refactor or careful handling if currentRound is directly used here.
        // For simplicity, we assume the internalAddDistribution correctly updates the state,
        // and any subsequent checks for burn status would reflect the new state.
        
        // The following check is now based on the state *after* the toast for "internalAddDistribution"
        // which means currentRound.playerOverallStates should be up-to-date.
        const playerStateAfterAdjustment = currentRound.playerOverallStates[playerId];

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
    
    let currentRoundCanBeDiscarded = true;
    if (currentRound && !currentRound.isConcluded) {
      const nonJoinOrEditDistributions = currentRound.distributions.filter(
        d => !d.name.startsWith("join:") && !d.name.startsWith("تعديل لـ")
      ).length;
      if (nonJoinOrEditDistributions > 0) {
         currentRoundCanBeDiscarded = false;
      }
    }
    
    if (!currentRoundCanBeDiscarded) {
         toast({ title: "خطأ", description: "لا يمكن استرجاع العشرة السابقة بعد إدخال توزيعات أساسية في العشرة الحالية. قم بأرشفة العشرة الحالية أولاً أو تراجع عن التوزيعات.", variant: "destructive"});
         return;
    }


    const lastArchivedRoundData = archivedRounds[archivedRounds.length - 1];
    
    const restoredRound: GameRound = {
        id: lastArchivedRoundData.id,
        roundNumber: lastArchivedRoundData.roundNumber,
        startTime: new Date(lastArchivedRoundData.startTime), // Ensure Date object
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
  
  const canUndoStartNewRound = (currentRound?.distributions.filter(d => !d.name.startsWith("join:") && !d.name.startsWith("تعديل لـ")).length === 0 || currentRound?.isConcluded === true) && archivedRounds.length > 0;


  const handleMakeScoreNegative = (playerId: string) => {
    setNewDistributionScores(prevScores => {
      const currentScoreStr = prevScores[playerId] || '';
      const scoreNum = parseFloat(currentScoreStr);
  
      if (isNaN(scoreNum)) {
        return prevScores; 
      }
  
      if (scoreNum > 0) {
        return { ...prevScores, [playerId]: (-scoreNum).toString() };
      } else if (scoreNum === 0 && currentScoreStr !== "-0" ) { 
        return { ...prevScores, [playerId]: "-0"};
      } else if (currentScoreStr === "-0" && scoreNum === 0) { 
        return { ...prevScores, [playerId]: "0"};
      }
      return prevScores; 
    });
  };


  const handlePrint = () => {
    window.print();
  };

  if (!isClient) {
    // Render nothing or a loading indicator on the server or before hydration
    return (
        <div className="container mx-auto p-4 space-y-6 text-center py-20">
            <h1 className="text-4xl font-bold font-headline text-primary">دفتر الحريق – كوشتينة 🔥</h1>
            <p className="text-muted-foreground text-lg">جاري تحميل بيانات اللعبة...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="text-center py-6 no-print">
        <div className="text-center text-sm text-muted-foreground no-print mb-2">
          تم التصميم والتطوير بواسطة <a href="https://www.enjleez.tech/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">انجليز تكنولوجــــــي</a>
        </div>
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
        <Button onClick={handleOpenPlayerSelection} size="lg" className="min-w-[180px]">
           <Users className="ms-2 h-5 w-5"/> عشرة جديدة
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

      <SelectPlayersForNewRoundDialog
        isOpen={isSelectPlayersDialogOpen}
        onOpenChange={setIsSelectPlayersDialogOpen}
        onConfirm={handleConfirmPlayerSelection}
        allPlayers={allPlayers}
        heroIdFromLastRound={heroForNextRound}
      />


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

                  {currentRound.distributions.slice().reverse().map((dist) => {
                    let distNameToDisplay = dist.name;
                    let isJoinDistForSpecificPlayer = false;
                    let joiningPlayerIdInThisDist: string | undefined = undefined;

                    if (dist.name.startsWith("join:")) {
                        const parts = dist.name.split(':'); 
                        if (parts.length >= 3) {
                            joiningPlayerIdInThisDist = parts[1];
                            const joiningPlayerName = parts.slice(2).join(':'); 
                            distNameToDisplay = `انضمام: ${joiningPlayerName}`;
                            isJoinDistForSpecificPlayer = true;
                        }
                    }

                    return (
                      <TableRow key={dist.id}>
                        <TableCell className="font-medium sticky left-0 bg-card z-10 whitespace-nowrap">{distNameToDisplay}</TableCell>
                        {currentRound.participatingPlayerIds.map(playerId => {
                          const rawScore = dist.scores[playerId];
                          let cellContent: string | number = '-';

                          if (rawScore !== undefined) {
                            if (isJoinDistForSpecificPlayer && joiningPlayerIdInThisDist && playerId !== joiningPlayerIdInThisDist && rawScore === 0) {
                                cellContent = '-';
                            } else {
                                cellContent = rawScore;
                            }
                          }
                          
                          return (
                            <TableCell key={playerId} className={cn(rawScore !== undefined && rawScore < 0 && "bg-red-100/70")}>
                              {cellContent}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}

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
                            
                            {!currentRound.isConcluded && playerState && (
                               <EditScoreDialog 
                                   playerState={{ 
                                       playerId: playerId, 
                                       name: getPlayerName(playerId), 
                                       totalScore: playerState.totalScore,
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


    