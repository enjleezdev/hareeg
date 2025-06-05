export interface Player {
  id: string;
  name: string;
}

export interface PlayerRoundState {
  playerId: string;
  name: string; // Denormalized for easy display in player cards
  scores: number[]; // Scores from each distribution in this round
  totalScore: number;
  isBurned: boolean;
  isHero?: boolean; // Optional: true if this player is the hero of the current round
}

export interface GameRound {
  id: string;
  playerStates: PlayerRoundState[];
  heroId?: string; // Player ID of the hero
  isConcluded: boolean; // True if a hero is declared or all active players burned
  startTime: Date;
  roundNumber: number;
}

export interface ArchivedGameRound extends GameRound {
  endTime: Date;
}
