export interface EVType {
  name: string;
  capacity: number; // kWh
  color: string; 
  textColor: string;
}

export interface EVInstance extends EVType {
  id: string;
  currentCharge: number; // kWh
  maxAcceptableInputRate: number; // kW, EVが受け入れ可能な最大電力
}

export enum GameState {
  Idle = 'IDLE', // Waiting to start
  Playing = 'PLAYING', // Normal gameplay
  Bonus = 'BONUS', // Bonus rapid charging active
  PenaltyCoolDown = 'PENALTY_COOLDOWN', // Charging disabled due to exceeding demand
  GameOver = 'GAME_OVER', // Game has ended
}

export interface ScoreEntry {
  name: string;
  score: number;
}
