import { useSimulationStore } from '../../store/simulationStore';
import { ROOM_DEFINITIONS, formatSimTime } from '../../data/hospitalData';

export default function RoomInfoPanel() {
  const selectedRoomId = useSimulationStore((s) => s.selectedRoomId);
  const rooms = useSimulationStore((s) => s.rooms);
  const daa = useSimulationStore((s) => s.daa);
  const minute = useSimulationStore((s) => s.minute);

  if (!selectedRoomId) return null;
  const room = rooms[selectedRoomId];
  const def = ROOM_DEFINITIONS[selectedRoomId];

  const algoRefs: string[] = [];
  if (daa.bfs.nextPredicted === selectedRoomId) algoRefs.push('BFS — Next predicted infection');
  if (daa.heap.root === selectedRoomId) algoRefs.push('Heap — Highest priority');
  if (daa.knapsack.selected.includes(selectedRoomId)) algoRefs.push('Knapsack — Recommended sanitization');
  if (daa.dijkstra.path.includes(selectedRoomId)) algoRefs.push('Dijkstra — On transmission route');
  if (daa.mergeSort.sorted[0]?.roomId === selectedRoomId) algoRefs.push('Merge Sort — Top contamination');

  return (
    <div className="absolute top-2 left-2 w-56 glass rounded-lg p-3 z-10 text-xs">
      <h3 className="font-semibold text-cyan-400 mb-2">{def.name}</h3>
      <div className="space-y-1 text-slate-300">
        <div>Occupancy: {room.occupancy}</div>
        <div>Patients: {room.patients.join(', ') || 'None'}</div>
        <div>Nurses: {room.nurses.join(', ') || 'None'}</div>
        <div>Doctors: {room.doctors.join(', ') || 'None'}</div>
        <div>Visitors: {room.visitors.length}</div>
        <div>Risk: {(room.contamination * 100).toFixed(0)}% ({room.riskLevel})</div>
        <div>Cleaning: {room.sanitized ? 'Sanitized' : 'Pending'}</div>
        <div>Last Sanitized: {room.lastSanitizedMinute ? formatSimTime(room.lastSanitizedMinute) : 'Never'}</div>
        {room.predictedInfectionMinute && (
          <div className="text-orange-400">Predicted infection: {formatSimTime(room.predictedInfectionMinute)}</div>
        )}
        <div className="text-green-400 mt-1">
          Action: {room.contamination > 0.3 ? 'Sanitize immediately' : room.locked ? 'Monitor isolation' : 'Continue monitoring'}
        </div>
        {algoRefs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="text-slate-500 mb-1">Algorithms:</div>
            {algoRefs.map((r) => <div key={r} className="text-cyan-400 text-[10px]">{r}</div>)}
          </div>
        )}
      </div>
      <button className="mt-2 text-[10px] text-slate-500 hover:text-white" onClick={() => useSimulationStore.getState().selectRoom(null)}>Close</button>
    </div>
  );
}

export function PersonInfoPanel() {
  const selectedPersonId = useSimulationStore((s) => s.selectedPersonId);
  const people = useSimulationStore((s) => s.people);
  const minute = useSimulationStore((s) => s.minute);
  const config = useSimulationStore((s) => s.config);

  if (!selectedPersonId) return null;
  const person = people.find((p) => p.id === selectedPersonId);
  if (!person) return null;

  return (
    <div className="absolute top-2 left-2 w-56 glass rounded-lg p-3 z-10 text-xs">
      <h3 className="font-semibold text-cyan-400 mb-2">{person.id} ({person.role})</h3>
      <div className="space-y-1 text-slate-300">
        <div>Room: {ROOM_DEFINITIONS[person.roomId].name}</div>
        <div className="capitalize">Status: <span className={
          person.status === 'infected' ? 'text-red-400' :
          person.status === 'exposed' ? 'text-orange-400' :
          person.status === 'recovered' ? 'text-green-400' : 'text-slate-300'
        }>{person.status}</span></div>
        <div>Visited: {person.visitedRooms.map((r) => ROOM_DEFINITIONS[r].name).join(' → ')}</div>
        <div>Interactions: {person.interactions.length}</div>
        <div>Transmission Prob: {(person.transmissionProb * 100).toFixed(1)}%</div>
        {person.isPatientZero && (
          <>
            <div className="text-red-400 font-medium mt-1">★ Patient Zero</div>
            <div>Disease: {config.caseStudy.toUpperCase()}</div>
            <div>Time Since Infection: {person.infectedAtMinute !== null ? formatSimTime(minute - person.infectedAtMinute) : '—'}</div>
          </>
        )}
      </div>
      <button className="mt-2 text-[10px] text-slate-500 hover:text-white" onClick={() => useSimulationStore.getState().selectPerson(null)}>Close</button>
    </div>
  );
}
