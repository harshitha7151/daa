import { useEffect, useRef, useState } from 'react';
import TopBar from './components/layout/TopBar';
import HospitalScene, { TwinExplanationOverlay } from './components/twin/HospitalScene';
import DaaConsole from './components/analytics/DaaConsole';
import SimulationControls from './components/controls/SimulationControls';
import HospitalControls from './components/controls/HospitalControls';
import Recommendations from './components/panels/Recommendations';
import HospitalLog from './components/panels/HospitalLog';
import MetricsDashboard, { SmartTimeline } from './components/panels/MetricsDashboard';
import RoomInfoPanel, { PersonInfoPanel } from './components/panels/InfoPanels';
import OutbreakReportModal from './components/panels/OutbreakReport';
import { useSimulationStore } from './store/simulationStore';
import { ROOM_DEFINITIONS } from './data/hospitalData';

function SimulationLoop() {
  const tick = useSimulationStore((s) => s.tick);
  const status = useSimulationStore((s) => s.status);

  useEffect(() => {
    if (status !== 'running') return;
    let frame: number;
    let last = performance.now();
    const loop = (now: number) => {
      tick((now - last) / 1000 * 2.5); // Animation LERP updates
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [status, tick]);

  return null;
}

function DemoControllerPanel() {
  const config = useSimulationStore((s) => s.config);
  const status = useSimulationStore((s) => s.status);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const setPatientZero = useSimulationStore((s) => s.setPatientZero);
  const startOutbreak = useSimulationStore((s) => s.startOutbreak);
  const reset = useSimulationStore((s) => s.reset);
  const stepTick = useSimulationStore((s) => s.stepTick);
  const getPatientsInRoom = useSimulationStore((s) => s.getPatientsInRoom);
  const people = useSimulationStore((s) => s.people);

  const patientsInRoom = getPatientsInRoom(config.startingRoom);
  const pz = people.find((p) => p.isPatientZero);

  return (
    <div className="glass rounded-xl border border-slate-800 p-3 shadow shadow-slate-900/35 space-y-3">
      <h3 className="text-[10px] font-bold text-cyan-400 tracking-wide uppercase">Outbreak Demo Controller</h3>
      
      {status === 'idle' ? (
        <div className="space-y-2.5">
          <label className="text-[10px] text-slate-400 font-bold block">
            Selected Pathogen
            <div className="block w-full mt-1 bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white font-bold">
              MRSA (Methicillin-resistant Staphylococcus aureus)
            </div>
          </label>

          <label className="text-[10px] text-slate-400 font-bold block">
            2. Select Patient Zero
            <select
              className="block w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              value={config.patientZeroId ?? ''}
              onChange={(e) => setPatientZero(e.target.value)}
            >
              <option value="">Choose Patient...</option>
              {patientsInRoom.map((p) => (
                <option key={p.id} value={p.id}>{p.id} (Room: {ROOM_DEFINITIONS[p.roomId].name})</option>
              ))}
            </select>
          </label>

          <button
            onClick={startOutbreak}
            disabled={!config.patientZeroId}
            className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all text-xs disabled:opacity-40"
          >
            Start Demonstration
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="text-[10px] bg-red-950/20 border border-red-500/20 rounded p-2 text-slate-350 space-y-1 font-semibold">
            <div><span className="text-red-400 font-bold">Pathogen:</span> MRSA</div>
            <div><span className="text-slate-400 font-medium">Patient Zero:</span> {pz?.id ?? 'N/A'} ({pz ? ROOM_DEFINITIONS[pz.roomId].name : ''})</div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={stepTick}
              className="py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all text-xs"
            >
              Next Tick (+5m)
            </button>
            <button
              onClick={reset}
              className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all text-xs"
            >
              Reset Outbreak
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const populateHospital = useSimulationStore((s) => s.populateHospital);
  const initialized = useRef(false);
  const [activeTab, setActiveTab] = useState<'twin' | 'config' | 'daa'>('twin');

  const disappearedPeople = useSimulationStore((s) => s.disappearedPeople);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      populateHospital();
    }
  }, [populateHospital]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden">
      <TopBar />

      {/* Tabs Menu */}
      <div className="flex bg-slate-900 border-b border-slate-800 px-4 py-1.5 gap-2 shrink-0">
        <button
          className={`px-4 py-1 text-xs font-semibold rounded-md transition-all duration-205 ${
            activeTab === 'twin'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('twin')}
        >
          🏥 SMART DIGITAL TWIN
        </button>
        <button
          className={`px-4 py-1 text-xs font-semibold rounded-md transition-all duration-205 ${
            activeTab === 'config'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('config')}
        >
          ⚙ SIMULATION CONFIGURATION
        </button>
        <button
          className={`px-4 py-1 text-xs font-semibold rounded-md transition-all duration-205 ${
            activeTab === 'daa'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('daa')}
        >
          🧠 DAA ANALYTICS LAB
        </button>
      </div>

      {activeTab === 'twin' ? (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Panel: 3D Hospital Viewport (takes ~72%) */}
          <div className="w-[72%] relative min-h-0 flex flex-col border-r border-slate-800">
            <HospitalScene />
            <TwinExplanationOverlay />
            <RoomInfoPanel />
            <PersonInfoPanel />
            <div className="absolute top-2 right-2 z-10 max-w-xs">
              <HospitalControls />
            </div>
          </div>

          {/* Right Panel: Controls & Telemetry Dashboard (takes ~28%) */}
          <div className="w-[28%] min-h-0 flex flex-col bg-slate-950 p-3 overflow-y-auto gap-3 scroll-thin">
            {/* Outbreak Demo Controller Card */}
            <DemoControllerPanel />

            {/* Recommendations Panel (Dominant focal panel) */}
            <div className="glass rounded-xl border border-slate-800 p-2.5 shadow flex-1 min-h-[380px] overflow-y-auto scroll-thin">
              <Recommendations />
            </div>

            {/* Metrics Dashboard / Status Panel (contains gauges & counts) */}
            <div className="glass rounded-xl border border-slate-800 p-2 shadow">
              <MetricsDashboard />
            </div>

            {/* Hospital Timeline */}
            <div className="glass rounded-xl border border-slate-800 p-2 shadow min-h-[70px] max-h-[110px] overflow-y-auto scroll-thin">
              <SmartTimeline />
            </div>

            {/* Incident Log */}
            <div className="glass rounded-xl border border-slate-800 p-2 shadow min-h-[120px] max-h-[170px] overflow-y-auto scroll-thin">
              <HospitalLog />
            </div>
          </div>
        </div>
      ) : activeTab === 'config' ? (
        /* TAB 2: SIMULATION CONFIGURATION */
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 scroll-thin">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="border-b border-slate-850 pb-4">
              <h2 className="text-xl font-extrabold text-cyan-400">Simulation Configuration Panel</h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize case studies, disease transmission vectors, personnel counts, and sanitize protocols prior to execution.
              </p>
            </div>
            <SimulationControls />
          </div>
        </div>
      ) : (
        /* TAB 3: DAA ANALYTICS LAB */
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 scroll-thin">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="border-b border-slate-850 pb-4">
              <h2 className="text-xl font-extrabold text-cyan-400">DAA Analytics Lab</h2>
              <p className="text-xs text-slate-400 mt-1">
                Explore real-time algorithmic execution, priority heaps, shortest path routing, and knapsack resource allocations.
              </p>
            </div>
            <DaaConsole />
          </div>
        </div>
      )}

      {disappearedPeople && disappearedPeople.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-80 glass border border-red-500 rounded-xl p-4 shadow-2xl bg-red-950/20 max-h-72 overflow-y-auto scroll-thin">
          <div className="flex items-center justify-between border-b border-red-900/60 pb-2 mb-2">
            <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              <span>⚠️ Character Disappearing Debugger</span>
            </h4>
            <span className="text-[9px] bg-red-950 border border-red-800 text-red-300 px-1.5 py-0.2 rounded font-bold">
              {disappearedPeople.length} Warning(s)
            </span>
          </div>
          <div className="space-y-3">
            {disappearedPeople.map((p) => (
              <div key={p.id} className="text-[10px] bg-slate-950/65 p-2 rounded border border-red-950 space-y-1 text-slate-300">
                <div><strong className="text-red-400">ID:</strong> {p.id}</div>
                <div><strong className="text-slate-400">Reason:</strong> {p.reason}</div>
                <div><strong className="text-slate-400">Position:</strong> [{p.position.map((n: number) => n.toFixed(2)).join(', ')}]</div>
                <div><strong className="text-slate-400">Target:</strong> {p.target}</div>
                <div><strong className="text-slate-400">Path:</strong> {p.path.join(' → ') || 'Empty'}</div>
                <div><strong className="text-slate-400">Step:</strong> {p.step}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <OutbreakReportModal />
      <SimulationLoop />
    </div>
  );
}
