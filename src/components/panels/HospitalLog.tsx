import { useSimulationStore } from '../../store/simulationStore';

export default function HospitalLog() {
  const logs = useSimulationStore((s) => s.logs);

  const typeColor = {
    info: 'text-slate-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
    success: 'text-green-400',
    algorithm: 'text-cyan-400',
  };

  return (
    <div className="p-2 h-full overflow-y-auto scroll-thin">
      <h3 className="text-xs font-semibold text-slate-300 mb-2">Hospital Incident Log</h3>
      <div className="space-y-1">
        {logs.slice(0, 30).map((log) => (
          <div key={log.id} className="flex gap-2 text-[10px]">
            <span className="text-slate-500 shrink-0 font-mono">{log.timeLabel}</span>
            <span className={typeColor[log.type]}>{log.message}</span>
          </div>
        ))}
        {!logs.length && <p className="text-[10px] text-slate-500">No incidents logged yet.</p>}
      </div>
    </div>
  );
}
