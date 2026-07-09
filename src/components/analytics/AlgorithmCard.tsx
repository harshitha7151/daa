import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  algorithm: string;
  purpose: string;
  question: string;
  answer: string;
  reason: string;
  recommendation: string;
  expectedOutcome: string;
  children: React.ReactNode;
}

export default function AlgorithmCard({
  algorithm,
  purpose,
  question,
  answer,
  reason,
  recommendation,
  expectedOutcome,
  children,
}: Props) {
  const [showTech, setShowTech] = useState(false);

  return (
    <motion.div
      className="glass rounded-xl border border-slate-800 bg-slate-900/20 shadow-md p-4 space-y-3 text-xs leading-relaxed text-left text-slate-300"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-805 pb-1.5">
        <span className="font-extrabold text-[10px] text-cyan-400 uppercase tracking-widest font-mono">Algorithm: {algorithm}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/20 text-cyan-400 border border-cyan-850">Clinical Analysis</span>
      </div>

      {/* Main Details */}
      <div className="space-y-2">
        <div>
          <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Purpose</span>
          <span className="text-slate-200 font-medium">{purpose}</span>
        </div>

        <div>
          <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Question</span>
          <span className="text-slate-300 font-bold italic">{question}</span>
        </div>

        <div>
          <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Answer</span>
          <span className="text-white font-extrabold text-sm font-mono block text-cyan-305 mt-0.5 leading-snug">{answer}</span>
        </div>

        <div>
          <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Reason</span>
          <span className="text-slate-250 font-medium">{reason}</span>
        </div>

        <div className="bg-cyan-950/20 border border-cyan-900/30 p-2.5 rounded-lg">
          <span className="text-[8px] text-cyan-400 font-bold block uppercase tracking-wider">Recommendation</span>
          <span className="text-cyan-300 font-bold text-xs block leading-snug mt-0.5">{recommendation}</span>
        </div>

        <div>
          <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Expected Outcome</span>
          <span className="text-green-400 font-bold">{expectedOutcome}</span>
        </div>
      </div>

      {/* Collapsible section */}
      <div className="pt-2 border-t border-slate-850">
        <button
          onClick={() => setShowTech(!showTech)}
          className="w-full flex items-center justify-between text-[8px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest transition-all"
        >
          <span>{showTech ? 'Hide Technical Details' : 'Show Technical Details / Developer View'}</span>
          <span>{showTech ? '▲' : '▼'}</span>
        </button>

        {showTech && (
          <motion.div
            className="mt-2.5 bg-slate-950/45 p-2 rounded border border-slate-900/50 overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
