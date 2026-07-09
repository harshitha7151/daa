import { memo, useMemo } from 'react';
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

// ==========================================
// 10-Second Visualizers (Clean, Premium, Animated)
// ==========================================

function BfsVisualizer({ nextPredicted }: { nextPredicted: string }) {
  const displayName = nextPredicted ? ROOM_DEFINITIONS[nextPredicted as RoomId]?.name : 'None';
  return (
    <div className="h-24 relative flex items-center justify-center bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900">
      <svg className="w-full h-full" viewBox="0 0 320 80">
        {/* Connection lines */}
        <line x1="40" y1="40" x2="120" y2="40" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="120" y1="40" x2="200" y2="40" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="200" y1="40" x2="280" y2="40" stroke="#475569" strokeWidth="1" />

        {/* Waves spreading from Infected Room */}
        <motion.circle
          cx="40" cy="40" r="16" stroke="#ef4444" strokeWidth="1" fill="none"
          animate={{ scale: [1, 2], opacity: [1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
        <circle cx="40" cy="40" r="10" fill="#ef4444" />
        <text x="40" y="65" textAnchor="middle" fill="#ef4444" className="text-[7px] font-bold">Infected</text>

        {/* Wave spreading to adjacent */}
        <motion.circle
          cx="120" cy="40" r="16" stroke="#f97316" strokeWidth="1" fill="none"
          animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
          transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
        />
        <circle cx="120" cy="40" r="10" fill="#f97316" />
        <text x="120" y="65" textAnchor="middle" fill="#f97316" className="text-[7px] font-bold">Adjacent</text>

        {/* Blue Pulsing predicted next room */}
        <motion.circle
          cx="200" cy="40" r="18" stroke="#3b82f6" strokeWidth="2" fill="none"
          animate={{ scale: [1, 1.5], opacity: [1, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <circle cx="200" cy="40" r="10" fill="#3b82f6" />
        <text x="200" y="65" textAnchor="middle" fill="#3b82f6" className="text-[7px] font-extrabold animate-pulse">{displayName.slice(0, 8)}</text>

        {/* Uninfected Room */}
        <circle cx="280" cy="40" r="8" fill="#475569" />
        <text x="280" y="65" textAnchor="middle" fill="#94a3b8" className="text-[7px] font-bold">Safe Zone</text>
      </svg>
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Spread Waves (BFS)</div>
    </div>
  );
}

function DijkstraVisualizer({ path }: { path: string[] }) {
  const points = [
    { x: 30, y: 40, name: path[0] ? ROOM_DEFINITIONS[path[0] as RoomId]?.name.slice(0, 5) : 'Start' },
    { x: 110, y: 40, name: path[1] ? ROOM_DEFINITIONS[path[1] as RoomId]?.name.slice(0, 5) : 'Mid' },
    { x: 190, y: 40, name: path[2] ? ROOM_DEFINITIONS[path[2] as RoomId]?.name.slice(0, 5) : 'Next' },
    { x: 270, y: 40, name: path[3] ? ROOM_DEFINITIONS[path[3] as RoomId]?.name.slice(0, 5) : 'End' },
  ];

  return (
    <div className="h-24 relative flex items-center justify-center bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900">
      <svg className="w-full h-full" viewBox="0 0 300 80">
        {/* Greyed out unused routes */}
        <path d="M 30 40 Q 110 10 190 40" fill="none" stroke="#334155" strokeWidth="1.5" />
        <path d="M 110 40 Q 190 70 270 40" fill="none" stroke="#334155" strokeWidth="1.5" />

        {/* Highlighted transmission route */}
        <path d="M 30 40 L 110 40 L 190 40 L 270 40" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />

        {/* Moving dot travelling along the transmission path */}
        <motion.circle
          cx="30" cy="40" r="5" fill="#f97316"
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
          <g key={idx}>
            <circle cx={pt.x} cy={pt.y} r="6" fill="#1e293b" stroke="#f97316" strokeWidth="1.5" />
            <text x={pt.x} y={pt.y + 18} textAnchor="middle" fill="#94a3b8" className="text-[7px] font-bold font-mono">{pt.name}</text>
          </g>
        ))}
      </svg>
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Fastest Route (Dijkstra)</div>
    </div>
  );
}

function FloydVisualizer({ hubName }: { hubName: string }) {
  return (
    <div className="h-24 relative flex items-center justify-center bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900">
      <svg className="w-full h-full" viewBox="0 0 300 80">
        {/* Incoming routes */}
        <line x1="30" y1="20" x2="150" y2="40" stroke="#38bdf8" strokeWidth="1" />
        <line x1="30" y1="40" x2="150" y2="40" stroke="#ef4444" strokeWidth="1" />
        <line x1="30" y1="60" x2="150" y2="40" stroke="#eab308" strokeWidth="1" />

        {/* Outgoing routes */}
        <line x1="150" y1="40" x2="270" y2="20" stroke="#38bdf8" strokeWidth="1" />
        <line x1="150" y1="40" x2="270" y2="40" stroke="#ef4444" strokeWidth="1" />
        <line x1="150" y1="40" x2="270" y2="60" stroke="#eab308" strokeWidth="1" />

        {/* Dots traveling through the hub */}
        <motion.circle
          cx="30" cy="20" r="3.5" fill="#38bdf8"
          animate={{ cx: [30, 150, 270], cy: [20, 40, 20] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          cx="30" cy="40" r="3.5" fill="#ef4444"
          animate={{ cx: [30, 150, 270], cy: [40, 40, 40] }}
          transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          cx="30" cy="60" r="3.5" fill="#eab308"
          animate={{ cx: [30, 150, 270], cy: [60, 40, 60] }}
          transition={{ duration: 2.5, delay: 1.6, repeat: Infinity, ease: "linear" }}
        />

        {/* Central Hub room */}
        <motion.circle
          cx="150" cy="40" r="14" stroke="#a78bfa" strokeWidth="2" fill="#1e1b4b"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <text x="150" y="43" textAnchor="middle" fill="#a78bfa" className="text-[8px] font-extrabold">{hubName.slice(0, 6)}</text>
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

function HeapVisualizer({ roomsList }: { roomsList: { roomId: string; score: number }[] }) {
  const displayItems = roomsList.slice(0, 3);
  
  return (
    <div className="h-24 relative flex items-end justify-around bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900 pb-4">
      {displayItems.map((item, idx) => {
        const heightPercent = Math.min(100, Math.max(25, item.score * 100));
        const roomName = ROOM_DEFINITIONS[item.roomId as RoomId]?.name || '';
        
        return (
          <div key={item.roomId} className="flex flex-col items-center w-16 space-y-1.5">
            <span className="text-[8px] text-slate-400 font-mono">{item.score.toFixed(1)}</span>
            <div className="w-8 bg-slate-800 rounded-t-lg relative overflow-hidden flex items-end h-12">
              <motion.div 
                className={`w-full rounded-t-lg ${idx === 0 ? 'bg-red-500 shadow-md shadow-red-500/20' : 'bg-cyan-600'}`}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            <span className={`text-[8px] font-extrabold text-center truncate w-full ${idx === 0 ? 'text-red-400 font-black' : 'text-slate-350'}`}>
              {idx === 0 ? '👑 Root' : roomName.slice(0, 6)}
            </span>
          </div>
        );
      })}
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Priority Queue (Max Heap)</div>
    </div>
  );
}

function MergeSortVisualizer({ sortedRooms }: { sortedRooms: { roomId: string; score: number }[] }) {
  const items = useMemo(() => sortedRooms.slice(0, 3), [sortedRooms]);

  return (
    <div className="h-24 relative flex items-center justify-center bg-slate-950/40 rounded-lg p-2 overflow-hidden border border-slate-900">
      <div className="flex gap-2">
        {items.map((item, idx) => (
          <motion.div
            key={item.roomId}
            layout
            className="flex flex-col items-center justify-center p-1.5 rounded border border-slate-850 bg-slate-900/60 w-20 text-center space-y-1 shadow shadow-slate-950"
            animate={{ scale: [0.95, 1] }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <span className="text-[7px] text-slate-500 font-bold font-mono">Rank #{idx + 1}</span>
            <span className="text-[9px] font-extrabold text-white truncate w-full">{ROOM_DEFINITIONS[item.roomId as RoomId]?.name.slice(0, 7)}</span>
            <span className="text-[8px] text-cyan-400 font-mono font-bold">{(item.score).toFixed(0)}%</span>
          </motion.div>
        ))}
      </div>
      <div className="absolute top-1 left-1 text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Sorted Contamination (Merge)</div>
    </div>
  );
}

function KnapsackVisualizer({ selected, budgetUsed, maxBudget }: { selected: string[]; budgetUsed: number; maxBudget: number }) {
  const percentUsed = maxBudget > 0 ? Math.min(100, (budgetUsed / maxBudget) * 100) : 0;

  return (
    <div className="h-24 relative flex flex-col justify-center bg-slate-950/40 rounded-lg p-3 overflow-hidden border border-slate-900 space-y-2">
      {/* Knapsack Bag representation */}
      <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-wider">
        <span>Cleaning Budget Allocation</span>
        <span className="text-cyan-400 font-mono">₹{budgetUsed.toLocaleString()} / ₹{maxBudget.toLocaleString()}</span>
      </div>

      <div className="w-full bg-slate-900 rounded-full h-3.5 border border-slate-800 relative overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-emerald-600 to-green-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentUsed}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>

      {/* Selected rooms icons */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {selected.slice(0, 3).map((r) => (
          <span key={r} className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-green-950/20 text-green-400 border border-green-900/40 font-mono">
            💼 {ROOM_DEFINITIONS[r as RoomId]?.name.slice(0, 7)}
          </span>
        ))}
        {selected.length > 3 && <span className="text-[8px] text-slate-500 font-bold">+{selected.length - 3} more</span>}
        {!selected.length && <span className="text-[8px] text-slate-550 italic">Waiting for allocation...</span>}
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
  const currentStep = Math.max(0, maxSteps - 1);
  const stepData = stepsList[currentStep];

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

  return (
    <AlgorithmCard
      algorithm="BFS"
      purpose="Predict where infection spreads next."
      question="Which room is likely to become infected next?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Delay the next infection wave."
    >
      {/* 10-Second Animation Visualizer */}
      <BfsVisualizer nextPredicted={bfs.nextPredicted ?? ''} />
      
      {/* Academic detail tracing hidden under Technical Details */}
      <div className="mt-3 border-t border-slate-800 pt-2 space-y-2">
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
  const currentStep = Math.max(0, maxSteps - 1);
  const stepData = stepsList[currentStep];

  const visibleVisited = stepData ? stepData.visited : d.path;

  const answer = d.path.length > 1 ? d.path.map((r) => ROOM_DEFINITIONS[r].name).join(' ➔ ') : 'None';
  const reason = d.path.length > 1 ? `This route currently has the lowest transmission cost (${d.cost.toFixed(1)}).` : 'No active transmission path.';
  const recommendation = d.path.length > 1 ? `Restrict movement through ${ROOM_DEFINITIONS[d.path[0]].name} ➔ ${ROOM_DEFINITIONS[d.path[1]].name}.` : 'Continue monitoring.';

  return (
    <AlgorithmCard
      algorithm="Dijkstra"
      purpose="Find the most likely transmission route."
      question="Which route will infection most likely follow?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Reduce transmission speed."
    >
      {/* 10-Second Animation Visualizer */}
      <DijkstraVisualizer path={d.path} />
      
      {/* Detail path nodes flow inside technical trace */}
      <div className="mt-3 border-t border-slate-800 pt-2 space-y-2 text-left">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Path Node Relaxations</div>
        <div className="space-y-2 text-[10px] min-h-[120px]">
          <div className="pt-1.5 space-y-1">
            <div className="text-cyan-400 font-bold text-left">Shortest Path Flow (Cost: {d.cost.toFixed(2)})</div>
            <div className="flex flex-wrap gap-1 items-center">
              {visibleVisited.map((r, i) => (
                <span key={r} className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-405 text-left">
                    {ROOM_DEFINITIONS[r].name}
                  </span>
                  {i < visibleVisited.length - 1 && <span className="text-slate-650">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-1.5 space-y-1">
            <div className="text-green-400 font-bold font-mono text-left">Recommended Safe Path (Cost: {d.saferCost.toFixed(2)})</div>
            <div className="flex flex-wrap gap-1 items-center text-left">
              {d.saferPath.map((r, i) => (
                <span key={r} className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-455">
                    {ROOM_DEFINITIONS[r].name}
                  </span>
                  {i < d.saferPath.length - 1 && <span className="text-slate-650">→</span>}
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

  return (
    <AlgorithmCard 
      algorithm="Floyd-Warshall" 
      purpose="Find rooms that connect many transmission routes." 
      question="Which room connects the most spread routes?" 
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Increase overall transmission distance."
    >
      {/* 10-Second Animation Visualizer */}
      <FloydVisualizer hubName={answer} />

      {/* Floyd Warshall Matrix Table inside technical details */}
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
                      className={`p-0.5 text-center transition-all ${val === Infinity ? 'text-slate-650 font-light' : 'text-slate-200'}`}
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
  const currentStep = Math.max(0, maxSteps - 1);
  const stepData = stepsList[currentStep];

  const currentArray = stepData ? stepData.array : heap.priorityList;

  const answer = heap.root ? ROOM_DEFINITIONS[heap.root].name : 'None';
  const score = heap.priorityList[0]?.score.toFixed(1) || '0.0';
  const reason = `Highest contamination score in priority queue (${score}).`;
  const recommendation = heap.root ? `Sanitize ${answer} first.` : 'No critical cleaning needed.';

  return (
    <AlgorithmCard
      algorithm="Heap"
      purpose="Find highest priority room."
      question="Which room needs attention first?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Reduce immediate outbreak peak intensity."
    >
      {/* 10-Second Animation Visualizer */}
      <HeapVisualizer roomsList={heap.priorityList} />
      
      {/* Technical Array queue listings */}
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
  const ms = useSimulationStore((s) => s.daa.mergeSort);

  const answer = ms.sorted.slice(0, 4).map((x, i) => `${i + 1} ${ROOM_DEFINITIONS[x.roomId].name}`).join('   ');
  const reason = 'Contamination sorting establishes strict ranking.';
  const recommendation = 'Follow this order.';
  const expectedOutcome = 'Systematically clear high-risk zones first.';

  return (
    <AlgorithmCard 
      algorithm="Merge Sort" 
      purpose="Prioritize cleaning order." 
      question="Which rooms should be cleaned first?" 
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome={expectedOutcome}
    >
      {/* 10-Second Animation Visualizer */}
      <MergeSortVisualizer sortedRooms={ms.sorted} />

      {/* Sorting bar chart listing inside Technical Details */}
      <div className="mt-3 border-t border-slate-800 pt-2 space-y-2">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Sorted Contamination List</div>
        <div className="min-h-[142px] space-y-1.5 text-left">
          <div className="space-y-1.5">
            {ms.sorted.slice(0, 4).map((item, i) => (
              <div key={item.roomId} className="flex text-xs gap-2 items-center">
                <span className="text-slate-550 font-mono w-4">{i + 1}.</span>
                <span className="text-slate-300 font-semibold w-24 truncate">{ROOM_DEFINITIONS[item.roomId].name}</span>
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

  const answer = k.selected.length > 0 ? k.selected.map(r => ROOM_DEFINITIONS[r].name).join(', ') : 'None (No budget)';
  const reason = 'Maximum risk reduction within budget limits.';
  const recommendation = 'Assign cleaning teams here.';

  return (
    <AlgorithmCard
      algorithm="Knapsack"
      purpose="Choose the best rooms within the available cleaning budget."
      question="What should be cleaned with the current budget?"
      answer={answer}
      reason={reason}
      recommendation={recommendation}
      expectedOutcome="Maximizes cleaning efficiency under budget limits."
    >
      {/* 10-Second Animation Visualizer */}
      <KnapsackVisualizer selected={k.selected} budgetUsed={k.budgetUsed} maxBudget={k.budgetRemaining + k.budgetUsed} />

      {/* Selected vs Rejected lists inside Technical Details */}
      <div className="mt-3 border-t border-slate-800 pt-2 space-y-2">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Decision Matrix Choices</div>
        <div className="grid grid-cols-2 gap-2 text-[10px] min-h-[96px] text-left">
          <div className="bg-slate-900/30 p-2 rounded border border-slate-800/40">
            <div className="text-green-400 font-bold mb-1 border-b border-slate-855 pb-0.5">Selected List</div>
            {k.selected.map((r) => (
              <div key={r} className="text-green-305 font-medium">• {ROOM_DEFINITIONS[r].name}</div>
            ))}
            {!k.selected.length && <div className="text-slate-600 italic">None</div>}
          </div>
          <div className="bg-slate-900/30 p-2 rounded border border-slate-800/40">
            <div className="text-red-400 font-bold mb-1 border-b border-slate-855 pb-0.5">Rejected/Skipped</div>
            {k.rejected.slice(0, 4).map((r) => (
              <div key={r} className="text-slate-500">• {ROOM_DEFINITIONS[r].name}</div>
            ))}
            {!k.rejected.length && <div className="text-slate-655 italic">None</div>}
          </div>
        </div>
      </div>
    </AlgorithmCard>
  );
}

function DaaConsole() {
  const msg = useSimulationStore((s) => s.daa.animationMessage);
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
