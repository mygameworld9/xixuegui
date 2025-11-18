import React from 'react';
import { GameStats, PlayerState, GameStatus } from '../types';
import { Skull, Heart, Zap, Trophy, Play, RotateCcw, Crosshair } from 'lucide-react';

interface GameUIProps {
  status: GameStatus;
  playerState: PlayerState;
  stats: GameStats;
  epitaph: string;
  flavorText: string;
  onStart: () => void;
  onRestart: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  status,
  playerState,
  stats,
  epitaph,
  flavorText,
  onStart,
  onRestart
}) => {
  if (status === 'MENU') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 backdrop-blur-sm">
        <h1 className="text-6xl font-bold text-red-600 mb-4 tracking-tighter drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
          VOID DOOM SURVIVORS
        </h1>
        <p className="text-gray-400 mb-8 text-lg">First Person Infinite Horde</p>
        <button
          onClick={onStart}
          className="group flex items-center gap-2 px-8 py-4 bg-red-700 hover:bg-red-600 text-white rounded-full font-bold text-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-red-500/50"
        >
          <Play className="w-6 h-6 fill-current" />
          ENTER THE VOID
        </button>
        <div className="mt-8 text-sm text-gray-600 flex flex-col items-center gap-2">
          <div className="flex gap-4">
            <span>WASD to Move</span>
            <span>•</span>
            <span>Mouse to Look</span>
          </div>
          <span className="text-red-500/80">Click to Capture Mouse • Auto-Fire Enabled</span>
        </div>
      </div>
    );
  }

  if (status === 'GAME_OVER') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 z-50 backdrop-blur-md animate-in fade-in duration-500">
        <h2 className="text-5xl font-bold text-white mb-2">YOU DIED</h2>
        <p className="text-red-300 italic mb-6 text-center max-w-md text-lg border-t border-b border-red-800 py-4">
          "{epitaph}"
        </p>
        
        <div className="grid grid-cols-3 gap-8 mb-8 text-center">
          <div className="flex flex-col items-center">
            <Skull className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-2xl font-bold">{stats.enemiesKilled}</span>
            <span className="text-xs uppercase tracking-widest text-gray-500">Slain</span>
          </div>
          <div className="flex flex-col items-center">
            <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
            <span className="text-2xl font-bold">{stats.levelReached}</span>
            <span className="text-xs uppercase tracking-widest text-gray-500">Level</span>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="w-8 h-8 text-blue-400 mb-2" />
            <span className="text-2xl font-bold">{Math.floor(stats.timeSurvived)}s</span>
            <span className="text-xs uppercase tracking-widest text-gray-500">Survived</span>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-full font-bold text-lg transition-all cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          TRY AGAIN
        </button>
      </div>
    );
  }

  // HUD
  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">
      
      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
        <Crosshair className="w-8 h-8 text-white" />
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          {/* Health Bar */}
          <div className="w-64 h-6 bg-gray-900 rounded-full border border-gray-700 overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
              style={{ width: `${Math.max(0, (playerState.hp / playerState.maxHp) * 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
              <Heart className="w-3 h-3 mr-1 fill-white" /> {Math.ceil(playerState.hp)} / {playerState.maxHp}
            </div>
          </div>

          {/* XP Bar */}
          <div className="w-64 h-3 bg-gray-900 rounded-full border border-gray-700 overflow-hidden relative">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (playerState.xp / playerState.nextLevelXp) * 100)}%` }}
            />
          </div>
          <div className="text-blue-300 text-xs font-bold flex items-center">
             LVL {playerState.level} 
             {flavorText && <span className="ml-2 text-white/60 italic font-normal text-[10px] animate-pulse">- {flavorText}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-4xl font-mono font-bold text-white drop-shadow-lg">
            {Math.floor(stats.timeSurvived).toString().padStart(3, '0')}
          </div>
          <div className="text-gray-400 text-xs uppercase tracking-widest">Time</div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="flex gap-6 text-white/80 text-sm font-mono">
        <div className="flex items-center gap-2">
          <Skull className="w-4 h-4" />
          {stats.enemiesKilled}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">DMG</span>
          {playerState.damage.toFixed(1)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400">SPD</span>
          {playerState.speed.toFixed(1)}
        </div>
      </div>
    </div>
  );
};
