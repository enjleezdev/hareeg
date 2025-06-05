"use client";

import type { PlayerRoundState } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import React, { useState } from 'react';

interface EditScoreDialogProps {
  playerState: PlayerRoundState;
  onEditScore: (playerId: string, adjustment: number) => void;
}

export function EditScoreDialog({ playerState, onEditScore }: EditScoreDialogProps) {
  const [adjustment, setAdjustment] = useState<string>("0");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAdjustment = parseInt(adjustment, 10);
    if (!isNaN(numericAdjustment)) {
      onEditScore(playerState.playerId, numericAdjustment);
      setIsOpen(false);
      setAdjustment("0");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <Pencil className="w-4 h-4" />
          <span className="sr-only">تعديل نقاط {playerState.name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>تعديل نقاط اللاعب: {playerState.name}</DialogTitle>
          <DialogDescription>
            أدخل القيمة التي تريد إضافتها أو خصمها من مجموع نقاط اللاعب الحالي ({playerState.totalScore}).
            استخدم قيمة سالبة للخصم.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adjustment" className="text-right col-span-1">
                التعديل
              </Label>
              <Input
                id="adjustment"
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                className="col-span-3"
                placeholder="مثال: 5 أو -3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
            <Button type="submit">حفظ التعديل</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
