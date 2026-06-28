import { useSimulationStore } from '../../store/simulationStore';
import { ROOM_DEFINITIONS, formatSimTime } from '../../data/hospitalData';
import { computeRiskScore } from '../../engine/graphBuilder';
import { ROOM_IDS } from '../../types';

function Gauge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="text-center">
      <div className="relative w-14 h-14 mx-auto">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">{Math.round(value)}</span>
      </div>
      <div className="text-[9px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

export default function MetricsDashboard() {
  const people = useSimulationStore((s) => s.people);
  const rooms = useSimulationStore((s) => s.rooms);
  const config = useSimulationStore((s) => s.config);
  const minute = useSimulationStore((s) => s.minute);
  const budgetUsed = useSimulationStore((s) => s.budgetUsed);
  const daa = useSimulationStore((s) => s.daa);
  const riskTrend = useSimulationStore((s) => s.riskTrend);
  const recoveryTrend = useSimulationStore((s) => s.recoveryTrend);

  const patients = people.filter((p) => p.role === 'patient');
  const infected = people.filter((p) => p.status === 'infected');
  const roomsInfected = ROOM_IDS.filter((id) => rooms[id].contamination > 0.3).length;
  const risk = computeRiskScore(rooms, people);
  const recovery = Math.round(people.filter((p) => p.status === 'healthy').length / Math.max(1, people.length) * 100);
  const occupancy = Math.round(ROOM_IDS.reduce((s, id) => s + rooms[id].occupancy, 0) / ROOM_IDS.length * 10);
  const r0 = (infected.length / Math.max(1, patients.length) * 2.5).toFixed(2);

  return (
    <div className="p-2 border-b border-slate-700/30">
      <div className="grid grid-cols-6 gap-1 text-[10px] mb-2">
        {[
          ['Patients', patients.length],
          ['Doctors', people.filter((p) => p.role === 'doctor').length],
          ['Nurses', people.filter((p) => p.role === 'nurse').length],
          ['Visitors', people.filter((p) => p.role === 'visitor').length],
          ['Infected', infected.length],
          ['Rooms Inf.', roomsInfected],
        ].map(([l, v]) => (
          <div key={l as string} className="bg-slate-800/50 rounded p-1 text-center">
            <div className="text-slate-500">{l}</div>
            <div className="text-white font-medium">{v}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-around">
        <Gauge label="Infection" value={risk / 100} max={1} color="#ef4444" />
        <Gauge label="Recovery" value={recovery} max={100} color="#22c55e" />
        <Gauge label="Cleaning" value={config.cleaningTeams * 15} max={100} color="#06b6d4" />
        <Gauge label="Occupancy" value={occupancy} max={100} color="#a78bfa" />
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2 text-[9px]">
        <div className="text-slate-400">R₀ Index: <span className="text-orange-400">{r0}</span></div>
        <div className="text-slate-400">Risk: <span className={riskTrend === 'increasing' ? 'text-red-400' : riskTrend === 'decreasing' ? 'text-green-400' : 'text-yellow-400'}>{riskTrend}</span></div>
        <div className="text-slate-400">Recovery: <span className="text-green-400">{recoveryTrend}</span></div>
        <div className="text-slate-400">Budget: ₹{(config.cleaningBudget - budgetUsed).toLocaleString()}</div>
        <div className="text-slate-400">Next: {daa.bfs.nextPredicted ? ROOM_DEFINITIONS[daa.bfs.nextPredicted].name : '—'}</div>
        <div className="text-slate-400">Time: {formatSimTime(minute)}</div>
      </div>
    </div>
  );
}

export function OutbreakDashboard() {
  const config = useSimulationStore((s) => s.config);
  const daa = useSimulationStore((s) => s.daa);
  const people = useSimulationStore((s) => s.people);
  const pz = people.find((p) => p.isPatientZero);

  return (
    <div className="px-2 py-1 text-[10px] grid grid-cols-4 gap-2 bg-slate-900/50">
      <div><span className="text-slate-500">Disease:</span> {config.caseStudy.toUpperCase()}</div>
      <div><span className="text-slate-500">Patient Zero:</span> {pz?.id ?? '—'}</div>
      <div><span className="text-slate-500">Highest Risk:</span> {daa.heap.root ? ROOM_DEFINITIONS[daa.heap.root].name : '—'}</div>
      <div><span className="text-slate-500">Algorithm:</span> {daa.currentAlgorithm}</div>
    </div>
  );
}

export function ComparisonPanel() {
  const minute = useSimulationStore((s) => s.minute);
  const snapLen = useSimulationStore((s) => s.snapshots.length);
  const baseLen = useSimulationStore((s) => s.baselineSnapshots.length);
  const comparison = useSimulationStore.getState().getComparison();
  void minute; void snapLen; void baseLen;
  const { baseline, current, improvements } = comparison;

  return (
    <div className="p-2 border-t border-slate-700/30">
      <h3 className="text-xs font-semibold text-cyan-400 mb-2">Outbreak Comparison</h3>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="glass rounded p-2">
          <div className="text-slate-400 mb-1">Predicted (No Intervention)</div>
          <div>Rooms: {baseline.roomsInfected} | Patients: {baseline.patientsInfected}</div>
          <div>Infection: {baseline.infectionPercent.toFixed(1)}% | Recovery: {baseline.recoveryPercent.toFixed(1)}%</div>
        </div>
        <div className="glass rounded p-2 border border-cyan-500/30">
          <div className="text-cyan-400 mb-1">Current (With Decisions)</div>
          <div>Rooms: {current.roomsInfected} | Patients: {current.patientsInfected}</div>
          <div>Infection: {current.infectionPercent.toFixed(1)}% | Recovery: {current.recoveryPercent.toFixed(1)}%</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 mt-2 text-[10px]">
        <div className="text-green-400">Rooms Saved: +{improvements.roomsSaved}</div>
        <div className="text-green-400">Risk ↓ {improvements.riskReduced.toFixed(0)}%</div>
        <div className="text-green-400">Containment: {improvements.containmentTimeImproved.toFixed(1)}h</div>
        <div className="text-green-400">Cost Saved: ₹{improvements.cleaningCostSaved.toLocaleString()}</div>
      </div>
    </div>
  );
}

export function SmartTimeline() {
  const timeline = useSimulationStore((s) => s.timeline);
  return (
    <div className="p-2 h-full overflow-x-auto overflow-y-hidden scroll-thin">
      <h3 className="text-[10px] font-semibold text-cyan-400 mb-1">Hospital Timeline</h3>
      <div className="flex gap-3 min-w-max">
        {timeline.slice(-12).map((ev) => (
          <div key={ev.id} className="flex flex-col text-[10px] shrink-0 border-l border-slate-600 pl-2">
            <span className="text-cyan-400 font-mono font-medium">{ev.timeLabel}</span>
            <span className="text-slate-300 max-w-[140px]">{ev.message}</span>
          </div>
        ))}
        {!timeline.length && <span className="text-[10px] text-slate-500">Timeline updates as simulation runs...</span>}
      </div>
    </div>
  );
}
