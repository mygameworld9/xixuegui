import React, { useState, useCallback, useEffect } from 'react';
import { Game3D } from './components/Game3D';
import { GameUI } from './components/GameUI';
import { GameStats, GameStatus, PlayerState } from './types';
import { generateDeathEpitaph, generateLevelUpFlavor } from './services/gemini';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>('MENU');
  
  // Lifted state for UI display only (source of truth is in Game3D refs for performance)
  const [stats, setStats] = useState<GameStats>({
    enemiesKilled: 0,
    timeSurvived: 0,
    levelReached: 1
  });
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    position: { x: 0, y: 0, z: 0 },
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    nextLevelXp: 10,
    speed: 0.15,
    damage: 25,
    fireRate: 2,
    projectileSpeed: 0.4,
    pickupRange: 3
  });

  const [epitaph, setEpitaph] = useState<string>("LOADING EPITAPH...");
  const [flavorText, setFlavorText] = useState<string>("");

  const handleStart = () => {
    setStatus('PLAYING');
    setFlavorText("");
  };

  // Accept stats as argument to avoid dependency on changing state
  const handleGameOver = useCallback(async (finalStats: GameStats) => {
    setStatus('GAME_OVER');
    setEpitaph("Consulting the void...");
    const text = await generateDeathEpitaph(finalStats);
    setEpitaph(text);
  }, []);

  const handleLevelUp = useCallback(async (newLevel: number) => {
     // Trigger a non-blocking flavor text fetch
     generateLevelUpFlavor(newLevel).then(text => setFlavorText(text));
     
     // Clear flavor text after a few seconds
     setTimeout(() => setFlavorText(""), 5000);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <Game3D 
        status={status} 
        setStats={setStats} 
        setPlayerState={setPlayerState}
        onGameOver={handleGameOver}
        onLevelUp={handleLevelUp}
      />
      
      <GameUI 
        status={status}
        playerState={playerState}
        stats={stats}
        epitaph={epitaph}
        flavorText={flavorText}
        onStart={handleStart}
        onRestart={handleStart}
      />
    </div>
  );
};

export default App;