import { useSimulationStore } from '../../store/simulationStore';
import { ROOM_DEFINITIONS } from '../../data/hospitalData';
import { ROOM_IDS } from '../../types';
import type { RoomId } from '../../types';
import { Lock, Unlock, SprayCan } from 'lucide-react';

export default function HospitalControls() {
  const selectedRoomId = useSimulationStore((s) => s.selectedRoomId);
  const sanitizeRoom = useSimulationStore((s) => s.sanitizeRoom);
  const lockRoom = useSimulationStore((s) => s.lockRoom);
  const unlockRoom = useSimulationStore((s) => s.unlockRoom);

  const actions = [
    { label: 'Sanitize Room', icon: SprayCan, action: () => selectedRoomId && sanitizeRoom(selectedRoomId), disabled: !selectedRoomId },
    { label: 'Lock Room', icon: Lock, action: () => selectedRoomId && lockRoom(selectedRoomId), disabled: !selectedRoomId },
    { label: 'Unlock', icon: Unlock, action: () => selectedRoomId && unlockRoom(selectedRoomId), disabled: !selectedRoomId },
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
