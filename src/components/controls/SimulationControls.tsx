import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { CASE_STUDIES, ROOM_DEFINITIONS } from '../../data/hospitalData';
import { ROOM_IDS } from '../../types';
import type { CaseStudyId, RoomId } from '../../types';
import { Play, Pause, RotateCcw, SkipForward, Users } from 'lucide-react';

export function SimulationPlaybackControls() {
  const config = useSimulationStore((s) => s.config);
  const status = useSimulationStore((s) => s.status);
  const timelineHour = useSimulationStore((s) => s.timelineHour);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const startOutbreak = useSimulationStore((s) => s.startOutbreak);
  const pause = useSimulationStore((s) => s.pause);
  const resume = useSimulationStore((s) => s.resume);
  const reset = useSimulationStore((s) => s.reset);
  const replay = useSimulationStore((s) => s.replay);
  const seekTimeline = useSimulationStore((s) => s.seekTimeline);

  return (
    <div className="space-y-3 text-xs text-slate-300">
      {/* Timeline slider */}
      <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>0h</span>
          <span className="text-cyan-400 font-mono font-bold">Time: {timelineHour.toFixed(1)}h</span>
          <span>24h</span>
        </div>
        <input
          type="range" min={0} max={24} step={0.1} value={timelineHour}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          onChange={(e) => seekTimeline(Number(e.target.value))}
        />
      </div>

      {/* Playback action buttons */}
      <div className="flex flex-wrap gap-1.5 justify-center py-1">
        <button
          className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 font-bold flex items-center gap-1.5 transition-all text-[11px]"
          onClick={startOutbreak}
          disabled={status === 'running'}
        >
          <Play className="w-3.5 h-3.5" /> Start Outbreak
        </button>
        <button
          className="p-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-white transition-all"
          onClick={status === 'running' ? pause : resume}
          title={status === 'running' ? 'Pause' : 'Resume'}
        >
          <Pause className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
          onClick={replay}
          title="Replay"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
          onClick={reset}
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sim speed select */}
      <div className="flex items-center justify-between bg-slate-900/40 p-2 rounded-lg border border-slate-800/80">
        <span className="text-[10px] text-slate-400 font-bold uppercase">Sim Speed:</span>
        <div className="flex gap-1">
          {(['1', '2', '5', '10'] as const).map((s) => (
            <button
              key={s}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                config.simulationSpeed === Number(s)
                  ? 'bg-cyan-600 text-white shadow shadow-cyan-900/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              onClick={() => setConfig({ simulationSpeed: Number(s) })}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <div className="p-4 bg-slate-950/20 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <label className="text-[11px] text-slate-400 font-bold block">
              Case Study
              <select
                className="block w-full mt-1 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-white"
                value={config.caseStudy}
                onChange={(e) => setConfig({ caseStudy: e.target.value as CaseStudyId })}
              >
                {Object.values(CASE_STUDIES).map((c) => (
                  <option key={c.id} value={c.id}>{c.shortName} — {c.cause}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-slate-400 font-bold block">
              Starting Room
              <select
                className="block w-full mt-1 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-white"
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
                className="block w-full mt-1 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-white"
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
                className="block w-full mt-1 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-white"
                value={activeFloor}
                onChange={(e) => useSimulationStore.setState({ activeFloor: e.target.value as 'all' | 'ground' | 'first' })}
              >
                <option value="all">All Floors</option>
                <option value="ground">Ground Floor</option>
                <option value="first">First Floor</option>
              </select>
            </label>
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

      {/* 4. SIMULATION RUNTIME CONTROLS */}
      <div className="glass rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <button
          className="w-full flex items-center justify-between p-4 bg-slate-900/40 text-sm font-bold text-cyan-400 select-none hover:bg-slate-900/60 transition-all"
          onClick={() => toggle('simulation')}
        >
          <span>⚙ SIMULATION CONTROLS & TIMELINE</span>
          <span className="text-xs">{expanded.simulation ? '▲' : '▼'}</span>
        </button>
        {expanded.simulation && (
          <div className="p-4 bg-slate-950/20 border-t border-slate-800 space-y-4">
            {/* Timeline Slider */}
            <div className="p-3 bg-slate-900/40 rounded border border-slate-800/80">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                <span>0h</span>
                <span className="text-cyan-400 font-mono font-bold">Sim Timeline: {timelineHour.toFixed(1)}h</span>
                <span>24h</span>
              </div>
              <input
                type="range" min={0} max={24} step={0.1} value={timelineHour}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                onChange={(e) => seekTimeline(Number(e.target.value))}
              />
            </div>

            {/* Speeds & Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Playback Buttons */}
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                  onClick={startOutbreak}
                  title="Start Outbreak"
                >
                  <Play className="w-3.5 h-3.5" /> Start Outbreak
                </button>
                <button
                  className="p-2 rounded bg-yellow-600 hover:bg-yellow-500 text-white transition-all"
                  onClick={status === 'running' ? pause : resume}
                  title={status === 'running' ? 'Pause' : 'Resume'}
                >
                  <Pause className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  onClick={replay}
                  title="Replay"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  onClick={reset}
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Sim Speeds */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Speed:</span>
                <div className="flex gap-1">
                  {(['1', '2', '5', '10'] as const).map((s) => (
                    <button
                      key={s}
                      className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                        config.simulationSpeed === Number(s)
                          ? 'bg-cyan-600 text-white shadow shadow-cyan-900/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                      onClick={() => setConfig({ simulationSpeed: Number(s) })}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <button
                className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow"
                onClick={() => useSimulationStore.getState().exportReport()}
              >
                Export Report
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Zero Alert Card */}
      {pz && (
        <div className="flex items-center gap-3 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          <Users className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-red-300 font-semibold">Patient Zero: {pz.id}</span>
          <span className="text-slate-400 font-medium">Room: {ROOM_DEFINITIONS[pz.roomId].name}</span>
          <span className="text-slate-400 font-medium">Disease: {CASE_STUDIES[config.caseStudy].shortName}</span>
        </div>
      )}
    </div>
  );
}
