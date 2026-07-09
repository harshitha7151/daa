import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { CASE_STUDIES, ROOM_DEFINITIONS } from '../../data/hospitalData';
import { ROOM_IDS } from '../../types';
import type { CaseStudyId, RoomId } from '../../types';
import { Users } from 'lucide-react';

export default function SimulationControls() {
  const config = useSimulationStore((s) => s.config);
  const status = useSimulationStore((s) => s.status);
  const timelineHour = useSimulationStore((s) => s.timelineHour);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const setStartingRoom = useSimulationStore((s) => s.setStartingRoom);
  const setPatientZero = useSimulationStore((s) => s.setPatientZero);
  const startOutbreak = useSimulationStore((s) => s.startOutbreak);
  const pause = useSimulationStore((s) => s.pause);
  const resume = useSimulationStore((s) => s.resume);
  const reset = useSimulationStore((s) => s.reset);
  const replay = useSimulationStore((s) => s.replay);
  const seekTimeline = useSimulationStore((s) => s.seekTimeline);
  const getPatientsInRoom = useSimulationStore((s) => s.getPatientsInRoom);
  const activeFloor = useSimulationStore((s) => s.activeFloor);
  const populateHospital = useSimulationStore((s) => s.populateHospital);

  const patientsInRoom = getPatientsInRoom(config.startingRoom);
  const pz = useSimulationStore((s) => s.people.find((p) => p.isPatientZero));

  // Collapsible cards state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    outbreak: true,
    population: true,
    cleaning: true,
    simulation: true,
  });

  const toggle = (section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto p-2">
      {/* 1. OUTBREAK CONFIGURATION */}
      <div className="glass rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <button
          className="w-full flex items-center justify-between p-4 bg-slate-900/40 text-sm font-bold text-cyan-400 select-none hover:bg-slate-900/60 transition-all"
          onClick={() => toggle('outbreak')}
        >
          <span>🏥 OUTBREAK CONFIGURATION</span>
          <span className="text-xs">{expanded.outbreak ? '▲' : '▼'}</span>
        </button>
        {expanded.outbreak && (
          <div className="p-4 bg-slate-950/20 border-t border-slate-800 space-y-4">
            {/* Outbreak Scenario Read-Only Card */}
            <div className="bg-slate-900/60 border border-slate-805 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Outbreak Scenario</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">Disease</span><span className="text-white font-extrabold">MRSA</span></div>
                <div><span className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">Transmission</span><span className="text-white font-semibold">Surface contamination & close contact</span></div>
                <div><span className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">Primary Risk</span><span className="text-white font-semibold">Delayed sanitization</span></div>
                <div><span className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">Objective</span><span className="text-cyan-305 font-semibold">Prevent spread via operational decisions</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="text-[11px] text-slate-400 font-bold block">
                Starting Room
                <select
                  className="block w-full mt-1.5 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-white"
                  value={config.startingRoom}
                  onChange={(e) => setStartingRoom(e.target.value as RoomId)}
                >
                  {ROOM_IDS.map((id) => (
                    <option key={id} value={id}>{ROOM_DEFINITIONS[id].name}</option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-slate-400 font-bold block">
                Patient Zero
                <select
                  className="block w-full mt-1.5 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-white"
                  value={config.patientZeroId ?? ''}
                  onChange={(e) => setPatientZero(e.target.value)}
                >
                  <option value="">Select...</option>
                  {patientsInRoom.map((p) => (
                    <option key={p.id} value={p.id}>{p.id}</option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-slate-400 font-bold block">
                Floor Filter
                <select
                  className="block w-full mt-1.5 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-white"
                  value={activeFloor}
                  onChange={(e) => useSimulationStore.setState({ activeFloor: e.target.value as 'all' | 'ground' | 'first' })}
                >
                  <option value="all">All Floors</option>
                  <option value="ground">Ground Floor</option>
                  <option value="first">First Floor</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 2. HOSPITAL POPULATION */}
      <div className="glass rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <button
          className="w-full flex items-center justify-between p-4 bg-slate-900/40 text-sm font-bold text-cyan-400 select-none hover:bg-slate-900/60 transition-all"
          onClick={() => toggle('population')}
        >
          <span>👥 HOSPITAL POPULATION SETUP</span>
          <span className="text-xs">{expanded.population ? '▲' : '▼'}</span>
        </button>
        {expanded.population && (
          <div className="p-4 bg-slate-950/20 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {([
              ['Patients', 'numPatients', config.numPatients],
              ['Doctors', 'numDoctors', config.numDoctors],
              ['Nurses', 'numNurses', config.numNurses],
              ['Visitors', 'numVisitors', config.numVisitors],
              ['Cleaning Staff', 'numCleaningStaff', config.numCleaningStaff],
            ] as const).map(([label, key, val]) => (
              <label key={key} className="text-[11px] text-slate-400 font-bold block">
                <div className="flex justify-between">
                  <span>{label}</span>
                  <span className="text-cyan-400 font-mono">{val}</span>
                </div>
                <input
                  type="range" min={1} max={30} value={val}
                  className="w-full mt-2 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  onChange={(e) => setConfig({ [key]: Number(e.target.value) })}
                  onMouseUp={() => populateHospital()}
                  onTouchEnd={() => populateHospital()}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 3. CLEANING PROTOCOLS */}
      <div className="glass rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <button
          className="w-full flex items-center justify-between p-4 bg-slate-900/40 text-sm font-bold text-cyan-400 select-none hover:bg-slate-900/60 transition-all"
          onClick={() => toggle('cleaning')}
        >
          <span>🧼 CLEANING PROTOCOLS & PARAMETERS</span>
          <span className="text-xs">{expanded.cleaning ? '▲' : '▼'}</span>
        </button>
        {expanded.cleaning && (
          <div className="p-4 bg-slate-950/20 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {([
              ['Crowd Density', 'crowdDensity', config.crowdDensity, 0.1, 1],
              ['Clean Freq (h)', 'cleaningFrequency', config.cleaningFrequency, 1, 12],
              ['Spread Speed', 'diseaseSpreadSpeed', config.diseaseSpreadSpeed, 0.5, 3],
              ['Budget (₹)', 'cleaningBudget', config.cleaningBudget, 20000, 200000],
              ['Cleaning Teams', 'cleaningTeams', config.cleaningTeams, 1, 6],
            ] as const).map(([label, key, val, min, max]) => (
              <label key={key} className="text-[11px] text-slate-400 font-bold block">
                <div className="flex justify-between">
                  <span>{label}</span>
                  <span className="text-cyan-400 font-mono">
                    {key === 'cleaningBudget' ? `₹${val.toLocaleString()}` : val}
                  </span>
                </div>
                <input
                  type="range" min={min} max={max} step={key === 'crowdDensity' ? 0.1 : key === 'cleaningBudget' ? 5000 : 1}
                  value={val} className="w-full mt-2 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  onChange={(e) => setConfig({ [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Manual Demo Export actions */}
      <div className="flex justify-end p-2">
        <button
          className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow"
          onClick={() => useSimulationStore.getState().exportReport()}
        >
          Export Report
        </button>
      </div>

      {/* Patient Zero Alert Card */}
      {pz && (
        <div className="flex items-center gap-3 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          <Users className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-red-300 font-semibold">Patient Zero: {pz.id}</span>
          <span className="text-slate-400 font-medium">Room: {ROOM_DEFINITIONS[pz.roomId].name}</span>
          <span className="text-slate-400 font-medium">Disease: MRSA</span>
        </div>
      )}
    </div>
  );
}
