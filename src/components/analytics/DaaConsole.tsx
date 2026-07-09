import { memo, useMemo, useState, useEffect } from 'react';
import ReactFlow, { Background, MarkerType, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { useSimulationStore } from '../../store/simulationStore';
import { ROOM_DEFINITIONS } from '../../data/hospitalData';
import type { RoomId } from '../../types';
import AlgorithmCard from './AlgorithmCard';

const nodePositions: Record<string, { x: number; y: number }> = {
  reception: { x: 0, y: 0 },
  'waiting-area': { x: 120, y: 0 },
  emergency: { x: 240, y: 0 },
  'general-ward': { x: 360, y: 0 },
  radiology: { x: 0, y: 80 },
  pharmacy: { x: 120, y: 80 },
  'doctor-cabin': { x: 240, y: 80 },
  'sanitization-room': { x: 360, y: 80 },
  'ward-1': { x: 60, y: 160 },
  'ward-2': { x: 180, y: 160 },
  icu: { x: 300, y: 160 },
  'isolation-ward': { x: 420, y: 160 },
  laboratory: { x: 180, y: 240 },
};

const handleRoomClick = (roomId: string) => {
  const store = useSimulationStore.getState();
  store.selectRoom(roomId as RoomId);
  store.setCameraMode('free');
  store.flashRoom(roomId);
};

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReplay: () => void;
  speed: number;
  onSpeedChange: (val: number) => void;
  currentStep: number;
  totalSteps: number;
}

function PlaybackControls({
  isPlaying,
  onPlayPause,
  onStep,
  onReplay,
  speed,
  onSpeedChange,
  currentStep,
  totalSteps,
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[10px] mb-2 select-none">
      <div className="flex items-center gap-1">
        <button
          onClick={onPlayPause}
          className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 font-bold text-white transition-all text-[9px] min-w-[40px] shadow"
        >
          {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
        <button
          onClick={onStep}
          disabled={currentStep >= totalSteps - 1}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 font-bold text-slate-350 disabled:opacity-40 disabled:hover:bg-slate-800 text-[9px]"
          title="Step Forward"
        >
          ⏭ STEP
        </button>
        <button
          onClick={onReplay}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 font-bold text-slate-350 text-[9px]"
          title="Replay"
        >
          🔄 REPLAY
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 font-semibold text-slate-500 text-[8px] uppercase tracking-wider">
          Speed
          <input
            type="range"
            min={200}
            max={2500}
            step={100}
            value={2700 - speed}
            onChange={(e) => onSpeedChange(2700 - Number(e.target.value))}
            className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </label>
        <span className="font-mono text-[9px] text-cyan-400 font-bold">
          {currentStep + 1}/{totalSteps}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// 10-Second Visualizers (Clean, Premium, Animated)
// ==========================================

interface BfsVisualizerProps {
  currentNode: string | null;
  queue: string[];
  visited: string[];
  checkingNeighbor: string | null;
  nextPredicted: string | null;
  onRoomClick?: (roomId: string) => void;
}

function BfsVisualizer({
  currentNode,
  queue,
  visited,
  checkingNeighbor,
  nextPredicted,
  onRoomClick,
}: BfsVisualizerProps) {
  const config = useSimulationStore((s) => s.config);
  
  const startRoom = config.startingRoom;
  const adjacentRoom = visited.find(id => id !== startRoom) || 'waiting-area';
  const predictedRoom = nextPredicted || 'radiology';
  const safeRoom = ROOM_IDS.find(id => id !== startRoom && id !== adjacentRoom && id !== predictedRoom) || 'isolation-ward';

  const startName = ROOM_DEFINITIONS[startRoom as RoomId]?.name || 'Start';
  const adjName = ROOM_DEFINITIONS[adjacentRoom as RoomId]?.name || 'Adjacent';
  const predName = ROOM_DEFINITIONS[predictedRoom as RoomId]?.name || 'Target';
  const safeName = ROOM_DEFINITIONS[safeRoom as RoomId]?.name || 'Safe';

  const getNodeFill = (roomId: string) => {
    if (nextPredicted === roomId) return '#ef4444'; // Flashing Red when complete/selected
    if (currentNode === roomId) return '#f97316'; // Active orange
    if (checkingNeighbor === roomId) return '#eab308'; // Active checking yellow
    if (queue.includes(roomId)) return '#ea580c'; // Wave queue orange
    if (visited.includes(roomId)) return '#3b82f6'; // Visited blue
    return '#475569'; // Default safe grey
  };

  return (
    <div className="h-24 relative flex items-center justify-center bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900">
      <svg className="w-full h-full" viewBox="0 0 320 80">
        {/* Connection lines */}
        <line x1="40" y1="40" x2="120" y2="40" stroke={getNodeFill(adjacentRoom)} strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="120" y1="40" x2="200" y2="40" stroke={getNodeFill(predictedRoom)} strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="200" y1="40" x2="280" y2="40" stroke="#475569" strokeWidth="1" />

        {/* Waves spreading from Infected Room */}
        <g className="cursor-pointer" onClick={() => onRoomClick?.(startRoom)}>
          {currentNode === startRoom && (
            <motion.circle
              cx="40" cy="40" r="16" stroke="#ef4444" strokeWidth="1" fill="none"
              animate={{ scale: [1, 2], opacity: [1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <circle cx="40" cy="40" r="10" fill={getNodeFill(startRoom)} />
          <text x="40" y="65" textAnchor="middle" fill={getNodeFill(startRoom)} className="text-[7px] font-bold">{startName.slice(0, 8)}</text>
        </g>

        {/* Wave spreading to adjacent */}
        <g className="cursor-pointer" onClick={() => onRoomClick?.(adjacentRoom)}>
          {currentNode === adjacentRoom && (
            <motion.circle
              cx="120" cy="40" r="16" stroke="#f97316" strokeWidth="1" fill="none"
              animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <circle cx="120" cy="40" r="10" fill={getNodeFill(adjacentRoom)} />
          <text x="120" y="65" textAnchor="middle" fill={getNodeFill(adjacentRoom)} className="text-[7px] font-bold">{adjName.slice(0, 8)}</text>
        </g>

        {/* Blue Pulsing predicted next room */}
        <g className="cursor-pointer" onClick={() => onRoomClick?.(predictedRoom)}>
          {nextPredicted === predictedRoom && (
            <motion.circle
              cx="200" cy="40" r="18" stroke="#ef4444" strokeWidth="2" fill="none"
              animate={{ scale: [1, 1.4], opacity: [1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
          <circle cx="200" cy="40" r="10" fill={getNodeFill(predictedRoom)} />
          <text x="200" y="65" textAnchor="middle" fill={getNodeFill(predictedRoom)} className="text-[7px] font-extrabold animate-pulse">{predName.slice(0, 8)}</text>
        </g>

        {/* Uninfected Room */}
        <g className="cursor-pointer" onClick={() => onRoomClick?.(safeRoom)}>
          <circle cx="280" cy="40" r="8" fill={getNodeFill(safeRoom)} />
          <text x="280" y="65" textAnchor="middle" fill="#94a3b8" className="text-[7px] font-bold">{safeName.slice(0, 8)}</text>
        </g>
      </svg>
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Spread Waves (BFS)</div>
    </div>
  );
}

const ROOM_IDS: RoomId[] = [
  'reception', 'waiting-area', 'emergency', 'general-ward', 'radiology',
  'pharmacy', 'doctor-cabin', 'sanitization-room', 'ward-1', 'ward-2',
  'icu', 'isolation-ward', 'laboratory'
];

interface DijkstraVisualizerProps {
  currentNode: string | null;
  visited: string[];
  distances: Record<string, number>;
  previous: Record<string, string | null>;
  checkingNeighbor: string | null;
  path: string[];
  onRoomClick?: (roomId: string) => void;
}

function DijkstraVisualizer({
  currentNode,
  visited,
  distances,
  previous,
  checkingNeighbor,
  path,
  onRoomClick,
}: DijkstraVisualizerProps) {
  const points = useMemo(() => {
    const nodesToShow = path.slice(0, 4);
    while (nodesToShow.length < 4) {
      const missing = ROOM_IDS.find(id => !nodesToShow.includes(id));
      if (missing) nodesToShow.push(missing);
      else break;
    }
    return nodesToShow.map((roomId, idx) => ({
      roomId,
      x: 30 + idx * 80,
      y: 40,
      name: ROOM_DEFINITIONS[roomId as RoomId]?.name.slice(0, 5) || 'Room'
    }));
  }, [path]);

  const getNodeBorderColor = (roomId: string) => {
    if (path.includes(roomId)) return '#22c55e'; // Bright green for final shortest path
    if (currentNode === roomId) return '#f97316'; // Active orange
    if (checkingNeighbor === roomId) return '#eab308'; // Active checking yellow
    if (visited.includes(roomId)) return '#38bdf8'; // Explored light blue
    return '#475569'; // Grey
  };

  return (
    <div className="h-24 relative flex items-center justify-center bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900">
      <svg className="w-full h-full" viewBox="0 0 300 80">
        {/* Greyed out unused routes */}
        <path d="M 30 40 Q 110 10 190 40" fill="none" stroke="#334155" strokeWidth="1.5" />
        <path d="M 110 40 Q 190 70 270 40" fill="none" stroke="#334155" strokeWidth="1.5" />

        {/* Highlighted transmission route */}
        <path d="M 30 40 L 110 40 L 190 40 L 270 40" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />

        {/* Moving dot travelling along the transmission path */}
        <motion.circle
          cx="30" cy="40" r="5" fill="#22c55e"
          animate={{
            cx: [30, 110, 190, 270, 30],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Nodes */}
        {points.map((pt, idx) => (
          <g key={idx} className="cursor-pointer" onClick={() => onRoomClick?.(pt.roomId)}>
            <circle cx={pt.x} cy={pt.y} r="6" fill="#1e293b" stroke={getNodeBorderColor(pt.roomId)} strokeWidth={pt.roomId === currentNode ? 2.5 : 1.5} />
            <text x={pt.x} y={pt.y + 18} textAnchor="middle" fill="#94a3b8" className="text-[7px] font-bold font-mono">{pt.name}</text>
          </g>
        ))}
      </svg>
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Fastest Route (Dijkstra)</div>
    </div>
  );
}

function FloydVisualizer({
  hubRoomId,
  currentStep,
  onRoomClick,
}: {
  hubRoomId: string;
  currentStep: number;
  onRoomClick?: (roomId: string) => void;
}) {
  const name = ROOM_DEFINITIONS[hubRoomId as RoomId]?.name || 'Transit Hub';

  return (
    <div className="h-24 relative flex items-center justify-center bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900">
      <svg className="w-full h-full" viewBox="0 0 320 80">
        {/* Adjacency Lines */}
        <line x1="30" y1="20" x2="150" y2="40" stroke="#475569" strokeWidth="1" />
        <line x1="30" y1="60" x2="150" y2="40" stroke="#475569" strokeWidth="1" />
        <line x1="150" y1="40" x2="270" y2="20" stroke="#475569" strokeWidth="1" />
        <line x1="150" y1="40" x2="270" y2="60" stroke="#475569" strokeWidth="1" />

        {currentStep > 0 && (
          <>
            {/* Dots traveling through the hub */}
            <motion.circle
              cx="30" cy="20" r="3.5" fill="#38bdf8"
              animate={{ cx: [30, 150, 270], cy: [20, 40, 20] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="30" cy="40" r="3.5" fill="#ef4444"
              animate={{ cx: [30, 150, 270], cy: [40, 40, 40] }}
              transition={{ duration: 2.2, delay: 0.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="30" cy="60" r="3.5" fill="#eab308"
              animate={{ cx: [30, 150, 270], cy: [60, 40, 60] }}
              transition={{ duration: 2.4, delay: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="270" cy="20" r="3.5" fill="#a78bfa"
              animate={{ cx: [270, 150, 30], cy: [20, 40, 20] }}
              transition={{ duration: 2, delay: 0.3, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx="270" cy="60" r="3.5" fill="#22c55e"
              animate={{ cx: [270, 150, 30], cy: [60, 40, 60] }}
              transition={{ duration: 2.3, delay: 0.7, repeat: Infinity, ease: "linear" }}
            />
          </>
        )}

        {/* Central Hub room */}
        <g className="cursor-pointer" onClick={() => onRoomClick?.(hubRoomId)}>
          <motion.circle
            cx="150" cy="40" r="14" stroke="#a78bfa" strokeWidth="2" fill="#1e1b4b"
            animate={currentStep === 4 ? { scale: [1, 1.15, 1], stroke: ['#a78bfa', '#c084fc', '#a78bfa'] } : {}}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <text x="150" y="43" textAnchor="middle" fill="#a78bfa" className="text-[8px] font-extrabold">{name.slice(0, 6)}</text>
        </g>
        <text x="150" y="65" textAnchor="middle" fill="#c084fc" className="text-[7px] font-bold">Transit Hub</text>

        {/* Outer nodes labels */}
        <text x="25" y="10" fill="#64748b" className="text-[6px]">Start A</text>
        <text x="25" y="75" fill="#64748b" className="text-[6px]">Start C</text>
        <text x="275" y="10" fill="#64748b" className="text-[6px]">End A</text>
        <text x="275" y="75" fill="#64748b" className="text-[6px]">End C</text>
      </svg>
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Super-Spreader Hub (Floyd)</div>
    </div>
  );
}

interface HeapVisualizerProps {
  array: { roomId: string; score: number }[];
  i?: number;
  j?: number;
  type: string;
  onRoomClick?: (roomId: string) => void;
}

function HeapVisualizer({ array, i, j, type, onRoomClick }: HeapVisualizerProps) {
  const displayItems = array.slice(0, 5); // show top 5 items for cleaner layout

  return (
    <div className="h-24 relative flex items-end justify-around bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900 pb-4">
      {displayItems.map((item, idx) => {
        const heightPercent = Math.min(100, Math.max(20, item.score * 1.5));
        const roomName = ROOM_DEFINITIONS[item.roomId as RoomId]?.name || 'Room';
        
        let barColor = 'bg-cyan-600';
        if (type === 'extract' && idx === 0) {
          barColor = 'bg-red-500 shadow-md shadow-red-500/20';
        } else if (idx === i || idx === j) {
          barColor = type === 'swap' ? 'bg-orange-500' : 'bg-yellow-500';
        }

        return (
          <div key={item.roomId} className="flex flex-col items-center w-12 space-y-1.5 cursor-pointer" onClick={() => onRoomClick?.(item.roomId)}>
            <span className="text-[7px] text-slate-400 font-mono">{item.score.toFixed(1)}</span>
            <div className="w-6 bg-slate-800 rounded-t relative overflow-hidden flex items-end h-10">
              <motion.div 
                className={`w-full rounded-t ${barColor}`}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className={`text-[7px] font-extrabold text-center truncate w-full ${idx === 0 && type === 'extract' ? 'text-red-400' : 'text-slate-350'}`}>
              {idx === 0 && type === 'extract' ? '👑 Root' : roomName.slice(0, 5)}
            </span>
          </div>
        );
      })}
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Priority Queue (Max Heap)</div>
    </div>
  );
}

function MergeSortVisualizer({
  phase,
  left,
  right,
  merged,
  onRoomClick,
}: {
  phase: 'divide' | 'merge' | 'complete';
  left: string[];
  right: string[];
  merged: string[];
  onRoomClick?: (roomId: string) => void;
}) {
  return (
    <div className="h-24 relative flex flex-col items-center justify-center bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900 space-y-1">
      {phase === 'divide' && (
        <div className="flex flex-col items-center w-full">
          <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Divide Phase</div>
          <div className="flex gap-6 mt-1 w-full justify-around">
            <div className="flex gap-1 border border-dashed border-red-500/30 p-1 rounded bg-red-950/5">
              {left.slice(0, 3).map((r) => (
                <div key={r} onClick={() => onRoomClick?.(r)} className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[8px] cursor-pointer font-bold">
                  {ROOM_DEFINITIONS[r as RoomId]?.name.slice(0, 4)}
                </div>
              ))}
            </div>
            <div className="flex gap-1 border border-dashed border-cyan-500/30 p-1 rounded bg-cyan-950/5">
              {right.slice(0, 3).map((r) => (
                <div key={r} onClick={() => onRoomClick?.(r)} className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[8px] cursor-pointer font-bold">
                  {ROOM_DEFINITIONS[r as RoomId]?.name.slice(0, 4)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'merge' && (
        <div className="flex flex-col items-center w-full">
          <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Merge & Sort Phase</div>
          <div className="flex flex-col gap-1 mt-1 w-full items-center">
            <div className="flex gap-1 items-center border border-dashed border-green-500/30 p-1 rounded bg-green-950/5">
              {merged.slice(0, 4).map((r) => (
                <div key={r} onClick={() => onRoomClick?.(r)} className="px-1.5 py-0.5 rounded bg-green-950 text-green-300 text-[8px] font-bold border border-green-850 cursor-pointer">
                  {ROOM_DEFINITIONS[r as RoomId]?.name.slice(0, 4)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="flex flex-col items-center w-full">
          <div className="text-[8px] text-green-400 font-bold uppercase tracking-wider animate-pulse">Sorting Complete</div>
          <div className="flex gap-1 mt-1">
            {merged.slice(0, 4).map((r, idx) => (
              <div key={r} onClick={() => onRoomClick?.(r)} className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold cursor-pointer border ${idx === 0 ? 'bg-cyan-500 text-slate-950 border-cyan-300 animate-pulse' : 'bg-slate-800 text-slate-350 border-slate-700'}`}>
                {idx + 1}. {ROOM_DEFINITIONS[r as RoomId]?.name.slice(0, 5)}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Intervention Sort (Merge Sort)</div>
    </div>
  );
}

interface KnapsackVisualizerProps {
  currentItem: string | null;
  itemCost: number;
  itemValue: number;
  currentBudget: number;
  maxBudget: number;
  decision: string;
  selectedList: string[];
  onRoomClick?: (roomId: string) => void;
}

function KnapsackVisualizer({
  currentItem,
  itemCost,
  itemValue,
  currentBudget,
  maxBudget,
  decision,
  selectedList,
  onRoomClick,
}: KnapsackVisualizerProps) {
  const pct = maxBudget > 0 ? (currentBudget / maxBudget) * 100 : 0;

  return (
    <div className="h-24 relative flex flex-col justify-between bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900 select-none">
      {/* Budget Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[7px] text-slate-500 font-bold uppercase tracking-wider">
          <span>Remaining Budget: ₹{currentBudget.toLocaleString()}</span>
          <span>Max Budget: ₹{maxBudget.toLocaleString()}</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
          <motion.div 
            className="bg-cyan-505 h-full rounded" 
            initial={{ width: 0 }} 
            animate={{ width: `${pct}%` }} 
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Selected rooms list */}
      <div className="flex gap-1.5 items-center justify-center my-1.5 overflow-x-auto py-0.5">
        {selectedList.slice(0, 3).map((r) => (
          <div key={r} onClick={() => onRoomClick?.(r)} className="px-1.5 py-0.5 rounded bg-green-950 border border-green-800 text-green-300 text-[8px] font-bold cursor-pointer">
            ✓ {ROOM_DEFINITIONS[r as RoomId]?.name.slice(0, 5)}
          </div>
        ))}

        {currentItem && (
          <div 
            onClick={() => onRoomClick?.(currentItem)}
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold animate-pulse border cursor-pointer ${decision === 'select' ? 'bg-green-900 text-green-300 border-green-700' : decision === 'reject' ? 'bg-red-950 text-red-400 border-red-900' : 'bg-yellow-950 text-yellow-300 border-yellow-800'}`}
          >
            {decision === 'select' ? '✓' : decision === 'reject' ? '✗' : '?' } {ROOM_DEFINITIONS[currentItem as RoomId]?.name.slice(0, 5)} (₹{(itemCost/1000).toFixed(0)}k)
          </div>
        )}
      </div>

      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Resource Allocation (Knapsack)</div>
    </div>
  );
}

// ==========================================
// Card Panel Wrappers (Collapses low level details)
// ==========================================

function BfsPanel() {
  const bfs = useSimulationStore((s) => s.daa.bfs);
  const stepsList = bfs.steps ?? [];
  const maxSteps = stepsList.length;

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1000);

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(true);
  }, [bfs]);

  useEffect(() => {
    if (!isPlaying || maxSteps <= 1) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [isPlaying, speed, maxSteps]);

  const stepData = stepsList[currentStepIdx] || stepsList[maxSteps - 1];

  // Set store algorithm highlight
  useEffect(() => {
    if (stepData) {
      const activeNode = stepData.currentNode || stepData.checkingNeighbor || null;
      useSimulationStore.getState().setAlgorithmHighlight(activeNode);
    }
    return () => {
      useSimulationStore.getState().setAlgorithmHighlight(null);
    };
  }, [stepData]);

  const visibleVisited = stepData ? stepData.visited : bfs.visited;
  const currentQueue = stepData ? stepData.queue : bfs.queue;

  const nodes = visibleVisited.map((id) => {
    let background = '#1e3a5f';
    let border = '1px solid #334155';
    if (bfs.nextPredicted === id) {
      background = '#ea580c';
    }
    return {
      id,
      data: { label: ROOM_DEFINITIONS[id].name },
      position: nodePositions[id] ?? { x: 0, y: 0 },
      style: {
        background,
        color: '#fff',
        border,
        borderRadius: 8,
        fontSize: 10,
        padding: 4,
      },
    };
  });

  const activeTree = stepData ? stepData.tree : bfs.tree;
  const edges = Object.entries(activeTree)
    .filter(([child, parent]) => parent && visibleVisited.includes(child as RoomId) && visibleVisited.includes(parent as RoomId))
    .map(([child, parent]) => ({
      id: `${parent}-${child}`,
      source: parent as string,
      target: child,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#06b6d4' },
    }));

  const answer = bfs.nextPredicted ? ROOM_DEFINITIONS[bfs.nextPredicted].name : 'None predicted';
  const reason = bfs.nextPredicted ? `${ROOM_DEFINITIONS[bfs.nextPredicted].name} is adjacent to contaminated zones.` : 'No adjacent contamination detected.';
  const recommendation = bfs.nextPredicted ? `Sanitize ${ROOM_DEFINITIONS[bfs.nextPredicted].name}.` : 'Continue monitoring.';

  const isComplete = currentStepIdx === maxSteps - 1;
  const narration = isComplete
    ? `${ROOM_DEFINITIONS[bfs.nextPredicted ?? 'radiology']?.name || 'Radiology'} is the first uninfected room reached by the current infection wave.`
    : stepData?.description || 'BFS propagation wave analysis initialized.';

  const visualizerEl = (
    <div className="space-y-2">
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStep={() => {
          setIsPlaying(false);
          setCurrentStepIdx((p) => Math.min(maxSteps - 1, p + 1));
        }}
        onReplay={() => {
          setCurrentStepIdx(0);
          setIsPlaying(true);
        }}
        speed={speed}
        onSpeedChange={setSpeed}
        currentStep={currentStepIdx}
        totalSteps={maxSteps}
      />
      <BfsVisualizer
        currentNode={stepData?.currentNode ?? null}
        queue={stepData?.queue ?? []}
        visited={stepData?.visited ?? []}
        checkingNeighbor={stepData?.checkingNeighbor ?? null}
        nextPredicted={isComplete ? bfs.nextPredicted : null}
        onRoomClick={handleRoomClick}
      />
      {/* Narration */}
      <div className="bg-slate-950/80 border-l-2 border-cyan-500 p-2 rounded-r-lg min-h-[40px] flex items-center text-[10px] text-slate-200 font-medium leading-relaxed shadow shadow-black/20">
        <span className="animate-pulse mr-1">💬</span>
        <span>{narration}</span>
      </div>
    </div>
  );

  return (
    <AlgorithmCard
      algorithm="BFS"
      purpose="Predict where infection spreads next."
      question="Which room is likely to become infected next?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Delay the next infection wave."
      visualization={visualizerEl}
    >
      <div className="mt-1 space-y-2">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Step-by-Step Graph Tree</div>
        <div className="h-32 rounded overflow-hidden bg-slate-900/50">
          <ReactFlowProvider>
            <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
              <Background color="#334155" gap={12} />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[9px] text-center font-bold font-mono">
          <div className="bg-slate-800/55 p-1 rounded text-cyan-400">Level: {stepData ? stepData.level : bfs.level}</div>
          <div className="bg-slate-800/55 p-1 rounded text-slate-350">Visited: {visibleVisited.length}</div>
          <div className="bg-slate-800/55 p-1 rounded text-yellow-500 font-medium">Queue: {currentQueue.length}</div>
        </div>
      </div>
    </AlgorithmCard>
  );
}

function DijkstraPanel() {
  const d = useSimulationStore((s) => s.daa.dijkstra);
  const stepsList = d.steps ?? [];
  const maxSteps = stepsList.length;

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1000);

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(true);
  }, [d]);

  useEffect(() => {
    if (!isPlaying || maxSteps <= 1) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [isPlaying, speed, maxSteps]);

  const stepData = stepsList[currentStepIdx] || stepsList[maxSteps - 1];

  // Set store algorithm highlight
  useEffect(() => {
    if (stepData) {
      const activeNode = stepData.currentNode || stepData.checkingNeighbor || null;
      useSimulationStore.getState().setAlgorithmHighlight(activeNode);
    }
    return () => {
      useSimulationStore.getState().setAlgorithmHighlight(null);
    };
  }, [stepData]);

  const visibleVisited = stepData ? stepData.visited : d.path;

  const answer = d.path.length > 1 ? d.path.map((r) => ROOM_DEFINITIONS[r].name).join(' ➔ ') : 'None';
  const reason = d.path.length > 1 ? `This route currently has the lowest transmission cost (${d.cost.toFixed(1)}).` : 'No active transmission path.';
  const recommendation = d.path.length > 1 ? `Restrict movement through ${ROOM_DEFINITIONS[d.path[0]].name} ➔ ${ROOM_DEFINITIONS[d.path[1]].name}.` : 'Continue monitoring.';

  const isComplete = currentStepIdx === maxSteps - 1;
  const narration = isComplete
    ? "Dijkstra complete. This is currently the easiest route for infection to travel."
    : stepData?.description || 'Dijkstra route exploration initialized.';

  const visualizerEl = (
    <div className="space-y-2">
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStep={() => {
          setIsPlaying(false);
          setCurrentStepIdx((p) => Math.min(maxSteps - 1, p + 1));
        }}
        onReplay={() => {
          setCurrentStepIdx(0);
          setIsPlaying(true);
        }}
        speed={speed}
        onSpeedChange={setSpeed}
        currentStep={currentStepIdx}
        totalSteps={maxSteps}
      />
      <DijkstraVisualizer
        currentNode={stepData?.currentNode ?? null}
        visited={stepData?.visited ?? []}
        distances={stepData?.distances ?? {}}
        previous={stepData?.previous ?? {}}
        checkingNeighbor={stepData?.checkingNeighbor ?? null}
        path={d.path}
        onRoomClick={handleRoomClick}
      />
      {/* Narration */}
      <div className="bg-slate-950/80 border-l-2 border-cyan-500 p-2 rounded-r-lg min-h-[40px] flex items-center text-[10px] text-slate-205 font-medium leading-relaxed shadow shadow-black/20">
        <span className="animate-pulse mr-1">💬</span>
        <span>{narration}</span>
      </div>
    </div>
  );

  return (
    <AlgorithmCard
      algorithm="Dijkstra"
      purpose="Find the most likely transmission route."
      question="Which route will infection most likely follow?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Reduce transmission speed."
      visualization={visualizerEl}
    >
      <div className="mt-1 space-y-2 text-left">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Path Node Relaxations</div>
        <div className="space-y-2 text-[10px]">
          <div className="pt-1 bg-slate-900/10 p-1.5 rounded">
            <div className="text-cyan-400 font-bold">Shortest Path Flow (Cost: {d.cost.toFixed(2)})</div>
            <div className="flex flex-wrap gap-1 items-center mt-1">
              {visibleVisited.map((r, i) => (
                <span key={r} className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">
                    {ROOM_DEFINITIONS[r].name}
                  </span>
                  {i < visibleVisited.length - 1 && <span className="text-slate-600">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-1 bg-slate-900/10 p-1.5 rounded">
            <div className="text-green-400 font-bold font-mono">Recommended Safe Path (Cost: {d.saferCost.toFixed(2)})</div>
            <div className="flex flex-wrap gap-1 items-center mt-1">
              {d.saferPath.map((r, i) => (
                <span key={r} className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400">
                    {ROOM_DEFINITIONS[r].name}
                  </span>
                  {i < d.saferPath.length - 1 && <span className="text-slate-600">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AlgorithmCard>
  );
}

function FloydPanel() {
  const fw = useSimulationStore((s) => s.daa.floydWarshall);
  const recs = useSimulationStore((s) => s.daa.recommendations);
  
  // Find the transit hub room recommended for locking
  const floydRec = recs.find((r) => r.algorithm === 'Floyd-Warshall');
  const targetRoomId = floydRec?.actionParams?.roomId as RoomId || 'icu';
  const answer = ROOM_DEFINITIONS[targetRoomId].name;
  const reason = `Many shortest transmission paths pass through ${answer}.`;
  const recommendation = `Restrict access to ${answer}.`;

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1000);
  const maxSteps = 5;

  const stepsList = [
    { description: "Initial matrix state: compute all-pairs shortest paths." },
    { description: "Checking paths routing through Emergency Ward..." },
    { description: "Checking paths routing through ICU..." },
    { description: "Analyzing central bottleneck transit nodes..." },
    { description: `Many shortest transmission routes pass through ${answer}.` }
  ];

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(true);
  }, [fw]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [isPlaying, speed]);

  // Set store algorithm highlight when completed
  useEffect(() => {
    if (currentStepIdx === 4) {
      useSimulationStore.getState().setAlgorithmHighlight(targetRoomId);
    } else {
      useSimulationStore.getState().setAlgorithmHighlight(null);
    }
    return () => {
      useSimulationStore.getState().setAlgorithmHighlight(null);
    };
  }, [currentStepIdx, targetRoomId]);

  const narration = stepsList[currentStepIdx]?.description || 'Floyd-Warshall route check initialized.';

  const visualizerEl = (
    <div className="space-y-2">
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStep={() => {
          setIsPlaying(false);
          setCurrentStepIdx((p) => Math.min(maxSteps - 1, p + 1));
        }}
        onReplay={() => {
          setCurrentStepIdx(0);
          setIsPlaying(true);
        }}
        speed={speed}
        onSpeedChange={setSpeed}
        currentStep={currentStepIdx}
        totalSteps={maxSteps}
      />
      <FloydVisualizer
        hubRoomId={targetRoomId}
        currentStep={currentStepIdx}
        onRoomClick={handleRoomClick}
      />
      {/* Narration */}
      <div className="bg-slate-950/80 border-l-2 border-cyan-500 p-2 rounded-r-lg min-h-[40px] flex items-center text-[10px] text-slate-205 font-medium leading-relaxed shadow shadow-black/20">
        <span className="animate-pulse mr-1">💬</span>
        <span>{narration}</span>
      </div>
    </div>
  );

  return (
    <AlgorithmCard 
      algorithm="Floyd-Warshall" 
      purpose="Find rooms that connect many transmission routes." 
      question="Which room connects the most spread routes?" 
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Increase overall transmission distance."
      visualization={visualizerEl}
    >
      <div className="mt-3 border-t border-slate-800 pt-2 space-y-2">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">All-Pairs Distance Matrix (APSP)</div>
        <div className="overflow-auto max-h-36 border border-slate-800/80 rounded bg-slate-950/40">
          <table className="text-[8px] w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40">
                <th className="p-0.5" />
                {fw.roomIds.map((id) => (
                  <th key={id} className="p-0.5 text-cyan-400 font-semibold">
                    {ROOM_DEFINITIONS[id].name.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fw.matrix.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-slate-900">
                  <td className="p-0.5 text-cyan-400 font-semibold bg-slate-900/20">
                    {ROOM_DEFINITIONS[fw.roomIds[rowIdx]].name.slice(0, 3)}
                  </td>
                  {row.map((val, colIdx) => (
                    <td
                      key={colIdx}
                      className={`p-0.5 text-center transition-all ${val === Infinity ? 'text-slate-650 font-light' : 'text-slate-205'}`}
                    >
                      {val === Infinity ? '∞' : val.toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AlgorithmCard>
  );
}

function HeapPanel() {
  const heap = useSimulationStore((s) => s.daa.heap);
  const stepsList = heap.steps ?? [];
  const maxSteps = stepsList.length;

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1000);

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(true);
  }, [heap]);

  useEffect(() => {
    if (!isPlaying || maxSteps <= 1) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [isPlaying, speed, maxSteps]);

  const stepData = stepsList[currentStepIdx] || stepsList[maxSteps - 1];

  // Set store algorithm highlight
  useEffect(() => {
    if (stepData) {
      const activeIdx = stepData.i !== undefined ? stepData.i : null;
      const targetRoom = activeIdx !== null && stepData.array[activeIdx] ? stepData.array[activeIdx].roomId : null;
      useSimulationStore.getState().setAlgorithmHighlight(targetRoom);
    }
    return () => {
      useSimulationStore.getState().setAlgorithmHighlight(null);
    };
  }, [stepData]);

  const rootName = heap.root ? ROOM_DEFINITIONS[heap.root].name : 'None';
  const answer = rootName;
  const score = heap.priorityList[0]?.score.toFixed(1) || '0.0';
  const reason = `Highest contamination score in priority queue (${score}).`;
  const recommendation = heap.root ? `Deploy sanitization team to ${rootName} immediately.` : 'Continue monitoring.';

  const isComplete = currentStepIdx === maxSteps - 1;
  const narration = isComplete
    ? `Max Heap constructed successfully. ${rootName} rises to the root of the heap with highest contamination priority.`
    : stepData?.description || 'Max Heap priority ranking initialized.';

  const currentArray = stepData ? stepData.array : heap.priorityList;

  const visualizerEl = (
    <div className="space-y-2">
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStep={() => {
          setIsPlaying(false);
          setCurrentStepIdx((p) => Math.min(maxSteps - 1, p + 1));
        }}
        onReplay={() => {
          setCurrentStepIdx(0);
          setIsPlaying(true);
        }}
        speed={speed}
        onSpeedChange={setSpeed}
        currentStep={currentStepIdx}
        totalSteps={maxSteps}
      />
      <HeapVisualizer
        array={stepData?.array ?? []}
        i={stepData?.i}
        j={stepData?.j}
        type={stepData?.type ?? 'insert'}
        onRoomClick={handleRoomClick}
      />
      {/* Narration */}
      <div className="bg-slate-950/80 border-l-2 border-cyan-500 p-2 rounded-r-lg min-h-[40px] flex items-center text-[10px] text-slate-200 font-medium leading-relaxed shadow shadow-black/20">
        <span className="animate-pulse mr-1">💬</span>
        <span>{narration}</span>
      </div>
    </div>
  );

  return (
    <AlgorithmCard
      algorithm="Heap"
      purpose="Find highest priority room."
      question="Which room needs attention first?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Clean the highest risk zones first."
      visualization={visualizerEl}
    >
      <div className="mt-3 border-t border-slate-800 pt-2 space-y-2">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Queue Priority Swaps</div>
        <div className="space-y-1.5 min-h-[142px]">
          {currentArray.slice(0, 5).map((item, idx) => (
            <div key={`${item.roomId}-${idx}`} className="flex items-center gap-2 text-xs p-1 rounded bg-slate-900/30 border border-slate-800/40 text-left">
              <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${idx === 0 ? 'bg-red-650 text-white font-extrabold' : 'bg-slate-850 text-slate-400'}`}>
                {idx + 1}
              </span>
              <span className="font-semibold text-slate-350">{ROOM_DEFINITIONS[item.roomId].name}</span>
              {idx === 0 && <span className="text-[8px] bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded font-extrabold uppercase">ROOT</span>}
              <span className="ml-auto text-slate-400 font-mono font-medium">{item.score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </AlgorithmCard>
  );
}

function MergeSortPanel() {
  const m = useSimulationStore((s) => s.daa.mergeSort);
  const stepsList = m.steps ?? [];
  const maxSteps = stepsList.length;

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1000);

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(true);
  }, [m]);

  useEffect(() => {
    if (!isPlaying || maxSteps <= 1) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [isPlaying, speed, maxSteps]);

  const stepData = stepsList[currentStepIdx] || stepsList[maxSteps - 1];

  // Set store algorithm highlight
  useEffect(() => {
    if (stepData) {
      const activeNode = stepData.merged && stepData.merged[0] ? stepData.merged[0] : null;
      useSimulationStore.getState().setAlgorithmHighlight(activeNode);
    }
    return () => {
      useSimulationStore.getState().setAlgorithmHighlight(null);
    };
  }, [stepData]);

  const sortedList = m.sorted ?? [];
  const topPriorityName = sortedList[0] ? ROOM_DEFINITIONS[sortedList[0].roomId].name : 'None';

  const answer = sortedList.slice(0, 4).map((x, i) => `${i + 1}. ${ROOM_DEFINITIONS[x.roomId].name}`).join('   ');
  const reason = 'Contamination sorting establishes strict ranking.';
  const recommendation = sortedList.length > 0 ? `Clean rooms in sorted sequence: ${sortedList.slice(0, 3).map(r => ROOM_DEFINITIONS[r.roomId].name).join(' ➔ ')}.` : 'No rooms require sorting.';

  const isComplete = currentStepIdx === maxSteps - 1;
  const narration = isComplete
    ? `Merge Sort complete. ${topPriorityName} has been identified as the top intervention priority.`
    : stepData?.description || 'Merge Sort ranking initialized.';

  const visualizerEl = (
    <div className="space-y-2">
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStep={() => {
          setIsPlaying(false);
          setCurrentStepIdx((p) => Math.min(maxSteps - 1, p + 1));
        }}
        onReplay={() => {
          setCurrentStepIdx(0);
          setIsPlaying(true);
        }}
        speed={speed}
        onSpeedChange={setSpeed}
        currentStep={currentStepIdx}
        totalSteps={maxSteps}
      />
      <MergeSortVisualizer
        phase={stepData?.phase ?? 'complete'}
        left={stepData?.left ?? []}
        right={stepData?.right ?? []}
        merged={stepData?.merged ?? []}
        onRoomClick={handleRoomClick}
      />
      {/* Narration */}
      <div className="bg-slate-950/80 border-l-2 border-cyan-500 p-2 rounded-r-lg min-h-[40px] flex items-center text-[10px] text-slate-205 font-medium leading-relaxed shadow shadow-black/20">
        <span className="animate-pulse mr-1">💬</span>
        <span>{narration}</span>
      </div>
    </div>
  );

  return (
    <AlgorithmCard
      algorithm="Merge Sort"
      purpose="Prioritize cleaning order."
      question="Which rooms should be cleaned first?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Systematically clear high-risk zones first."
      visualization={visualizerEl}
    >
      <div className="mt-3 border-t border-slate-800 pt-2 space-y-2">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Sorted Contamination List</div>
        <div className="min-h-[142px] space-y-1.5 text-left">
          <div className="space-y-1.5">
            {sortedList.slice(0, 4).map((item, i) => (
              <div key={item.roomId} className="flex text-xs gap-2 items-center">
                <span className="text-slate-500 font-mono w-4">{i + 1}.</span>
                <span className="text-slate-350 font-semibold w-24 truncate">{ROOM_DEFINITIONS[item.roomId].name}</span>
                <div className="flex-1 h-2 bg-slate-850 rounded overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded" style={{ width: `${Math.min(100, item.score)}%` }} />
                </div>
                <span className="text-slate-400 text-[10px] font-mono">{(item.score).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AlgorithmCard>
  );
}

function KnapsackPanel() {
  const k = useSimulationStore((s) => s.daa.knapsack);
  const stepsList = k.steps ?? [];
  const maxSteps = stepsList.length;

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1000);

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(true);
  }, [k]);

  useEffect(() => {
    if (!isPlaying || maxSteps <= 1) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [isPlaying, speed, maxSteps]);

  const stepData = stepsList[currentStepIdx] || stepsList[maxSteps - 1];

  // Set store algorithm highlight
  useEffect(() => {
    if (stepData) {
      useSimulationStore.getState().setAlgorithmHighlight(stepData.currentItem);
    }
    return () => {
      useSimulationStore.getState().setAlgorithmHighlight(null);
    };
  }, [stepData]);

  const answer = k.selected.length > 0 ? k.selected.map(r => ROOM_DEFINITIONS[r].name).join(', ') : 'None (No budget)';
  const reason = 'Maximum risk reduction within budget limits.';
  const recommendation = 'Assign cleaning teams here.';

  const isComplete = currentStepIdx === maxSteps - 1;
  const narration = isComplete
    ? "Knapsack complete. Optimized allocation achieved for the selected budget limit."
    : stepData?.description || 'Knapsack backtracking analysis initialized.';

  const maxBudget = k.budgetUsed + k.budgetRemaining;

  const visualizerEl = (
    <div className="space-y-2">
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStep={() => {
          setIsPlaying(false);
          setCurrentStepIdx((p) => Math.min(maxSteps - 1, p + 1));
        }}
        onReplay={() => {
          setCurrentStepIdx(0);
          setIsPlaying(true);
        }}
        speed={speed}
        onSpeedChange={setSpeed}
        currentStep={currentStepIdx}
        totalSteps={maxSteps}
      />
      <KnapsackVisualizer
        currentItem={stepData?.currentItem ?? null}
        itemCost={stepData?.itemCost ?? 0}
        itemValue={stepData?.itemValue ?? 0}
        currentBudget={stepData?.currentBudget ?? k.budgetRemaining}
        maxBudget={maxBudget || 5000}
        decision={stepData?.decision ?? 'checking'}
        selectedList={stepData?.selectedList ?? []}
        onRoomClick={handleRoomClick}
      />
      {/* Narration */}
      <div className="bg-slate-950/80 border-l-2 border-cyan-500 p-2 rounded-r-lg min-h-[40px] flex items-center text-[10px] text-slate-200 font-medium leading-relaxed shadow shadow-black/20">
        <span className="animate-pulse mr-1">💬</span>
        <span>{narration}</span>
      </div>
    </div>
  );

  return (
    <AlgorithmCard
      algorithm="Knapsack"
      purpose="Choose the best rooms within the available cleaning budget."
      question="What should be cleaned with the current budget?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Maximizes cleaning efficiency under budget limits."
      visualization={visualizerEl}
    >
      <div className="mt-3 space-y-2">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Decision Matrix Choices</div>
        <div className="grid grid-cols-2 gap-2 text-[10px] min-h-[96px] text-left">
          <div className="bg-slate-900/30 p-2 rounded border border-slate-800/40">
            <div className="text-green-400 font-bold mb-1 border-b border-slate-855 pb-0.5">Selected List</div>
            {k.selected.map((r) => (
              <div key={r} className="text-green-305 font-medium">• {ROOM_DEFINITIONS[r].name}</div>
            ))}
            {!k.selected.length && <div className="text-slate-605 italic">None</div>}
          </div>
          <div className="bg-slate-900/30 p-2 rounded border border-slate-800/40">
            <div className="text-red-400 font-bold mb-1 border-b border-slate-855 pb-0.5">Rejected/Skipped</div>
            {k.rejected.slice(0, 4).map((r) => (
              <div key={r} className="text-slate-505">• {ROOM_DEFINITIONS[r].name}</div>
            ))}
            {!k.rejected.length && <div className="text-slate-605 italic">None</div>}
          </div>
        </div>
      </div>
    </AlgorithmCard>
  );
}

function DaaConsole() {
  const msg = useSimulationStore((s) => s.daa.animationMessage);
  const lastEventLabel = useSimulationStore((s) => s.lastEventLabel);

  if (lastEventLabel === '') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/10 border border-slate-800 rounded-2xl min-h-[350px] text-center space-y-4 max-w-2xl mx-auto shadow-xl">
        <h3 className="text-lg font-bold text-cyan-400 uppercase tracking-widest">Decision Support Ready</h3>
        <p className="text-xs text-slate-350 font-semibold">No outbreak analysis has run yet.</p>
        <p className="text-[11px] text-slate-500 font-medium">Please perform a manual action or trigger the outbreak demonstration to activate analysis.</p>
        
        <div className="glass rounded-xl p-4 border border-slate-805 space-y-2.5 text-left w-full max-w-sm">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block border-b border-slate-850 pb-1.5">Action Triggers:</span>
          <ul className="list-disc list-inside space-y-1.5 text-[10px] text-slate-400 font-mono">
            <li>Select Patient Zero and Start Outbreak</li>
            <li>Sanitize any Room manually</li>
            <li>Lock / Unlock a Room</li>
            <li>Move patients, staff, nurses, cleaners</li>
            <li>Change the cleaning budget</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <aside className="flex flex-col h-full text-left">
      <div className="p-2.5 border border-slate-800 shrink-0 mb-4 bg-slate-900/30 rounded-lg">
        <h3 className="text-sm font-bold text-cyan-400">DAA Analytics Engine Status</h3>
        <p className="text-[10px] text-slate-400 mt-0.5">{msg}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
        <BfsPanel />
        <DijkstraPanel />
        <FloydPanel />
        <HeapPanel />
        <MergeSortPanel />
        <KnapsackPanel />
      </div>
    </aside>
  );
}

export default memo(DaaConsole);
