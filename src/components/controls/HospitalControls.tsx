import { useSimulationStore } from '../../store/simulationStore';
import { ROOM_DEFINITIONS } from '../../data/hospitalData';
import { ROOM_IDS } from '../../types';
import type { RoomId } from '../../types';
import { Lock, Unlock, SprayCan, DoorClosed, Users, DollarSign } from 'lucide-react';

export default function HospitalControls() {
  const selectedRoomId = useSimulationStore((s) => s.selectedRoomId);
  const config = useSimulationStore((s) => s.config);
  const sanitizeRoom = useSimulationStore((s) => s.sanitizeRoom);
  const lockRoom = useSimulationStore((s) => s.lockRoom);
  const unlockRoom = useSimulationStore((s) => s.unlockRoom);
  const adjustParam = useSimulationStore((s) => s.adjustParam);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const runWhatIf = useSimulationStore((s) => s.runWhatIf);

  const actions = [
    { label: 'Sanitize Room', icon: SprayCan, action: () => selectedRoomId && sanitizeRoom(selectedRoomId), disabled: !selectedRoomId },
    { label: 'Lock Room', icon: Lock, action: () => selectedRoomId && lockRoom(selectedRoomId), disabled: !selectedRoomId },
    { label: 'Unlock', icon: Unlock, action: () => selectedRoomId && unlockRoom(selectedRoomId), disabled: !selectedRoomId },
    { label: 'Isolation +', icon: DoorClosed, action: () => { unlockRoom('isolation-ward'); setConfig({ isolationWardOpen: true }); } },
    { label: 'Isolation −', icon: DoorClosed, action: () => { lockRoom('isolation-ward'); setConfig({ isolationWardOpen: false }); } },
    { label: 'Visitors −', icon: Users, action: () => adjustParam('numVisitors', -2) },
    { label: 'Budget +', icon: DollarSign, action: () => adjustParam('cleaningBudget', 10000) },
    { label: 'Clean +', icon: SprayCan, action: () => adjustParam('cleaningFrequency', -1) },
    { label: 'Clean −', icon: SprayCan, action: () => adjustParam('cleaningFrequency', 1) },
    { label: 'Restrict Patients', icon: Lock, action: () => setConfig({ restrictPatientMovement: !config.restrictPatientMovement }) },
    { label: 'Restrict Staff', icon: Lock, action: () => setConfig({ restrictStaffMovement: !config.restrictStaffMovement }) },
  ];

  const whatIfs = [
    { label: 'Sanitize ICU', scenario: 'sanitize-icu' },
    { label: 'Close Laboratory', scenario: 'close-laboratory' },
    { label: 'More Visitors', scenario: 'more-visitors' },
    { label: 'Reduce Budget', scenario: 'reduce-budget' },
    { label: 'P0 in ICU', scenario: 'patient-zero-icu' },
    { label: 'Fast Cleaning (2h)', scenario: 'fast-cleaning' },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-1.5 glass rounded-lg border border-slate-700/50">
      {actions.map(({ label, icon: Icon, action, disabled }) => (
        <button
          key={label}
          disabled={disabled}
          onClick={action}
          className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 disabled:opacity-40 border border-slate-700"
        >
          <Icon className="w-2.5 h-2.5" /> {label}
        </button>
      ))}
      <div className="w-full h-px bg-slate-700/50 my-1" />
      <span className="text-[10px] text-cyan-400 w-full">What-If Analysis:</span>
      {whatIfs.map(({ label, scenario }) => (
        <button
          key={scenario}
          onClick={() => runWhatIf(scenario)}
          className="px-2 py-1 text-[10px] rounded bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 border border-cyan-700/30"
        >
          {label}
        </button>
      ))}
      {selectedRoomId && (
        <span className="ml-auto text-[10px] text-slate-400 self-center">
          Selected: {ROOM_DEFINITIONS[selectedRoomId].name}
        </span>
      )}
    </div>
  );
}

export function CorridorControls() {
  const selectedRoomId = useSimulationStore((s) => s.selectedRoomId);
  const toggleCorridor = useSimulationStore((s) => s.toggleCorridor);
  if (!selectedRoomId) return null;
  const neighbors = ROOM_IDS.filter((id) => id !== selectedRoomId).slice(0, 4);
  return (
    <div className="flex gap-1 px-2 pb-1">
      {neighbors.map((n) => (
        <button
          key={n}
          onClick={() => toggleCorridor(selectedRoomId, n)}
          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
        >
          Toggle {ROOM_DEFINITIONS[selectedRoomId].name} ↔ {ROOM_DEFINITIONS[n].name}
        </button>
      ))}
    </div>
  );
}
