import { motion } from 'framer-motion';
import { useSimulationStore } from '../../store/simulationStore';

const ALGO_ACTIONS: Record<string, string> = {
  BFS: 'Isolate or sanitize predicted room',
  Dijkstra: 'Reduce movement through highlighted corridor',
  'Floyd-Warshall': 'Consider closing indirect transmission corridor',
  Heap: 'Sanitize highest-priority room immediately',
  'Merge Sort': 'Follow contamination ranking for intervention order',
  Knapsack: 'Sanitize budget-optimal rooms (green highlight)',
};

export default function Recommendations() {
  const recommendations = useSimulationStore((s) => s.daa.recommendations);

  const priorityColor = {
    low: 'border-slate-500',
    medium: 'border-yellow-500',
    high: 'border-orange-500',
    critical: 'border-red-500',
  };

  return (
    <div className="p-2 h-full overflow-y-auto scroll-thin">
      <h3 className="text-xs font-semibold text-cyan-400 mb-2">Algorithm Recommendations</h3>
      <p className="text-[9px] text-slate-500 mb-2">Recommendations only — use control buttons to act.</p>
      <div className="space-y-2">
        {recommendations.map((rec, i) => (
          <motion.div
            key={`${rec.algorithm}-${i}`}
            className={`glass rounded-lg p-2 border-l-2 ${priorityColor[rec.priority]}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="text-[10px] font-semibold text-cyan-400 mb-1">
              Recommended by {rec.algorithm}
            </div>
            <p className="text-[11px] text-white font-medium mb-1">{rec.recommendation}</p>
            <p className="text-[10px] text-slate-400">
              <span className="text-slate-500">Reason:</span> {rec.reason}
            </p>
            <p className="text-[10px] text-amber-400/90 mt-0.5">
              Action: {ALGO_ACTIONS[rec.algorithm] ?? 'Review in 3D twin'}
            </p>
            <div className="flex gap-3 mt-1 text-[10px]">
              <span className="text-green-400">↓ {rec.expectedReduction}%</span>
              <span className="text-slate-500">Confidence: {rec.confidence}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
