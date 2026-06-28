import { useSimulationStore } from '../../store/simulationStore';
import { CASE_STUDIES, ROOM_DEFINITIONS } from '../../data/hospitalData';
import { ROOM_IDS } from '../../types';
import type { CaseStudyId, RoomId } from '../../types';
import { Play, Pause, RotateCcw, SkipForward, Users } from 'lucide-react';

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

  return (
    <div className="glass border-t border-slate-700/50 p-2 shrink-0">
      <div className="flex flex-wrap gap-3 items-start">
        {/* Config */}
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-[10px] text-slate-400">
            Case Study
            <select
              className="block mt-0.5 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
              value={config.caseStudy}
              onChange={(e) => setConfig({ caseStudy: e.target.value as CaseStudyId })}
            >
              {Object.values(CASE_STUDIES).map((c) => (
                <option key={c.id} value={c.id}>{c.shortName} — {c.cause}</option>
              ))}
            </select>
          </label>
          <label className="text-[10px] text-slate-400">
            Starting Room
            <select
              className="block mt-0.5 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
              value={config.startingRoom}
              onChange={(e) => setStartingRoom(e.target.value as RoomId)}
            >
              {ROOM_IDS.map((id) => (
                <option key={id} value={id}>{ROOM_DEFINITIONS[id].name}</option>
              ))}
            </select>
          </label>
          <label className="text-[10px] text-slate-400">
            Patient Zero
            <select
              className="block mt-0.5 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white min-w-[80px]"
              value={config.patientZeroId ?? ''}
              onChange={(e) => setPatientZero(e.target.value)}
            >
              <option value="">Select...</option>
              {patientsInRoom.map((p) => (
                <option key={p.id} value={p.id}>{p.id}</option>
              ))}
            </select>
          </label>
          <label className="text-[10px] text-slate-400">
            Floor
            <select
              className="block mt-0.5 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
              value={activeFloor}
              onChange={(e) => useSimulationStore.setState({ activeFloor: e.target.value as 'all' | 'ground' | 'first' })}
            >
              <option value="all">All Floors</option>
              <option value="ground">Ground Floor</option>
              <option value="first">First Floor</option>
            </select>
          </label>
        </div>

        {/* Population sliders */}
        <div className="flex flex-wrap gap-2">
          {([
            ['Patients', 'numPatients', config.numPatients],
            ['Doctors', 'numDoctors', config.numDoctors],
            ['Nurses', 'numNurses', config.numNurses],
            ['Visitors', 'numVisitors', config.numVisitors],
            ['Cleaning', 'numCleaningStaff', config.numCleaningStaff],
          ] as const).map(([label, key, val]) => (
            <label key={key} className="text-[10px] text-slate-400 w-20">
              {label}: {val}
              <input
                type="range" min={1} max={30} value={val}
                className="w-full h-1"
                onChange={(e) => setConfig({ [key]: Number(e.target.value) })}
                onMouseUp={() => populateHospital()}
                onTouchEnd={() => populateHospital()}
              />
            </label>
          ))}
        </div>

        {/* Params */}
        <div className="flex flex-wrap gap-2">
          {([
            ['Crowd', 'crowdDensity', config.crowdDensity, 0.1, 1],
            ['Clean Freq', 'cleaningFrequency', config.cleaningFrequency, 1, 12],
            ['Spread', 'diseaseSpreadSpeed', config.diseaseSpreadSpeed, 0.5, 3],
            ['Budget', 'cleaningBudget', config.cleaningBudget, 20000, 200000],
            ['Teams', 'cleaningTeams', config.cleaningTeams, 1, 6],
          ] as const).map(([label, key, val, min, max]) => (
            <label key={key} className="text-[10px] text-slate-400 w-16">
              {label}
              <input
                type="range" min={min} max={max} step={key === 'crowdDensity' ? 0.1 : key === 'cleaningBudget' ? 5000 : 1}
                value={val} className="w-full h-1"
                onChange={(e) => setConfig({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
            <span>0h</span>
            <span>Timeline: {timelineHour.toFixed(1)}h</span>
            <span>24h</span>
          </div>
          <input
            type="range" min={0} max={24} step={0.1} value={timelineHour}
            className="w-full h-1"
            onChange={(e) => seekTimeline(Number(e.target.value))}
          />
        </div>

        {/* Playback */}
        <div className="flex gap-1 items-center">
          {(['1', '2', '5', '10'] as const).map((s) => (
            <button
              key={s}
              className={`px-2 py-1 text-xs rounded ${config.simulationSpeed === Number(s) ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              onClick={() => setConfig({ simulationSpeed: Number(s) })}
            >
              {s}x
            </button>
          ))}
          <button className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-500 text-xs font-medium flex items-center gap-1" onClick={startOutbreak} title="Start Outbreak">
            <Play className="w-4 h-4" /> Start Outbreak
          </button>
          <button className="px-2 py-1.5 rounded bg-slate-600 text-white text-xs" onClick={() => useSimulationStore.getState().exportReport()}>Report</button>
          <button className="p-1.5 rounded bg-yellow-600 text-white" onClick={status === 'running' ? pause : resume}>
            <Pause className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded bg-slate-600 text-white" onClick={replay}><SkipForward className="w-4 h-4" /></button>
          <button className="p-1.5 rounded bg-slate-600 text-white" onClick={reset}><RotateCcw className="w-4 h-4" /></button>
        </div>
      </div>

      {pz && (
        <div className="mt-2 flex items-center gap-3 text-xs bg-red-500/10 border border-red-500/30 rounded px-3 py-1">
          <Users className="w-4 h-4 text-red-400" />
          <span className="text-red-300 font-medium">Patient Zero: {pz.id}</span>
          <span className="text-slate-400">Room: {ROOM_DEFINITIONS[pz.roomId].name}</span>
          <span className="text-slate-400">Disease: {CASE_STUDIES[config.caseStudy].shortName}</span>
        </div>
      )}
    </div>
  );
}
