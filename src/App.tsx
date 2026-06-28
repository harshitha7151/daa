import { useEffect, useRef, useState } from 'react';
import TopBar from './components/layout/TopBar';
import HospitalScene, { TwinExplanationOverlay } from './components/twin/HospitalScene';
import DaaConsole from './components/analytics/DaaConsole';
import SimulationControls, { SimulationPlaybackControls } from './components/controls/SimulationControls';
import HospitalControls from './components/controls/HospitalControls';
import Recommendations from './components/panels/Recommendations';
import HospitalLog from './components/panels/HospitalLog';
import MetricsDashboard, { SmartTimeline } from './components/panels/MetricsDashboard';
import RoomInfoPanel, { PersonInfoPanel } from './components/panels/InfoPanels';
import OutbreakReportModal from './components/panels/OutbreakReport';
import { useSimulationStore } from './store/simulationStore';

function SimulationLoop() {
  const tick = useSimulationStore((s) => s.tick);
  const status = useSimulationStore((s) => s.status);

  useEffect(() => {
    if (status !== 'running') return;
    let frame: number;
    let last = performance.now();
    const loop = (now: number) => {
      tick((now - last) / 1000 * 2);
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [status, tick]);

  return null;
}

export default function App() {
  const populateHospital = useSimulationStore((s) => s.populateHospital);
  const initialized = useRef(false);
  const [activeTab, setActiveTab] = useState<'twin' | 'config' | 'daa'>('twin');

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
            {/* Playback Controls Card */}
            <div className="glass rounded-xl border border-slate-800 p-3 shadow shadow-slate-900/35">
              <h3 className="text-[10px] font-bold text-cyan-400 mb-2 tracking-wide uppercase">Simulation Playback</h3>
              <SimulationPlaybackControls />
            </div>

            {/* Metrics Dashboard / Status Panel (contains gauges & counts) */}
            <div className="glass rounded-xl border border-slate-800 p-2 shadow">
              <MetricsDashboard />
            </div>

            {/* Recommendations Panel */}
            <div className="glass rounded-xl border border-slate-800 p-2 shadow min-h-[140px] max-h-[220px] overflow-y-auto scroll-thin">
              <Recommendations />
            </div>

            {/* Hospital Timeline */}
            <div className="glass rounded-xl border border-slate-800 p-2 shadow min-h-[80px] max-h-[120px] overflow-y-auto scroll-thin">
              <SmartTimeline />
            </div>

            {/* Incident Log */}
            <div className="glass rounded-xl border border-slate-800 p-2 shadow flex-1 min-h-[160px] overflow-y-auto scroll-thin">
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

      <OutbreakReportModal />
      <SimulationLoop />
    </div>
  );
}
