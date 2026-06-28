import { memo } from 'react';
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

function BfsPanel() {
  const bfs = useSimulationStore((s) => s.daa.bfs);
  const nodes = bfs.visited.map((id) => ({
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
    .filter(([, parent]) => parent)
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
        <div className="bg-slate-800/50 p-1 rounded">Level: {bfs.level}</div>
        <div className="bg-slate-800/50 p-1 rounded">Visited: {bfs.visited.length}</div>
        <div className="bg-slate-800/50 p-1 rounded">Queue: {bfs.queue.length}</div>
      </div>
    </AlgorithmCard>
  );
}

function DijkstraPanel() {
  const d = useSimulationStore((s) => s.daa.dijkstra);
  return (
    <AlgorithmCard title="Dijkstra — Transmission Route" algorithm="Dijkstra" educational={d.educational} explanation={d.explanation}>
      <div className="space-y-1 text-xs">
        <div className="text-cyan-400 font-medium">Shortest Path (cost: {d.cost.toFixed(2)})</div>
        <div className="flex flex-wrap gap-1">
          {d.path.map((r, i) => (
            <span key={r} className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-red-500/20 rounded text-red-300">{ROOM_DEFINITIONS[r].name}</span>
              {i < d.path.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
        <div className="text-green-400 font-medium mt-2">Safer Route (cost: {d.saferCost.toFixed(2)})</div>
        <div className="flex flex-wrap gap-1">
          {d.saferPath.map((r, i) => (
            <span key={r} className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-green-500/20 rounded text-green-300">{ROOM_DEFINITIONS[r].name}</span>
              {i < d.saferPath.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
        {d.edgeWeights.slice(0, 3).map((e) => (
          <div key={`${e.from}-${e.to}`} className="text-[10px] text-slate-400">
            {ROOM_DEFINITIONS[e.from].name} → {ROOM_DEFINITIONS[e.to].name}: w={e.weight.toFixed(2)} — {e.explanation}
          </div>
        ))}
      </div>
    </AlgorithmCard>
  );
}

function FloydPanel() {
  const fw = useSimulationStore((s) => s.daa.floydWarshall);
  const n = fw.roomIds.length;
  return (
    <AlgorithmCard title="Floyd-Warshall — All-Pairs Paths" algorithm="Floyd-Warshall" educational={fw.educational} explanation={fw.explanation}>
      <div className="text-[10px] mb-1">Pivot k={fw.pivot} | Iteration {fw.iteration}/{n}</div>
      <div className="overflow-auto max-h-28">
        <table className="text-[8px] w-full border-collapse">
          <thead>
            <tr>
              <th className="p-0.5" />
              {fw.roomIds.map((id) => (
                <th key={id} className="p-0.5 text-cyan-400">{ROOM_DEFINITIONS[id].name.slice(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fw.matrix.map((row, i) => (
              <tr key={i}>
                <td className="p-0.5 text-cyan-400">{ROOM_DEFINITIONS[fw.roomIds[i]].name.slice(0, 3)}</td>
                {row.map((val, j) => {
                  const updated = fw.updatedCells.some(([a, b]) => a === i && b === j);
                  return (
                    <td
                      key={j}
                      className={`p-0.5 text-center ${updated ? 'bg-yellow-500/30' : ''} ${val === Infinity ? 'text-slate-600' : 'text-slate-300'}`}
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
    </AlgorithmCard>
  );
}

function HeapPanel() {
  const heap = useSimulationStore((s) => s.daa.heap);
  return (
    <AlgorithmCard title="Max Heap — Room Priority" algorithm="Heap" educational={heap.educational} explanation={heap.explanation}>
      <div className="space-y-1">
        {heap.priorityList.slice(0, 6).map((item, i) => (
          <div key={item.roomId} className="flex items-center gap-2 text-xs">
            <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${i === 0 ? 'bg-red-500/30 text-red-300' : 'bg-slate-700 text-slate-400'}`}>
              {i + 1}
            </span>
            <span className={i === 0 ? 'text-red-300 font-medium' : 'text-slate-300'}>{ROOM_DEFINITIONS[item.roomId].name}</span>
            <span className="ml-auto text-slate-500">{item.score.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </AlgorithmCard>
  );
}

function MergeSortPanel() {
  const ms = useSimulationStore((s) => s.daa.mergeSort);
  const step = useSimulationStore((s) => s.mergeSortAnimStep);
  const currentStep = ms.steps[step];
  return (
    <AlgorithmCard title="Merge Sort — Contamination Rank" algorithm="Merge Sort" educational={ms.educational} explanation={ms.explanation}>
      {currentStep && (
        <div className="text-[10px] text-cyan-400 mb-1 capitalize">{currentStep.phase}: {currentStep.description}</div>
      )}
      <div className="space-y-0.5">
        {ms.sorted.slice(0, 6).map((item, i) => (
          <div key={item.roomId} className="flex text-xs gap-2">
            <span className="text-slate-500 w-4">{i + 1}.</span>
            <span className="text-slate-300">{ROOM_DEFINITIONS[item.roomId].name}</span>
            <div className="flex-1 h-1.5 bg-slate-700 rounded mt-1.5">
              <div className="h-full bg-orange-500 rounded" style={{ width: `${Math.min(100, item.score)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </AlgorithmCard>
  );
}

function KnapsackPanel() {
  const k = useSimulationStore((s) => s.daa.knapsack);
  return (
    <AlgorithmCard title="Knapsack — Resource Allocation" algorithm="Knapsack" educational={k.educational} explanation={k.explanation}>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-green-400 mb-1">Selected</div>
          {k.selected.map((r) => (
            <div key={r} className="text-green-300">{ROOM_DEFINITIONS[r].name}</div>
          ))}
        </div>
        <div>
          <div className="text-red-400 mb-1">Rejected</div>
          {k.rejected.slice(0, 4).map((r) => (
            <div key={r} className="text-slate-500">{ROOM_DEFINITIONS[r].name}</div>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
        <div className="bg-slate-800/50 p-1 rounded">Used: ₹{k.budgetUsed.toLocaleString()}</div>
        <div className="bg-slate-800/50 p-1 rounded">Left: ₹{k.budgetRemaining.toLocaleString()}</div>
        <div className="bg-slate-800/50 p-1 rounded">Reduction: {k.expectedReduction.toFixed(0)}%</div>
      </div>
    </AlgorithmCard>
  );
}

function DaaConsole() {
  const msg = useSimulationStore((s) => s.daa.animationMessage);
  return (
    <aside className="flex flex-col h-full overflow-hidden">
      <div className="p-2 border-b border-slate-700/50 shrink-0">
        <h2 className="text-sm font-semibold text-cyan-400">DAA Analytics Console</h2>
        <p className="text-[10px] text-slate-400 mt-0.5">{msg}</p>
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin p-2 space-y-2">
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
