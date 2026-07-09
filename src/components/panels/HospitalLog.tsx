import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

export default function HospitalLog() {
  const logs = useSimulationStore((s) => s.logs);
  const tickExplanations = useSimulationStore((s) => s.tickExplanations);
  const [activeSubTab, setActiveSubTab] = useState<'incidents' | 'explanations'>('explanations');

  const typeColor = {
    info: 'text-slate-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
    success: 'text-green-400',
    algorithm: 'text-cyan-400',
  };

  return (
    <div className="p-2 h-full flex flex-col min-h-0 text-xs">
      <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-1.5 shrink-0">
        <h3 className="text-[10px] font-bold text-cyan-400 tracking-wide uppercase">Simulation Engine Logs</h3>
        <div className="flex gap-1 bg-slate-900/60 p-0.5 rounded border border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('explanations')}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
              activeSubTab === 'explanations'
                ? 'bg-cyan-600 text-white shadow shadow-cyan-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Explanations
          </button>
          <button
            onClick={() => setActiveSubTab('incidents')}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
              activeSubTab === 'incidents'
                ? 'bg-cyan-600 text-white shadow shadow-cyan-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Incidents
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin space-y-1.5 pr-1">
        {activeSubTab === 'explanations' ? (
          <>
            {tickExplanations.map((exp, idx) => (
              <div key={idx} className="text-[10px] text-slate-300 border-l border-cyan-500 pl-2 py-1 bg-slate-900/10 rounded-r leading-relaxed">
                {exp}
              </div>
            ))}
            {!tickExplanations.length && (
              <p className="text-[10px] text-slate-500">No explanations generated yet. Start the outbreak to view tick details.</p>
            )}
          </>
        ) : (
          <>
            {logs.slice(0, 50).map((log) => (
              <div key={log.id} className="flex gap-2 text-[10px] leading-relaxed">
                <span className="text-slate-500 shrink-0 font-mono font-medium">{log.timeLabel}</span>
                <span className={typeColor[log.type]}>{log.message}</span>
              </div>
            ))}
            {!logs.length && <p className="text-[10px] text-slate-500">No incidents logged yet.</p>}
          </>
        )}
      </div>
    </div>
  );
}
