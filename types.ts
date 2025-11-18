export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  position: Vector3;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  speed: number;
  damage: number;
  fireRate: number; // Shots per second
  projectileSpeed: number;
  pickupRange: number;
}

export interface Enemy {
  id: number;
  active: boolean;
  position: Vector3;
  hp: number;
  maxHp: number;
  speed: number;
  type: 'BAT' | 'SKELETON' | 'BOSS';
}

export interface Projectile {
  id: number;
  active: boolean;
  position: Vector3;
  direction: Vector3;
  timeLeft: number;
}

export interface Gem {
  id: number;
  active: boolean;
  position: Vector3;
  value: number;
}

export interface GameStats {
  enemiesKilled: number;
  timeSurvived: number;
  levelReached: number;
}

export type GameStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
