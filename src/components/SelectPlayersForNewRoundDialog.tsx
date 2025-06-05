
"use client";

import type { Player } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDown, ArrowUp, PlusCircle, XCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SelectPlayersForNewRoundDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allPlayers: Player[];
  onConfirm: (orderedSelectedPlayerIds: string[]) => void;
  currentRoundPlayerIds?: string[]; 
}

export function SelectPlayersForNewRoundDialog({
  isOpen,
  onOpenChange,
  allPlayers,
  onConfirm,
  currentRoundPlayerIds = []
}: SelectPlayersForNewRoundDialogProps) {
  const [potentialPlayers, setPotentialPlayers] = useState<Player[]>([]);
  const [draftPlayers, setDraftPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (isOpen) {
      const initialDraft: Player[] = [];
      let currentPotential = [...allPlayers]; 

      if (currentRoundPlayerIds.length > 0) {
        currentRoundPlayerIds.forEach(id => {
          const playerToAdd = allPlayers.find(p => p.id === id);
          if (playerToAdd) {
            initialDraft.push(playerToAdd);
            currentPotential = currentPotential.filter(p => p.id !== playerToAdd.id);
          }
        });
      }
      
      setDraftPlayers(initialDraft);
      setPotentialPlayers(currentPotential.sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      // Reset when closed - conditional update to prevent loops
      if (draftPlayers.length > 0) {
        setDraftPlayers([]);
      }
      if (potentialPlayers.length > 0) {
        setPotentialPlayers([]);
      }
    }
  }, [isOpen, allPlayers, currentRoundPlayerIds]); // Dependencies remain focused on inputs

  const addPlayerToDraft = (player: Player) => {
    setDraftPlayers(prev => [...prev, player]);
    setPotentialPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const removePlayerFromDraft = (player: Player) => {
    setPotentialPlayers(prev => [...prev, player].sort((a,b) => a.name.localeCompare(b.name)));
    setDraftPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    setDraftPlayers(prev => {
      const newDraft = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newDraft.length) return newDraft;
      [newDraft[index], newDraft[targetIndex]] = [newDraft[targetIndex], newDraft[index]];
      return newDraft;
    });
  };

  const handleConfirm = () => {
    if (draftPlayers.length === 0) {
        alert("الرجاء اختيار لاعب واحد على الأقل.");
        return;
    }
    onConfirm(draftPlayers.map(p => p.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>اختيار وترتيب اللاعبين للعشرة الجديدة</DialogTitle>
          <DialogDescription>
            اختر اللاعبين المشاركين في العشرة الجديدة ورتبهم حسب ترتيب جلوسهم أو اللعب.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow min-h-0 py-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-center border-b pb-2">اللاعبون المتاحون</h3>
            <ScrollArea className="flex-grow border rounded-md p-2 min-h-[200px] bg-muted/30">
              {potentialPlayers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا يوجد لاعبون متاحون للإضافة.</p>}
              <div className="space-y-2">
                {potentialPlayers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-card rounded shadow-sm">
                    <span>{player.name}</span>
                    <Button variant="outline" size="sm" onClick={() => addPlayerToDraft(player)} aria-label={`إضافة ${player.name}`}>
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-center border-b pb-2">اللاعبون المشاركون (بالترتيب)</h3>
            <ScrollArea className="flex-grow border rounded-md p-2 min-h-[200px] bg-muted/30">
               {draftPlayers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لم يتم اختيار لاعبين بعد.</p>}
              <div className="space-y-2">
                {draftPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-card rounded shadow-sm gap-1">
                    <span className="font-medium">{index + 1}. {player.name}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePlayer(index, 'up')} disabled={index === 0} aria-label={`نقل ${player.name} للأعلى`}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePlayer(index, 'down')} disabled={index === draftPlayers.length - 1} aria-label={`نقل ${player.name} للأسفل`}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7" onClick={() => removePlayerFromDraft(player)} aria-label={`إزالة ${player.name}`}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={draftPlayers.length === 0}>بدء العشرة باللاعبين المحددين</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
