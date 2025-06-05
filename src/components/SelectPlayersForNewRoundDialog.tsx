
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, XCircle, ArrowUp, ArrowDown, Users, ListOrdered } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SelectPlayersForNewRoundDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedPlayerIds: string[]) => void;
  allPlayers: Player[];
  heroIdFromLastRound?: string; 
}

export function SelectPlayersForNewRoundDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  allPlayers,
  heroIdFromLastRound,
}: SelectPlayersForNewRoundDialogProps) {
  const [potentialPlayers, setPotentialPlayers] = useState<Player[]>([]);
  const [draftPlayers, setDraftPlayers] = useState<Player[]>([]); 
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      let initialDraftPlayers: Player[] = [];
      let availableForSelectionSource: Player[] = [...allPlayers];

      if (heroIdFromLastRound) {
        const heroPlayer = allPlayers.find(p => p.id === heroIdFromLastRound);
        if (heroPlayer) {
          initialDraftPlayers = [heroPlayer]; 
          availableForSelectionSource = allPlayers.filter(p => p.id !== heroIdFromLastRound);
        }
      } else if (allPlayers.length > 0 && allPlayers.length <= 4) {
          // No hero, and few players overall, pre-select all (first round/no hero scenario)
          initialDraftPlayers = [...allPlayers];
          availableForSelectionSource = [];
      }
      
      setDraftPlayers(initialDraftPlayers);
      const sortedAvailablePlayers = availableForSelectionSource.sort((a,b) => 
        allPlayers.findIndex(p => p.id === a.id) - allPlayers.findIndex(p => p.id === b.id)
      );
      setPotentialPlayers(sortedAvailablePlayers);

    } else {
      // Reset when dialog is closed and lists are not already empty
      if (draftPlayers.length > 0 || potentialPlayers.length > 0) {
        setPotentialPlayers([]);
        setDraftPlayers([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, allPlayers, heroIdFromLastRound]);


  const addPlayerToDraft = (player: Player) => {
    setDraftPlayers(prev => [...prev, player]);
    setPotentialPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const removePlayerFromDraft = (player: Player) => {
    setPotentialPlayers(prev => [...prev, player].sort((a,b) => allPlayers.findIndex(p => p.id === a.id) - allPlayers.findIndex(p => p.id === b.id))); 
    setDraftPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const newDraftPlayers = [...draftPlayers];
    const playerToMove = newDraftPlayers[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    if (swapIndex >= 0 && swapIndex < newDraftPlayers.length) {
      newDraftPlayers[index] = newDraftPlayers[swapIndex];
      newDraftPlayers[swapIndex] = playerToMove;
      setDraftPlayers(newDraftPlayers);
    }
  };

  const handleConfirmSelection = () => {
    if (draftPlayers.length === 0) {
      toast({
        title: "لا يوجد لاعبون مختارون",
        description: "الرجاء اختيار لاعب واحد على الأقل لبدء العشرة.",
        variant: "destructive",
      });
      return;
    }
    onConfirm(draftPlayers.map(p => p.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            اختيار وترتيب اللاعبين للعشرة الجديدة
          </DialogTitle>
          <DialogDescription>
            {heroIdFromLastRound && allPlayers.find(p => p.id === heroIdFromLastRound) 
              ? `بطل العشرة السابقة (${allPlayers.find(p => p.id === heroIdFromLastRound)?.name}) تم اختياره تلقائيًا. أضف لاعبين آخرين ورتبهم.`
              : "اختر اللاعبين المشاركين في العشرة الجديدة وقم بترتيبهم حسب تسلسل اللعب المطلوب."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto py-4 px-1">
          {/* Available Players Section */}
          <div className="flex flex-col space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-accent">
              <ListOrdered className="w-5 h-5" />
              اللاعبون المتاحون ({potentialPlayers.length})
            </h3>
            <ScrollArea className="h-64 md:h-80 border rounded-md p-2 bg-secondary/30">
              {potentialPlayers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد لاعبون متاحون حاليًا.</p>
              ) : (
                potentialPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2 hover:bg-accent/10 rounded-md">
                    <span>{player.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => addPlayerToDraft(player)} aria-label={`إضافة ${player.name} للمشاركين`}>
                      <PlusCircle className="w-5 h-5 text-green-500" />
                    </Button>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Participating Players Section */}
          <div className="flex flex-col space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              اللاعبون المشاركون ({draftPlayers.length})
            </h3>
            <ScrollArea className="h-64 md:h-80 border rounded-md p-2 bg-card">
              {draftPlayers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لم يتم اختيار لاعبين بعد.</p>
              ) : (
                draftPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group">
                    <span className="font-medium">{index + 1}. {player.name}</span>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePlayer(index, 'up')} disabled={index === 0} aria-label={`نقل ${player.name} للأعلى`}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePlayer(index, 'down')} disabled={index === draftPlayers.length - 1} aria-label={`نقل ${player.name} للأسفل`}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePlayerFromDraft(player)} aria-label={`إزالة ${player.name} من المشاركين`}>
                        <XCircle className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>إلغاء</Button>
          <Button onClick={handleConfirmSelection}>بدء العشرة باللاعبين المختارين</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

