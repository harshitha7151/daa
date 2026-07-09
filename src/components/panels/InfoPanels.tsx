import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { ROOM_DEFINITIONS, formatSimTime } from '../../data/hospitalData';
import { ROOM_IDS } from '../../types';
import type { RoomId } from '../../types';

export default function RoomInfoPanel() {
  const selectedRoomId = useSimulationStore((s) => s.selectedRoomId);
  const rooms = useSimulationStore((s) => s.rooms);
  const people = useSimulationStore((s) => s.people);
  const daa = useSimulationStore((s) => s.daa);
  const minute = useSimulationStore((s) => s.minute);

  if (!selectedRoomId) return null;
  const room = rooms[selectedRoomId];
  const def = ROOM_DEFINITIONS[selectedRoomId];

  const algoRefs: string[] = [];
  if (daa.bfs.nextPredicted === selectedRoomId) algoRefs.push('BFS — Predicted Next Infection');
  if (daa.heap.root === selectedRoomId) algoRefs.push('Heap — Highest Priority');
  if (daa.knapsack.selected.includes(selectedRoomId)) algoRefs.push('Knapsack — Recommended for Sanitization');
  if (daa.dijkstra.path.includes(selectedRoomId)) algoRefs.push('Dijkstra — Transmission Path');
  if (daa.mergeSort.sorted[0]?.roomId === selectedRoomId) algoRefs.push('Merge Sort — Priority Rank #1');

  const activeRecs = daa.recommendations.filter(r => r.affectedRooms.includes(selectedRoomId));

  const renderPeopleList = (label: string, ids: string[]) => {
    if (!ids || ids.length === 0) return <div className="text-[10px] text-slate-500">{label} (0): None</div>;
    return (
      <div className="space-y-0.5 border-b border-slate-800/40 pb-1.5 last:border-b-0">
        <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wide">{label} ({ids.length})</div>
        <div className="pl-2.5 space-y-0.5 max-h-20 overflow-y-auto scroll-thin">
          {ids.map((id) => {
            const p = people.find((x) => x.id === id);
            const status = p ? p.status : 'unknown';
            const statusColor = 
              status === 'infected' ? 'text-red-400 font-bold' :
              status === 'exposed' ? 'text-orange-400 font-bold' :
              status === 'recovered' ? 'text-green-400 font-bold' : 'text-slate-300';
            return (
              <div key={id} className="flex justify-between text-[10px] font-mono leading-tight">
                <span>{id}</span>
                <span className={`capitalize text-[9px] ${statusColor}`}>{status}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute top-2 left-2 w-64 glass rounded-lg p-3 z-10 text-xs shadow-2xl max-h-[85vh] overflow-y-auto scroll-thin">
      <h3 className="font-bold text-cyan-400 mb-2.5 text-sm uppercase tracking-wider">{def.name}</h3>
      <div className="space-y-2.5 text-slate-300">
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold text-slate-450 font-mono border-b border-slate-800/80 pb-2">
          <div>Occupancy: <span className="text-white font-bold">{room.occupancy}</span></div>
          <div>Risk: <span className="text-white font-bold">{(room.contamination * 100).toFixed(0)}%</span></div>
          <div>Cleaning: <span className="text-white font-bold">{room.sanitized ? 'Sanitized' : 'Pending'}</span></div>
          <div>Last Clean: <span className="text-white font-bold">{room.lastSanitizedMinute ? formatSimTime(room.lastSanitizedMinute) : 'Never'}</span></div>
        </div>

        {/* Occupant Lists by Role */}
        <div className="space-y-2 pt-1">
          {renderPeopleList('Patients', room.patients)}
          {renderPeopleList('Doctors', room.doctors)}
          {renderPeopleList('Nurses', room.nurses)}
          {renderPeopleList('Visitors', room.visitors)}
          {renderPeopleList('Cleaning Staff', room.cleaningStaff || [])}
        </div>

        {/* Manual Controls */}
        <div className="pt-2 border-t border-slate-800 space-y-2 mt-2">
          <label className="text-[9px] text-slate-450 font-bold block uppercase tracking-wider">
            Manual Contamination
            <div className="flex gap-2 items-center mt-1">
              <input
                type="range" min="0" max="100" value={Math.round(room.contamination * 100)}
                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  useSimulationStore.getState().manuallySetContamination(selectedRoomId, val);
                }}
              />
              <span className="font-mono text-cyan-450 w-8 text-right">{Math.round(room.contamination * 100)}%</span>
            </div>
          </label>

          <div className="flex gap-2 items-center justify-between text-[9px] font-bold text-slate-455 mt-2">
            <span className="uppercase tracking-wider">Manual Occupancy</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => useSimulationStore.getState().manuallyAdjustOccupancy(selectedRoomId, 1)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-bold"
              >
                + Patient
              </button>
              <button
                onClick={() => useSimulationStore.getState().manuallyAdjustOccupancy(selectedRoomId, -1)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-bold"
                disabled={room.patients.length === 0}
              >
                - Patient
              </button>
            </div>
          </div>
        </div>

        {/* Algorithms active */}
        {algoRefs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800">
            <div className="text-slate-500 font-bold text-[9px] uppercase tracking-wider mb-1">Algorithms Referencing Room:</div>
            {algoRefs.map((r) => <div key={r} className="text-cyan-405 font-mono text-[9px] leading-tight">• {r}</div>)}
          </div>
        )}

        {/* Recommendations active */}
        {activeRecs.length > 0 ? (
          <div className="mt-2 pt-2 border-t border-slate-850">
            <div className="text-slate-500 font-bold text-[9px] uppercase tracking-wider mb-1">Current Recommendation:</div>
            {activeRecs.map((r) => (
              <div key={r.id} className="text-green-400 font-bold text-[10px] leading-snug">
                • {r.recommendation} ({r.algorithm})
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-slate-850 text-slate-500 text-[9px] italic">
            No active clinical recommendations for this room.
          </div>
        )}
      </div>
      <button className="mt-3 text-[10px] text-slate-550 hover:text-white block w-full text-center border border-slate-800 py-1 rounded bg-slate-900 hover:bg-slate-850" onClick={() => useSimulationStore.getState().selectRoom(null)}>Close Room View</button>
    </div>
  );
}

export function PersonInfoPanel() {
  const selectedPersonId = useSimulationStore((s) => s.selectedPersonId);
  const people = useSimulationStore((s) => s.people);
  const config = useSimulationStore((s) => s.config);

  const [targetRoom, setTargetRoom] = useState<RoomId>('ward-1');

  if (!selectedPersonId) return null;
  const person = people.find((p) => p.id === selectedPersonId);
  if (!person) return null;

  const currentDestName = person.targetRoomId ? ROOM_DEFINITIONS[person.targetRoomId].name : 'None';

  return (
    <div className="absolute top-2 left-2 w-64 glass rounded-lg p-3.5 z-10 text-xs shadow-2xl">
      <h3 className="font-extrabold text-cyan-400 mb-2.5 text-sm">{person.id}</h3>
      <div className="space-y-2 text-slate-355">
        <div><strong>Role:</strong> <span className="capitalize">{person.role}</span></div>
        <div><strong>Current Room:</strong> {ROOM_DEFINITIONS[person.roomId].name}</div>
        <div>
          <strong>Health Status:</strong>{' '}
          <span className={`capitalize font-bold ${
            person.status === 'infected' ? 'text-red-400 font-extrabold' :
            person.status === 'exposed' ? 'text-orange-450 font-extrabold' :
            person.status === 'recovered' ? 'text-green-400' : 'text-slate-300'
          }`}>
            {person.status}
          </span>
        </div>
        <div><strong>Current Target:</strong> {currentDestName}</div>

        {person.isPatientZero && (
          <div className="border border-red-500/30 rounded p-1.5 bg-red-950/20 my-1 text-[10px]">
            <div className="text-red-400 font-bold">★ Patient Zero</div>
            <div>Disease: MRSA</div>
          </div>
        )}

        <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
          <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
            Select Destination Room
            <select
              className="block w-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white"
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value as RoomId)}
            >
              {ROOM_IDS.map((id) => (
                <option key={id} value={id}>{ROOM_DEFINITIONS[id].name}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => useSimulationStore.getState().assignManualPath(person.id, targetRoom)}
            className="w-full mt-1.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all text-xs shadow-md shadow-cyan-900/30"
          >
            Move
          </button>
        </div>
      </div>
      <button 
        className="mt-3 text-[10px] text-slate-500 hover:text-white block border-t border-slate-850 pt-2 w-full text-left" 
        onClick={() => useSimulationStore.getState().selectPerson(null)}
      >
        Close Panel
      </button>
    </div>
  );
}
