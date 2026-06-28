import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AlgorithmEducational } from '../../types';
import { useSimulationStore } from '../../store/simulationStore';

interface Props {
  title: string;
  algorithm: string;
  educational: AlgorithmEducational;
  explanation: string;
  children: React.ReactNode;
}

export default function AlgorithmCard({ title, algorithm, educational, explanation, children }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const recommendations = useSimulationStore((s) => s.daa.recommendations);
  const rec = recommendations.find((r) => r.algorithm === algorithm);

  return (
    <motion.div
      className="glass rounded-xl border border-slate-800 bg-slate-900/20 shadow-md"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Header (clickable to expand) */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-900/40 transition-all rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{explanation}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {algorithm}
          </span>
          <span className="text-xs text-slate-500">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-900/80 pt-3 space-y-4">
          {/* Main animated visualization */}
          <div className="bg-slate-950/40 p-1.5 rounded-lg border border-slate-900">
            {children}
          </div>

          {/* Recommendation */}
          {rec && (
            <div className="p-3 bg-cyan-950/25 rounded-lg border border-cyan-800/35 text-[11px]">
              <div className="text-cyan-400 font-bold uppercase mb-1 tracking-wider">Clinical Recommendation</div>
              <p className="text-slate-200 font-semibold">{rec.recommendation}</p>
              <p className="text-[10px] text-slate-400 mt-1">Rationale: {rec.reason}</p>
            </div>
          )}

          {/* Educational Explanation & Clinical Meaning */}
          <div className="space-y-2 text-[10px] text-slate-400 border-t border-slate-900 pt-3">
            <div>
              <strong className="text-slate-300">Purpose:</strong> {educational.purpose}
            </div>
            <div>
              <strong className="text-slate-300">Current Input:</strong> {Object.entries(educational.inputs).map(([k, v]) => `${k}: ${v}`).join(', ')}
            </div>
            <div>
              <strong className="text-slate-300">Current Output:</strong> {educational.result}
            </div>
            <div className="p-2 bg-slate-900/50 rounded text-cyan-300/90 leading-relaxed border-l-2 border-cyan-500">
              <strong className="text-slate-200">Clinical Interpretation:</strong> {educational.clinicalMeaning}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
