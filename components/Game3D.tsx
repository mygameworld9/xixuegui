import React, { useRef, useMemo, useEffect, Suspense, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { PointerLockControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerState, Enemy, Projectile, Gem, GameStatus, GameStats } from '../types';

// --- Constants ---
const MAX_ENEMIES = 200;
const MAX_PROJECTILES = 50;
const MAX_GEMS = 100;
const MAP_SIZE = 100; // Size of the arena
const SPAWN_DISTANCE = 25;

// --- SVG Assets ---
// Use Base64 encoding for better compatibility with TextureLoader
const svgToDataUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

const createFrames = (frame1: string, frame2: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
    <g transform="translate(0,0)">${frame1}</g>
    <g transform="translate(100,0)">${frame2}</g>
  </svg>
`;

const TEXTURES = {
  // Floor Tile (Stone)
  floor: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#1a1a1a"/>
      <rect x="2" y="2" width="46" height="46" fill="#262626" stroke="#333" stroke-width="2"/>
      <rect x="52" y="2" width="46" height="46" fill="#262626" stroke="#333" stroke-width="2"/>
      <rect x="2" y="52" width="46" height="46" fill="#262626" stroke="#333" stroke-width="2"/>
      <rect x="52" y="52" width="46" height="46" fill="#262626" stroke="#333" stroke-width="2"/>
    </svg>
  `),
  // Wall Brick
  wall: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#2d1b1b"/>
      <path d="M0 25 H100 M0 50 H100 M0 75 H100" stroke="#1a0f0f" stroke-width="4"/>
      <path d="M50 0 V25 M25 25 V50 M75 25 V50 M50 50 V75 M25 75 V100 M75 75 V100" stroke="#1a0f0f" stroke-width="4"/>
    </svg>
  `),
  bat: svgToDataUri(createFrames(
    `<path d="M50 60 C 20 60 10 20 5 30 C 10 40 20 80 50 70 C 80 80 90 40 95 30 C 90 20 80 60 50 60 Z" fill="#111" stroke="#333"/><circle cx="40" cy="65" r="3" fill="#f00"/><circle cx="60" cy="65" r="3" fill="#f00"/>`,
    `<path d="M50 50 C 20 50 10 80 5 70 C 10 60 20 55 50 65 C 80 55 90 60 95 70 C 90 80 80 50 50 50 Z" fill="#111" stroke="#333"/><circle cx="40" cy="60" r="3" fill="#f00"/><circle cx="60" cy="60" r="3" fill="#f00"/>`
  )),
  skeleton: svgToDataUri(createFrames(
    `<path d="M35 30 Q 50 10 65 30 Q 70 50 65 60 Q 50 70 35 60 Q 30 50 35 30 Z" fill="#e2e8f0"/><circle cx="42" cy="40" r="4" fill="#111"/><circle cx="58" cy="40" r="4" fill="#111"/><rect x="42" y="70" width="16" height="20" fill="#cbd5e1"/><rect x="35" y="72" width="30" height="6" rx="2" fill="#e2e8f0"/><rect x="35" y="80" width="30" height="6" rx="2" fill="#e2e8f0"/><line x1="45" y1="90" x2="45" y2="100" stroke="#e2e8f0" stroke-width="4"/><line x1="55" y1="90" x2="55" y2="100" stroke="#e2e8f0" stroke-width="4"/>`,
    `<path d="M35 31 Q 50 11 65 31 Q 70 51 65 61 Q 50 71 35 61 Q 30 51 35 31 Z" fill="#e2e8f0"/><circle cx="42" cy="41" r="4" fill="#111"/><circle cx="58" cy="41" r="4" fill="#111"/><rect x="42" y="71" width="16" height="20" fill="#cbd5e1"/><rect x="35" y="73" width="30" height="6" rx="2" fill="#e2e8f0"/><rect x="35" y="81" width="30" height="6" rx="2" fill="#e2e8f0"/><line x1="45" y1="90" x2="40" y2="98" stroke="#e2e8f0" stroke-width="4"/><line x1="55" y1="90" x2="60" y2="98" stroke="#e2e8f0" stroke-width="4"/>`
  )),
  gem: svgToDataUri(createFrames(
    `<path d="M50 10 L 80 40 L 50 90 L 20 40 Z" fill="#4ade80" stroke="#22c55e" stroke-width="2"/><path d="M50 10 L 50 90" stroke="#22c55e" stroke-width="1"/><path d="M20 40 L 80 40" stroke="#22c55e" stroke-width="1"/>`,
    `<path d="M50 10 L 80 40 L 50 90 L 20 40 Z" fill="#86efac" stroke="#4ade80" stroke-width="2"/><path d="M50 10 L 50 90" stroke="#4ade80" stroke-width="1"/><path d="M20 40 L 80 40" stroke="#4ade80" stroke-width="1"/><path d="M85 15 L 95 15 M 90 10 L 90 20" stroke="white" stroke-width="2" />`
  )),
  projectile: svgToDataUri(createFrames(
    `<circle cx="50" cy="50" r="25" fill="#facc15"/><circle cx="50" cy="50" r="15" fill="#fff"/>`,
    `<circle cx="50" cy="50" r="30" fill="#fbbf24"/><circle cx="50" cy="50" r="20" fill="#fff"/>`
  ))
};

// Stable arrays for useLoader
const SPRITE_URLS = [TEXTURES.bat, TEXTURES.skeleton, TEXTURES.gem, TEXTURES.projectile];
const MAP_URLS = [TEXTURES.floor, TEXTURES.wall];

interface GameSceneProps {
  status: GameStatus;
  setStats: React.Dispatch<React.SetStateAction<GameStats>>;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  onGameOver: (finalStats: GameStats) => void;
  onLevelUp: (newLevel: number) => void;
}

// --- Helper Functions ---
const randomPosOnCircle = (radius: number) => {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
};

// --- Dungeon Environment Component ---
interface DungeonMapProps {
  floorTex: THREE.Texture;
  wallTex: THREE.Texture;
}

const DungeonMap: React.FC<DungeonMapProps> = ({ floorTex, wallTex }) => {
  const pillars = useMemo(() => {
    const p = [];
    // Random pillars inside the map
    for(let i=0; i<20; i++) {
      p.push({
        x: (Math.random() - 0.5) * (MAP_SIZE - 10),
        z: (Math.random() - 0.5) * (MAP_SIZE - 10)
      });
    }
    return p;
  }, []);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[MAP_SIZE, MAP_SIZE]} />
        <meshStandardMaterial map={floorTex} roughness={0.8} />
      </mesh>

      {/* Ceiling (visual only) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 10, 0]}>
        <planeGeometry args={[MAP_SIZE, MAP_SIZE]} />
        <meshStandardMaterial color="#110a0a" />
      </mesh>

      {/* Boundary Walls */}
      {/* North */}
      <mesh position={[0, 2.5, -MAP_SIZE/2]}>
        <boxGeometry args={[MAP_SIZE, 5, 1]} />
        <meshStandardMaterial map={wallTex} />
      </mesh>
      {/* South */}
      <mesh position={[0, 2.5, MAP_SIZE/2]}>
        <boxGeometry args={[MAP_SIZE, 5, 1]} />
        <meshStandardMaterial map={wallTex} />
      </mesh>
      {/* East */}
      <mesh position={[MAP_SIZE/2, 2.5, 0]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[MAP_SIZE, 5, 1]} />
        <meshStandardMaterial map={wallTex} />
      </mesh>
      {/* West */}
      <mesh position={[-MAP_SIZE/2, 2.5, 0]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[MAP_SIZE, 5, 1]} />
        <meshStandardMaterial map={wallTex} />
      </mesh>

      {/* Random Pillars */}
      {pillars.map((pos, i) => (
        <mesh key={i} position={[pos.x, 2.5, pos.z]}>
          <boxGeometry args={[2, 5, 2]} />
          <meshStandardMaterial map={wallTex} color="#555" />
        </mesh>
      ))}
    </group>
  );
};

// --- Main Game Engine ---
const GameEngine: React.FC<GameSceneProps> = ({ status, setStats, setPlayerState, onGameOver, onLevelUp }) => {
  const { camera } = useThree();
  
  // Load All Textures here to avoid waterfalls
  const [batTex, skelTex, gemTex, projTex] = useLoader(THREE.TextureLoader, SPRITE_URLS);
  const [floorTex, wallTex] = useLoader(THREE.TextureLoader, MAP_URLS);

  useLayoutEffect(() => {
    // Configure Map Textures
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(MAP_SIZE / 2, MAP_SIZE / 2);
    
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(1, 2);

    // Configure Sprite Textures
    [batTex, skelTex, gemTex, projTex].forEach(tex => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(0.5, 1);
      tex.magFilter = THREE.NearestFilter; // Retro look
    });
  }, [batTex, skelTex, gemTex, projTex, floorTex, wallTex]);

  // --- Refs ---
  const lastShotTime = useRef(0);
  const startTime = useRef(Date.now());
  const keys = useRef<{ [key: string]: boolean }>({});
  const frameCount = useRef(0);
  const isGameOver = useRef(false);
  
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const gemsRef = useRef<Gem[]>([]);

  const batMeshRef = useRef<THREE.InstancedMesh>(null);
  const skelMeshRef = useRef<THREE.InstancedMesh>(null);
  const projectileMeshRef = useRef<THREE.InstancedMesh>(null);
  const gemMeshRef = useRef<THREE.InstancedMesh>(null);

  // Internal State
  const internalStats = useRef<GameStats>({ enemiesKilled: 0, timeSurvived: 0, levelReached: 1 });
  const internalPlayer = useRef<PlayerState>({
    position: { x: 0, y: 0, z: 0 }, // This tracks logical position
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    nextLevelXp: 10,
    speed: 0.2,
    damage: 25,
    fireRate: 4, // Higher fire rate for FPS feel
    projectileSpeed: 0.8,
    pickupRange: 4,
  });

  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const moveVector = useMemo(() => new THREE.Vector3(), []);
  const directionVector = useMemo(() => new THREE.Vector3(), []);

  // --- Input ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const handleKeyUp = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Init ---
  useEffect(() => {
    if (status === 'PLAYING') {
      // Reset Logic
      enemiesRef.current = Array(MAX_ENEMIES).fill(null).map((_, i) => ({
        id: i, active: false, position: { x: 0, y: 0, z: 0 }, hp: 0, maxHp: 0, speed: 0, type: 'BAT'
      }));
      projectilesRef.current = Array(MAX_PROJECTILES).fill(null).map((_, i) => ({
        id: i, active: false, position: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 0 }, timeLeft: 0
      }));
      gemsRef.current = Array(MAX_GEMS).fill(null).map((_, i) => ({
        id: i, active: false, position: { x: 0, y: 0, z: 0 }, value: 1
      }));
      
      internalPlayer.current = {
        position: { x: 0, y: 0, z: 0 },
        hp: 100, maxHp: 100, xp: 0, level: 1, nextLevelXp: 10,
        speed: 0.2, damage: 25, fireRate: 4, projectileSpeed: 0.8, pickupRange: 4,
      };
      internalStats.current = { enemiesKilled: 0, timeSurvived: 0, levelReached: 1 };
      startTime.current = Date.now();
      frameCount.current = 0;
      isGameOver.current = false;
      
      setPlayerState({...internalPlayer.current});
      setStats({...internalStats.current});

      // Reset Camera
      camera.position.set(0, 1.7, 0);
      camera.rotation.set(0, 0, 0);
    }
  }, [status, camera, setPlayerState, setStats]);

  // --- Game Loop ---
  useFrame((state, delta) => {
    if (status !== 'PLAYING') return;
    if (isGameOver.current) return;
    
    frameCount.current += 1;
    const timeNow = state.clock.getElapsedTime();
    internalStats.current.timeSurvived = (Date.now() - startTime.current) / 1000;

    // --- 1. Player Movement (FPS Style) ---
    moveVector.set(0, 0, 0);
    
    // Forward/Backward matches Camera Direction
    if (keys.current['KeyW'] || keys.current['ArrowUp']) moveVector.z -= 1;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) moveVector.z += 1;
    // Left/Right Strafe matches Camera Sideways
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) moveVector.x -= 1;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(internalPlayer.current.speed);
      
      // Convert local move vector to world based on camera rotation
      // We only care about Y-rotation (yaw) for movement on floor
      const camEuler = new THREE.Euler(0, camera.rotation.y, 0);
      moveVector.applyEuler(camEuler);

      internalPlayer.current.position.x += moveVector.x;
      internalPlayer.current.position.z += moveVector.z;
      
      // Map Boundaries
      const limit = MAP_SIZE / 2 - 1;
      internalPlayer.current.position.x = Math.max(-limit, Math.min(limit, internalPlayer.current.position.x));
      internalPlayer.current.position.z = Math.max(-limit, Math.min(limit, internalPlayer.current.position.z));
    }

    // Sync Camera Position to Player (FPS view height)
    camera.position.x = internalPlayer.current.position.x;
    camera.position.z = internalPlayer.current.position.z;
    camera.position.y = 1.7; // Eye height

    // --- 2. Animation State ---
    const batFrame = Math.floor(timeNow * 8) % 2;
    const skelFrame = Math.floor(timeNow * 4) % 2;
    const projFrame = Math.floor(timeNow * 15) % 2;
    const gemFrame = Math.floor(timeNow * 2) % 2;

    batTex.offset.x = batFrame * 0.5;
    skelTex.offset.x = skelFrame * 0.5;
    projTex.offset.x = projFrame * 0.5;
    gemTex.offset.x = gemFrame * 0.5;

    // --- 3. Spawning ---
    const activeCount = enemiesRef.current.filter(e => e.active).length;
    const targetCount = Math.min(MAX_ENEMIES, 10 + Math.floor(internalStats.current.timeSurvived / 1.5));
    
    if (activeCount < targetCount) {
      const spawnSlot = enemiesRef.current.find(e => !e.active);
      if (spawnSlot) {
        const offset = randomPosOnCircle(SPAWN_DISTANCE);
        spawnSlot.active = true;
        // Spawn relative to player
        spawnSlot.position.x = internalPlayer.current.position.x + offset.x;
        spawnSlot.position.z = internalPlayer.current.position.z + offset.z;
        
        // Keep spawn inside map
        spawnSlot.position.x = Math.max(-MAP_SIZE/2 + 1, Math.min(MAP_SIZE/2 - 1, spawnSlot.position.x));
        spawnSlot.position.z = Math.max(-MAP_SIZE/2 + 1, Math.min(MAP_SIZE/2 - 1, spawnSlot.position.z));

        spawnSlot.maxHp = 20 + internalStats.current.timeSurvived * 2;
        spawnSlot.hp = spawnSlot.maxHp;
        spawnSlot.speed = 0.05 + Math.min(0.1, internalStats.current.timeSurvived * 0.001);
        spawnSlot.type = Math.random() > 0.7 ? 'SKELETON' : 'BAT';
        if (spawnSlot.type === 'SKELETON' && Math.random() > 0.95) {
             spawnSlot.type = 'BOSS';
             spawnSlot.maxHp *= 5;
             spawnSlot.hp = spawnSlot.maxHp;
        }
      }
    }

    // --- 4. Shooting (Directional) ---
    if (timeNow - lastShotTime.current > (1 / internalPlayer.current.fireRate)) {
        const bulletSlot = projectilesRef.current.find(p => !p.active);
        if (bulletSlot) {
          bulletSlot.active = true;
          bulletSlot.timeLeft = 2; 
          // Start at camera position
          bulletSlot.position.x = camera.position.x;
          bulletSlot.position.y = camera.position.y - 0.2; // Slightly lower than eye
          bulletSlot.position.z = camera.position.z;
          
          // Direction is where camera is looking
          camera.getWorldDirection(directionVector);
          bulletSlot.direction.x = directionVector.x;
          bulletSlot.direction.y = directionVector.y; // 3D aiming
          bulletSlot.direction.z = directionVector.z;
          
          lastShotTime.current = timeNow;
        }
    }

    // --- 5. Entity Updates ---
    let batIdx = 0;
    let skelIdx = 0;
    
    for (const enemy of enemiesRef.current) {
        if (!enemy.active) continue;

        const dx = internalPlayer.current.position.x - enemy.position.x;
        const dz = internalPlayer.current.position.z - enemy.position.z;
        const distToPlayer = Math.sqrt(dx * dx + dz * dz);

        if (distToPlayer > 50) { // Despawn if too far in dungeon
          enemy.active = false;
          continue;
        }

        // Move towards player
        const vx = (dx / distToPlayer) * enemy.speed;
        const vz = (dz / distToPlayer) * enemy.speed;
        enemy.position.x += vx;
        enemy.position.z += vz;

        // Player Collision
        if (distToPlayer < 1.0) {
            internalPlayer.current.hp -= 10 * delta;
            if (internalPlayer.current.hp <= 0 && !isGameOver.current) {
                isGameOver.current = true;
                onGameOver({...internalStats.current});
                document.exitPointerLock(); // Release mouse
                return;
            }
        }

        // BILLBOARDING: Always face camera
        // We use tempObj lookAt for this
        tempObj.position.set(enemy.position.x, 1, enemy.position.z);
        tempObj.lookAt(camera.position.x, 1, camera.position.z);
        
        // Simple bobbing effect
        tempObj.position.y = 1 + Math.sin(timeNow * 5 + enemy.id) * 0.1;

        const baseScale = enemy.type === 'BOSS' ? 4 : 2;
        if (enemy.type === 'BOSS') {
            tempObj.position.y = 2;
            tempObj.scale.set(baseScale, 4, 1);
        } else {
            tempObj.scale.set(baseScale, 2, 1);
        }
        
        tempObj.updateMatrix();

        if (enemy.type === 'BAT') {
            if (batMeshRef.current) {
                batMeshRef.current.setMatrixAt(batIdx++, tempObj.matrix);
            }
        } else {
            if (skelMeshRef.current) {
                skelMeshRef.current.setMatrixAt(skelIdx, tempObj.matrix);
                if (skelMeshRef.current.instanceColor) {
                    skelMeshRef.current.setColorAt(skelIdx, tempColor.setHex(enemy.type === 'BOSS' ? 0xff6666 : 0xffffff));
                }
                skelIdx++;
            }
        }
    }

    // Cleanup unused meshes
    if (batMeshRef.current) {
        for (let i = batIdx; i < MAX_ENEMIES; i++) {
            tempObj.position.set(0, -100, 0);
            tempObj.updateMatrix();
            batMeshRef.current.setMatrixAt(i, tempObj.matrix);
        }
        batMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (skelMeshRef.current) {
        for (let i = skelIdx; i < MAX_ENEMIES; i++) {
            tempObj.position.set(0, -100, 0);
            tempObj.updateMatrix();
            skelMeshRef.current.setMatrixAt(i, tempObj.matrix);
        }
        skelMeshRef.current.instanceMatrix.needsUpdate = true;
        if (skelMeshRef.current.instanceColor) skelMeshRef.current.instanceColor.needsUpdate = true;
    }

    // Projectiles
    if (projectileMeshRef.current) {
      let idx = 0;
      for (const proj of projectilesRef.current) {
        if (!proj.active) {
           tempObj.position.set(0, -100, 0);
           tempObj.updateMatrix();
           projectileMeshRef.current.setMatrixAt(idx++, tempObj.matrix);
           continue;
        }

        proj.timeLeft -= delta;
        if (proj.timeLeft <= 0) {
          proj.active = false;
        } else {
          proj.position.x += proj.direction.x * internalPlayer.current.projectileSpeed;
          proj.position.y += proj.direction.y * internalPlayer.current.projectileSpeed;
          proj.position.z += proj.direction.z * internalPlayer.current.projectileSpeed;

          // Collision with Enemies
          // Optimization: Only check enemies close by? For now brute force is okay for 200
          for (const enemy of enemiesRef.current) {
            if (!enemy.active) continue;
            // 3D Distance check
            const dx = proj.position.x - enemy.position.x;
            const dz = proj.position.z - enemy.position.z;
            const dy = proj.position.y - 1; // Enemy center is roughly Y=1
            
            if ((dx*dx + dz*dz + dy*dy) < 1.5) { // Hitbox size
              enemy.hp -= internalPlayer.current.damage;
              proj.active = false; 
              
              if (enemy.hp <= 0) {
                enemy.active = false;
                internalStats.current.enemiesKilled++;
                const gemSlot = gemsRef.current.find(g => !g.active);
                if (gemSlot) {
                  gemSlot.active = true;
                  gemSlot.position.x = enemy.position.x;
                  gemSlot.position.z = enemy.position.z;
                  gemSlot.value = enemy.type === 'BOSS' ? 50 : 10;
                }
              }
              break; 
            }
          }
        }

        tempObj.position.set(proj.position.x, proj.position.y, proj.position.z);
        tempObj.lookAt(camera.position); // Always face camera
        tempObj.scale.set(0.5, 0.5, 0.5);
        tempObj.updateMatrix();
        projectileMeshRef.current.setMatrixAt(idx++, tempObj.matrix);
      }
      projectileMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Gems
    if (gemMeshRef.current) {
      let idx = 0;
      for (const gem of gemsRef.current) {
        if (!gem.active) {
            tempObj.position.set(0, -100, 0);
            tempObj.updateMatrix();
            gemMeshRef.current.setMatrixAt(idx++, tempObj.matrix);
            continue;
        }

        const dx = internalPlayer.current.position.x - gem.position.x;
        const dz = internalPlayer.current.position.z - gem.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < internalPlayer.current.pickupRange) {
            gem.position.x += (dx / dist) * 0.3;
            gem.position.z += (dz / dist) * 0.3;
            
            if (dist < 0.5) {
                gem.active = false;
                internalPlayer.current.xp += gem.value;
                if (internalPlayer.current.xp >= internalPlayer.current.nextLevelXp) {
                    internalPlayer.current.level++;
                    internalPlayer.current.xp -= internalPlayer.current.nextLevelXp;
                    internalPlayer.current.nextLevelXp = Math.floor(internalPlayer.current.nextLevelXp * 1.5);
                    internalPlayer.current.damage += 5;
                    internalPlayer.current.fireRate += 0.5;
                    internalStats.current.levelReached = internalPlayer.current.level;
                    onLevelUp(internalPlayer.current.level);
                }
            }
        }

        tempObj.position.set(gem.position.x, 0.5, gem.position.z);
        tempObj.lookAt(camera.position);
        tempObj.scale.set(0.5, 0.5, 0.5);
        tempObj.updateMatrix();
        gemMeshRef.current.setMatrixAt(idx++, tempObj.matrix);
      }
      gemMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Sync UI state rarely
    if (frameCount.current % 10 === 0) {
        setPlayerState({...internalPlayer.current});
        setStats({...internalStats.current});
    }
  });

  return (
    <>
      {status === 'PLAYING' && <PointerLockControls />}
      
      <ambientLight intensity={0.2} />
      <pointLight position={[internalPlayer.current.position.x, 5, internalPlayer.current.position.z]} intensity={2} distance={35} decay={2} color="#ffaa88" />

      <DungeonMap floorTex={floorTex} wallTex={wallTex} />

      {/* Enemies */}
      <instancedMesh ref={batMeshRef} args={[undefined, undefined, MAX_ENEMIES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={batTex} transparent alphaTest={0.1} side={THREE.DoubleSide} />
      </instancedMesh>

      <instancedMesh ref={skelMeshRef} args={[undefined, undefined, MAX_ENEMIES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={skelTex} transparent alphaTest={0.1} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* Projectiles */}
      <instancedMesh ref={projectileMeshRef} args={[undefined, undefined, MAX_PROJECTILES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={projTex} transparent alphaTest={0.1} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* Gems */}
      <instancedMesh ref={gemMeshRef} args={[undefined, undefined, MAX_GEMS]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={gemTex} transparent alphaTest={0.1} emissive="#228844" emissiveIntensity={0.5} side={THREE.DoubleSide} />
      </instancedMesh>

      <Stars radius={80} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
      <fog attach="fog" args={['#050505', 5, 30]} />
    </>
  );
};

export const Game3D: React.FC<GameSceneProps> = (props) => {
  return (
    <div className="w-full h-full bg-black">
      <Canvas>
        {/* Camera defaults will be overridden by GameEngine updates, but good for initial render */}
        <Suspense fallback={null}>
          <GameEngine {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};