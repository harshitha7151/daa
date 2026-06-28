import { memo, useEffect } from 'react';
import ReactFlow, { Background, MarkerType, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
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

function SteppingControls({
  algo,
  step,
  maxSteps,
  onChange,
}: {
  algo: string;
  step: number;
  maxSteps: number;
  onChange: (s: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 mt-2.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
      <span className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase">{algo} STEP:</span>
      <button
        disabled={step <= 0}
        onClick={() => onChange(step - 1)}
        className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded disabled:opacity-35"
      >
        Prev
      </button>
      <span className="text-[10px] text-slate-300 font-mono font-medium">
        {maxSteps > 0 ? step + 1 : 0} / {maxSteps}
      </span>
      <button
        disabled={step >= maxSteps - 1}
        onClick={() => onChange(step + 1)}
        className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded disabled:opacity-35"
      >
        Next
      </button>
      <button
        onClick={() => onChange(maxSteps - 1)}
        className="ml-auto px-2 py-0.5 text-[9px] font-semibold bg-slate-800/50 hover:bg-slate-700 text-slate-400 rounded"
      >
        Reset
      </button>
    </div>
  );
}

function BfsPanel() {
  const bfs = useSimulationStore((s) => s.daa.bfs);
  const step = useSimulationStore((s) => s.algorithmSteps.bfs);
  const setAlgorithmStep = useSimulationStore((s) => s.setAlgorithmStep);

  const maxSteps = bfs.visited.length;
  // If steps list is not set up, default to max
  useEffect(() => {
    if (maxSteps > 0 && step === 0) {
      setAlgorithmStep('bfs', maxSteps - 1);
    }
  }, [maxSteps, setAlgorithmStep, step]);

  const currentStep = Math.min(step, maxSteps > 0 ? maxSteps - 1 : 0);
  const visibleVisited = bfs.visited.slice(0, currentStep + 1);

  const nodes = bfs.visited
    .slice(0, currentStep + 1)
    .map((id) => ({
      id,
      data: { label: ROOM_DEFINITIONS[id].name },
      position: nodePositions[id] ?? { x: 0, y: 0 },
      style: {
        background: bfs.nextPredicted === id ? '#ea580c' : '#1e3a5f',
        color: '#fff',
        border: bfs.queue.includes(id) ? '2px solid #06b6d4' : '1px solid #334155',
        borderRadius: 8,
        fontSize: 10,
        padding: 4,
      },
    }));

  const edges = Object.entries(bfs.tree)
    .filter(([child, parent]) => parent && visibleVisited.includes(child as RoomId) && visibleVisited.includes(parent as RoomId))
    .map(([child, parent]) => ({
      id: `${parent}-${child}`,
      source: parent as string,
      target: child,
      animated: bfs.nextPredicted === (child as RoomId),
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#06b6d4' },
    }));

  return (
    <AlgorithmCard
      title="BFS — Infection Propagation"
      algorithm="BFS"
      educational={bfs.educational}
      explanation={bfs.explanation}
    >
      <div className="h-32 mb-2 rounded overflow-hidden bg-slate-900/50">
        <ReactFlowProvider>
          <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
            <Background color="#334155" gap={12} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div className="bg-slate-800/50 p-1.5 rounded">Level: {bfs.level}</div>
        <div className="bg-slate-800/50 p-1.5 rounded">Visited: {visibleVisited.length}</div>
        <div className="bg-slate-800/50 p-1.5 rounded">Queue: {bfs.queue.length}</div>
      </div>
      <SteppingControls algo="BFS" step={currentStep} maxSteps={maxSteps} onChange={(s) => setAlgorithmStep('bfs', s)} />
    </AlgorithmCard>
  );
}

function DijkstraPanel() {
  const d = useSimulationStore((s) => s.daa.dijkstra);
  const step = useSimulationStore((s) => s.algorithmSteps.dijkstra);
  const setAlgorithmStep = useSimulationStore((s) => s.setAlgorithmStep);

  const maxSteps = d.path.length;
  useEffect(() => {
    if (maxSteps > 0 && step === 0) {
      setAlgorithmStep('dijkstra', maxSteps - 1);
    }
  }, [maxSteps, setAlgorithmStep, step]);

  const currentStep = Math.min(step, maxSteps > 0 ? maxSteps - 1 : 0);
  const visiblePath = d.path.slice(0, currentStep + 1);

  return (
    <AlgorithmCard title="Dijkstra — Transmission Route" algorithm="Dijkstra" educational={d.educational} explanation={d.explanation}>
      <div className="space-y-1.5 text-xs min-h-[96px]">
        <div className="text-cyan-400 font-semibold">Shortest Path (cost: {d.cost.toFixed(2)})</div>
        <div className="flex flex-wrap gap-1">
          {visiblePath.map((r, i) => (
            <span key={r} className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-red-500/20 rounded text-red-300 font-medium">{ROOM_DEFINITIONS[r].name}</span>
              {i < visiblePath.length - 1 && <span className="text-slate-500">→</span>}
            </span>
          ))}
        </div>
        <div className="text-green-400 font-semibold mt-2">Safer Route (cost: {d.saferCost.toFixed(2)})</div>
        <div className="flex flex-wrap gap-1">
          {d.saferPath.map((r, i) => (
            <span key={r} className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-green-500/20 rounded text-green-300 font-medium">{ROOM_DEFINITIONS[r].name}</span>
              {i < d.saferPath.length - 1 && <span className="text-slate-500">→</span>}
            </span>
          ))}
        </div>
      </div>
      <SteppingControls algo="Dijkstra" step={currentStep} maxSteps={maxSteps} onChange={(s) => setAlgorithmStep('dijkstra', s)} />
    </AlgorithmCard>
  );
}

function FloydPanel() {
  const fw = useSimulationStore((s) => s.daa.floydWarshall);
  const step = useSimulationStore((s) => s.algorithmSteps.floydWarshall);
  const setAlgorithmStep = useSimulationStore((s) => s.setAlgorithmStep);

  const maxSteps = fw.roomIds.length;
  useEffect(() => {
    if (maxSteps > 0 && step === 0) {
      setAlgorithmStep('floydWarshall', maxSteps - 1);
    }
  }, [maxSteps, setAlgorithmStep, step]);

  const currentStep = Math.min(step, maxSteps > 0 ? maxSteps - 1 : 0);
  const n = fw.roomIds.length;

  return (
    <AlgorithmCard title="Floyd-Warshall — All-Pairs Paths" algorithm="Floyd-Warshall" educational={fw.educational} explanation={fw.explanation}>
      <div className="text-[10px] mb-1.5 font-medium text-slate-300">
        Pivot k={fw.roomIds[currentStep] ? ROOM_DEFINITIONS[fw.roomIds[currentStep]].name : '—'} | Iteration {currentStep + 1}/{n}
      </div>
      <div className="overflow-auto max-h-28 border border-slate-800/80 rounded bg-slate-950/40">
        <table className="text-[8px] w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40">
              <th className="p-0.5" />
              {fw.roomIds.map((id) => (
                <th key={id} className="p-0.5 text-cyan-400 font-semibold">{ROOM_DEFINITIONS[id].name.slice(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fw.matrix.map((row, i) => (
              <tr key={i} className="border-b border-slate-900">
                <td className="p-0.5 text-cyan-400 font-semibold bg-slate-900/20">{ROOM_DEFINITIONS[fw.roomIds[i]].name.slice(0, 3)}</td>
                {row.map((val, j) => {
                  const updated = fw.updatedCells.some(([a, b]) => a === i && b === j);
                  return (
                    <td
                      key={j}
                      className={`p-0.5 text-center ${updated ? 'bg-yellow-500/20 text-yellow-300' : ''} ${val === Infinity ? 'text-slate-600' : 'text-slate-300'}`}
                    >
                      {val === Infinity ? '∞' : val.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SteppingControls algo="Floyd" step={currentStep} maxSteps={maxSteps} onChange={(s) => setAlgorithmStep('floydWarshall', s)} />
    </AlgorithmCard>
  );
}

function HeapPanel() {
  const heap = useSimulationStore((s) => s.daa.heap);
  const step = useSimulationStore((s) => s.algorithmSteps.heap);
  const setAlgorithmStep = useSimulationStore((s) => s.setAlgorithmStep);

  const maxSteps = heap.priorityList.length;
  useEffect(() => {
    if (maxSteps > 0 && step === 0) {
      setAlgorithmStep('heap', maxSteps - 1);
    }
  }, [maxSteps, setAlgorithmStep, step]);

  const currentStep = Math.min(step, maxSteps > 0 ? maxSteps - 1 : 0);
  const visibleList = heap.priorityList.slice(0, currentStep + 1);

  return (
    <AlgorithmCard title="Max Heap — Room Priority" algorithm="Heap" educational={heap.educational} explanation={heap.explanation}>
      <div className="space-y-1.5 min-h-[142px]">
        {visibleList.slice(0, 6).map((item, i) => (
          <div key={item.roomId} className="flex items-center gap-2 text-xs">
            <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${i === 0 ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400'}`}>
              {i + 1}
            </span>
            <span className={i === 0 ? 'text-red-300 font-semibold' : 'text-slate-300'}>{ROOM_DEFINITIONS[item.roomId].name}</span>
            <span className="ml-auto text-slate-500 font-mono font-medium">{item.score.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <SteppingControls algo="Heap" step={currentStep} maxSteps={maxSteps} onChange={(s) => setAlgorithmStep('heap', s)} />
    </AlgorithmCard>
  );
}

function MergeSortPanel() {
  const ms = useSimulationStore((s) => s.daa.mergeSort);
  const step = useSimulationStore((s) => s.algorithmSteps.mergeSort);
  const setAlgorithmStep = useSimulationStore((s) => s.setAlgorithmStep);

  const maxSteps = ms.steps.length;
  useEffect(() => {
    if (maxSteps > 0 && step === 0) {
      setAlgorithmStep('mergeSort', maxSteps - 1);
    }
  }, [maxSteps, setAlgorithmStep, step]);

  const currentStep = Math.min(step, maxSteps > 0 ? maxSteps - 1 : 0);
  const currentStepData = ms.steps[currentStep];

  return (
    <AlgorithmCard title="Merge Sort — Contamination Rank" algorithm="Merge Sort" educational={ms.educational} explanation={ms.explanation}>
      <div className="min-h-[142px]">
        {currentStepData && (
          <div className="text-[10px] text-cyan-400 mb-1.5 capitalize font-medium">
            Phase: {currentStepData.phase} — {currentStepData.description}
          </div>
        )}
        <div className="space-y-1.5">
          {ms.sorted.slice(0, 5).map((item, i) => (
            <div key={item.roomId} className="flex text-xs gap-2 items-center">
              <span className="text-slate-500 font-mono w-4">{i + 1}.</span>
              <span className="text-slate-300 font-medium w-24 truncate">{ROOM_DEFINITIONS[item.roomId].name}</span>
              <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                <div className="h-full bg-orange-500 rounded" style={{ width: `${Math.min(100, item.score)}%` }} />
              </div>
              <span className="text-slate-500 text-[10px] font-mono">{(item.score).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
      <SteppingControls algo="Merge" step={currentStep} maxSteps={maxSteps} onChange={(s) => setAlgorithmStep('mergeSort', s)} />
    </AlgorithmCard>
  );
}

function KnapsackPanel() {
  const k = useSimulationStore((s) => s.daa.knapsack);
  const step = useSimulationStore((s) => s.algorithmSteps.knapsack);
  const setAlgorithmStep = useSimulationStore((s) => s.setAlgorithmStep);

  const totalItems = k.selected.length + k.rejected.length;
  useEffect(() => {
    if (totalItems > 0 && step === 0) {
      setAlgorithmStep('knapsack', totalItems - 1);
    }
  }, [totalItems, setAlgorithmStep, step]);

  const currentStep = Math.min(step, totalItems > 0 ? totalItems - 1 : 0);

  const visibleSelected = k.selected.slice(0, currentStep + 1);
  const visibleRejected = k.rejected.slice(0, Math.max(0, currentStep - k.selected.length + 1));

  return (
    <AlgorithmCard title="Knapsack — Resource Allocation" algorithm="Knapsack" educational={k.educational} explanation={k.explanation}>
      <div className="grid grid-cols-2 gap-3 text-xs min-h-[96px]">
        <div className="bg-slate-900/30 p-2 rounded border border-slate-800/40">
          <div className="text-green-400 font-semibold mb-1">Selected Rooms</div>
          {visibleSelected.map((r) => (
            <div key={r} className="text-green-300 font-medium">• {ROOM_DEFINITIONS[r].name}</div>
          ))}
          {!visibleSelected.length && <div className="text-slate-600 italic">None</div>}
        </div>
        <div className="bg-slate-900/30 p-2 rounded border border-slate-800/40">
          <div className="text-red-400 font-semibold mb-1">Rejected Rooms</div>
          {visibleRejected.slice(0, 4).map((r) => (
            <div key={r} className="text-slate-500">• {ROOM_DEFINITIONS[r].name}</div>
          ))}
          {!visibleRejected.length && <div className="text-slate-600 italic">None</div>}
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1 text-[10px]">
        <div className="bg-slate-800/50 p-1 rounded text-center">Used: ₹{k.budgetUsed.toLocaleString()}</div>
        <div className="bg-slate-800/50 p-1 rounded text-center">Left: ₹{k.budgetRemaining.toLocaleString()}</div>
        <div className="bg-slate-800/50 p-1 rounded text-center">Reduction: {k.expectedReduction.toFixed(0)}%</div>
      </div>
      <SteppingControls algo="Knapsack" step={currentStep} maxSteps={totalItems} onChange={(s) => setAlgorithmStep('knapsack', s)} />
    </AlgorithmCard>
  );
}

function DaaConsole() {
  const msg = useSimulationStore((s) => s.daa.animationMessage);
  return (
    <aside className="flex flex-col h-full">
      <div className="p-2 border-b border-slate-800 shrink-0 mb-4 bg-slate-900/30 rounded-lg">
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
