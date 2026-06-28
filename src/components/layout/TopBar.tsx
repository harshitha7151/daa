import { motion } from 'framer-motion';
import { useSimulationStore } from '../../store/simulationStore';
import { CASE_STUDIES, formatSimTime, ROOM_DEFINITIONS } from '../../data/hospitalData';
import { computeRecovery } from '../../engine/graphBuilder';
import { Activity, Shield, Clock, AlertTriangle } from 'lucide-react';

export default function TopBar() {
  const hospitalName = useSimulationStore((s) => s.hospitalName);
  const config = useSimulationStore((s) => s.config);
  const minute = useSimulationStore((s) => s.minute);
  const status = useSimulationStore((s) => s.status);
  const daa = useSimulationStore((s) => s.daa);
  const people = useSimulationStore((s) => s.people);
  const rooms = useSimulationStore((s) => s.rooms);

  const disease = CASE_STUDIES[config.caseStudy];
  const recovery = Math.round(computeRecovery(rooms, people));
  const riskLevel = daa.heap.root ? ROOM_DEFINITIONS[daa.heap.root].name : 'Low';

  const statusLabel = {
    idle: 'Standby',
    running: 'Active Outbreak',
    paused: 'Paused',
    contained: 'Contained',
    ended: 'Ended',
  }[status];

  return (
    <header className="h-12 shrink-0 glass border-b border-slate-700/50 flex items-center px-4 gap-4 text-sm">
      <div className="flex items-center gap-2 font-semibold text-cyan-400">
        <Activity className="w-4 h-4" />
        {hospitalName}
      </div>
      <div className="h-4 w-px bg-slate-600" />
      <span className="text-slate-300">Case: <strong className="text-white">{disease.shortName}</strong></span>
      <span className="flex items-center gap-1 text-slate-300">
        <Clock className="w-3.5 h-3.5" /> {formatSimTime(minute)}
      </span>
      <span className="flex items-center gap-1 text-orange-400">
        <AlertTriangle className="w-3.5 h-3.5" /> Risk: {riskLevel}
      </span>
      <span className="text-green-400 flex items-center gap-1">
        <Shield className="w-3.5 h-3.5" /> Recovery: {recovery}%
      </span>
      <motion.span
        className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
          status === 'running' ? 'bg-red-500/20 text-red-400' :
          status === 'contained' ? 'bg-green-500/20 text-green-400' :
          'bg-slate-700/50 text-slate-300'
        }`}
        animate={status === 'running' ? { opacity: [1, 0.6, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {statusLabel}
      </motion.span>
    </header>
  );
}
