export interface Player {
  id: string;
  name: string;
}

// Represents a single distribution (a row in the table)
export interface Distribution {
  id: string; // Unique ID for the distribution
  name: string; // e.g., "توزيعة 1", "تعديل لـ X"
  scores: Record<string, number>; // playerId -> score for this specific distribution
}

// Represents the overall state of a player within the current round
export interface PlayerOverallState {
  playerId: string;
  name: string; // Denormalized for convenience
  totalScore: number;
  isBurned: boolean;
  isHero?: boolean;
}

export interface GameRound {
  id: string;
  roundNumber: number;
  startTime: Date;
  participatingPlayerIds: string[]; // IDs of players in this round, determines column order
  distributions: Distribution[]; // Each item is a row in the game table
  playerOverallStates: Record<string, PlayerOverallState>; // Calculated states for each player
  heroId?: string; // Player ID of the hero
  isConcluded: boolean; // True if a hero is declared or all active players burned
}

export interface ArchivedGameRound extends GameRound {
  endTime: Date;
}

// Kept for ArchivedRoundsDialog for now, might need refactoring later
export interface PlayerRoundState {
  playerId: string;
  name: string;
  scores: number[];
  totalScore: number;
  isBurned: boolean;
  isHero?: boolean;
}
