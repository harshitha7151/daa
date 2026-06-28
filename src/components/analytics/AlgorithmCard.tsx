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
  const recommendations = useSimulationStore((s) => s.daa.recommendations);
  const rec = recommendations.find((r) => r.algorithm === algorithm);

  return (
    <motion.div
      className="glass rounded-xl p-4 border border-slate-800 bg-slate-900/20"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{algorithm}</span>
      </div>
      <p className="text-[11px] text-slate-400 mb-3">{explanation}</p>
      
      <div className="my-3">
        {children}
      </div>

      {rec && (
        <div className="mt-3 p-2 bg-cyan-950/20 rounded border border-cyan-800/30 text-[10px]">
          <div className="text-cyan-400 font-bold uppercase mb-0.5">Recommendation</div>
          <p className="text-slate-200 font-medium">{rec.recommendation}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Reason: {rec.reason}</p>
        </div>
      )}

      <details className="mt-3 border-t border-slate-800/80 pt-2">
        <summary className="text-[10px] text-cyan-500 font-semibold cursor-pointer select-none">
          Educational Mode & Clinical Info
        </summary>
        <div className="mt-2 space-y-1.5 text-[10px] text-slate-400">
          <p><strong className="text-slate-300">Purpose:</strong> {educational.purpose}</p>
          <p><strong className="text-slate-300">Inputs:</strong> {Object.entries(educational.inputs).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>
          <p><strong className="text-slate-300">Result:</strong> {educational.result}</p>
          <p className="text-cyan-400/90"><strong className="text-slate-300">Clinical Meaning:</strong> {educational.clinicalMeaning}</p>
        </div>
      </details>
    </motion.div>
  );
}
