import { motion } from 'framer-motion';
import type { AlgorithmEducational } from '../../types';

interface Props {
  title: string;
  algorithm: string;
  educational: AlgorithmEducational;
  explanation: string;
  children: React.ReactNode;
}

export default function AlgorithmCard({ title, algorithm, educational, explanation, children }: Props) {
  return (
    <motion.div
      className="glass rounded-lg p-2"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-white">{title}</h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">{algorithm}</span>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">{explanation}</p>
      {children}
      <details className="mt-2">
        <summary className="text-[10px] text-cyan-400 cursor-pointer">Educational Mode</summary>
        <div className="mt-1 space-y-1 text-[10px] text-slate-400">
          <p><strong className="text-slate-300">Purpose:</strong> {educational.purpose}</p>
          <p><strong className="text-slate-300">Inputs:</strong> {Object.entries(educational.inputs).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>
          <p><strong className="text-slate-300">Result:</strong> {educational.result}</p>
          <p><strong className="text-slate-300">Clinical Meaning:</strong> {educational.clinicalMeaning}</p>
        </div>
      </details>
    </motion.div>
  );
}
