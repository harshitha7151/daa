import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore } from '../../store/simulationStore';

const POPUP_DETAILS: Record<string, { purpose: string; why: string; recommendation: string }> = {
  BFS: {
    purpose: 'Predict where infection spreads next.',
    why: 'This room is adjacent to infected rooms with high transmission risk.',
    recommendation: 'Sanitize predicted room immediately.',
  },
  Dijkstra: {
    purpose: 'Find the most likely transmission route.',
    why: 'This route currently has the lowest transmission cost.',
    recommendation: 'Restrict movement through this route.',
  },
  'Floyd-Warshall': {
    purpose: 'Find rooms that connect many transmission routes.',
    why: 'Many shortest transmission paths pass through this node.',
    recommendation: 'Restrict access to the central hub room.',
  },
  Heap: {
    purpose: 'Find highest priority room.',
    why: 'Highest contamination score in the priority queue.',
    recommendation: 'Sanitize this room first.',
  },
  'Merge Sort': {
    purpose: 'Prioritize cleaning order.',
    why: 'Contamination sorting establishes strict ranking.',
    recommendation: 'Follow the sorted rank list for cleaning.',
  },
  Knapsack: {
    purpose: 'Choose the best rooms within the available cleaning budget.',
    why: 'Yields the maximum risk reduction achievable within budget.',
    recommendation: 'Assign cleaning teams here.',
  },
};

export default function Recommendations() {
  const recommendations = useSimulationStore((s) => s.daa.recommendations);
  const lastComparison = useSimulationStore((s) => s.lastComparison);
  const history = useSimulationStore((s) => s.recommendationHistory);
  
  const implementRecommendation = useSimulationStore((s) => s.implementRecommendation);
  const ignoreRecommendation = useSimulationStore((s) => s.ignoreRecommendation);

  const [selectedAlgo, setSelectedAlgo] = useState<string | null>(null);

  const borderColors = {
    low: 'border-slate-700',
    medium: 'border-yellow-600',
    high: 'border-orange-600',
    critical: 'border-red-655',
  };

  const badgeColors = {
    low: 'bg-slate-900 border-slate-700 text-slate-400',
    medium: 'bg-yellow-950/30 border-yellow-800 text-yellow-450',
    high: 'bg-orange-950/30 border-orange-850 text-orange-400',
    critical: 'bg-red-950/30 border-red-900 text-red-400 animate-pulse',
  };

  // 1. Startup Empty State: No user action has happened yet
  if (!lastComparison && recommendations.length === 0) {
    return (
      <div className="p-1.5 h-full overflow-y-auto scroll-thin space-y-4">
        <div>
          <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider">Decision Support</h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">No recommendations yet.</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Perform an action to begin analysis.</p>
        </div>
        
        <div className="glass rounded-xl p-3.5 border border-slate-800 space-y-2.5 text-[10px] text-slate-300 font-semibold leading-relaxed">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block border-b border-slate-850 pb-1">Examples:</span>
          <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono">
            <li>Move Patient Zero</li>
            <li>Move a Patient / Staff</li>
            <li>Sanitize a Room</li>
            <li>Lock / Unlock a Room</li>
            <li>Close Corridor</li>
            <li>Change Budget</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="p-1 h-full overflow-y-auto scroll-thin space-y-4">
      {/* Before / After Comparison Card */}
      {lastComparison && (
        <div className="bg-slate-900/90 border border-cyan-500/25 rounded-xl p-3 shadow-md shadow-cyan-950/40 space-y-1.5 animate-fadeIn">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Decision Analysis Outcome</div>
          <div className="text-[10px] text-slate-450 italic font-medium truncate">{lastComparison.actionLabel}</div>
          
          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-855 mt-1 font-mono">
            <div>
              <div className="text-slate-500 text-[8px] uppercase font-bold">Risk Level</div>
              <div className="text-xs text-white font-bold">{lastComparison.before.risk.toFixed(1)}% ➔ {lastComparison.after.risk.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-slate-500 text-[8px] uppercase font-bold">Recovery</div>
              <div className="text-xs text-white font-bold">{lastComparison.before.recovery.toFixed(0)}% ➔ {lastComparison.after.recovery.toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-slate-500 text-[8px] uppercase font-bold">Top Risk Room</div>
              <div className="text-[9px] text-white font-bold truncate" title={lastComparison.after.highestRiskRoom}>{lastComparison.after.highestRiskRoom}</div>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider">Clinical Decision Support Engine</h3>
        <p className="text-[9px] text-slate-500 mt-0.5">Recommendations recalculate only when state changes. Choose actions below.</p>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.id}
            className={`glass rounded-xl p-3 border-l-[3px] border ${borderColors[rec.priority]} space-y-2 shadow shadow-slate-950/60`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-1">
              <span 
                onClick={() => setSelectedAlgo(rec.algorithm)}
                className="text-[10px] font-extrabold text-cyan-400 uppercase font-mono tracking-wider cursor-pointer hover:underline text-left"
                title="Click to view algorithm purpose modal"
              >
                {rec.algorithm} recommendation ⓘ
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${badgeColors[rec.priority]}`}>
                {rec.priority}
              </span>
            </div>

            {/* Info Body */}
            <div className="space-y-1.5 text-[10px] text-slate-355 leading-relaxed font-semibold text-left">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[8px] block tracking-wide">Triggered By</span>
                <span className="text-slate-300">{rec.triggeredBy}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[8px] block tracking-wide">Clinical Recommendation</span>
                <span className="text-cyan-300 font-bold text-xs">{rec.recommendation}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[8px] block tracking-wide">Why (Justification)</span>
                <span className="text-slate-300">{rec.reason}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[8px] block tracking-wide">Expected Impact</span>
                <span className="text-green-450 font-bold">{rec.expectedEffect}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[8px] block tracking-wide">Affected Zones</span>
                <span className="text-slate-300 font-mono">{rec.affectedRooms.join(', ') || 'Global'}</span>
              </div>
            </div>

            {/* Cost and Time Metadata */}
            <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-455 border-t border-slate-850 pt-2 font-mono font-medium text-left">
              <div>Est. Cost: ₹{rec.estimatedCost.toLocaleString()}</div>
              <div>Est. Time: {rec.estimatedTime} mins</div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1 border-t border-slate-850">
              <button
                onClick={() => implementRecommendation(rec.id)}
                className="flex-1 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-[9px] tracking-wider transition-all shadow shadow-cyan-900/30"
              >
                IMPLEMENT
              </button>
              <button
                onClick={() => ignoreRecommendation(rec.id)}
                className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-[9px] tracking-wider transition-all"
              >
                IGNORE
              </button>
            </div>
          </motion.div>
        ))}

        {!recommendations.length && (
          <div className="text-center py-6 text-[10px] text-slate-500 italic">
            Outbreak is stable. No recommendations pending.
          </div>
        )}
      </div>

      {/* Decision / History List */}
      <div className="border-t border-slate-800/80 pt-3 mt-3 space-y-2 text-left">
        <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Decision Support Log History</div>
        <div className="space-y-2 max-h-32 overflow-y-auto scroll-thin">
          {history.map((entry, idx) => (
            <div key={idx} className="bg-slate-900/40 p-2 rounded border border-slate-855 text-[10px] space-y-0.5 text-slate-300">
              <div className="flex justify-between font-mono font-medium text-slate-550">
                <span>{entry.timeLabel}</span>
                <span className={`font-bold ${entry.action === 'Implemented' ? 'text-green-455' : 'text-red-455'}`}>{entry.action}</span>
              </div>
              <div><strong className="text-slate-450">Trigger:</strong> {entry.trigger}</div>
              <div><strong className="text-slate-455">Rec:</strong> {entry.recommendation}</div>
            </div>
          ))}
          {!history.length && <div className="text-slate-650 italic text-center py-2 text-[9px]">No historical decisions recorded yet.</div>}
        </div>
      </div>

      {/* Explanatory Popup Modal */}
      {selectedAlgo && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm z-50 p-4">
          <div className="glass max-w-sm w-full border border-cyan-500 rounded-2xl p-5 shadow-2xl space-y-4 text-xs text-slate-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono">Algorithm Details</h4>
              <button 
                onClick={() => setSelectedAlgo(null)}
                className="text-slate-500 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 font-semibold text-slate-300 text-left">
              <div>
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Algorithm</span>
                <span className="text-white font-extrabold font-mono text-xs">{selectedAlgo}</span>
              </div>
              
              <div>
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Purpose</span>
                <p className="text-slate-350 leading-relaxed">{POPUP_DETAILS[selectedAlgo]?.purpose}</p>
              </div>
              
              <div>
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Why this room?</span>
                <p className="text-slate-300 leading-relaxed font-bold">{POPUP_DETAILS[selectedAlgo]?.why}</p>
              </div>
              
              <div className="bg-cyan-950/20 border border-cyan-500/25 p-2.5 rounded-lg">
                <span className="text-[9px] text-cyan-400 font-bold block uppercase tracking-wider">Recommendation</span>
                <p className="text-cyan-300 font-extrabold leading-normal mt-0.5 text-xs text-left">
                  {POPUP_DETAILS[selectedAlgo]?.recommendation}
                </p>
              </div>
            </div>
            
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAlgo(null)}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-[9px] tracking-wider transition-all"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
