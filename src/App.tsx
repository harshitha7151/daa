import { useEffect, useRef, useState } from 'react';
import TopBar from './components/layout/TopBar';
import HospitalScene, { TwinExplanationOverlay } from './components/twin/HospitalScene';
import DaaConsole from './components/analytics/DaaConsole';
import SimulationControls from './components/controls/SimulationControls';
import HospitalControls from './components/controls/HospitalControls';
import Recommendations from './components/panels/Recommendations';
import HospitalLog from './components/panels/HospitalLog';
import MetricsDashboard, { SmartTimeline, ComparisonPanel } from './components/panels/MetricsDashboard';
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
  const [activeTab, setActiveTab] = useState<'twin' | 'daa'>('twin');

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
          className={`px-4 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
            activeTab === 'twin'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('twin')}
        >
          SMART DIGITAL TWIN
        </button>
        <button
          className={`px-4 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
            activeTab === 'daa'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('daa')}
        >
          DAA ANALYTICS LAB
        </button>
      </div>

      {activeTab === 'twin' ? (
        <>
          {/* Main focus: Digital Twin 85% | Status Panel 15% */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Hospital 3D - occupies 85% */}
            <div className="flex-[85] relative min-h-0 flex flex-col">
              <HospitalScene />
              <TwinExplanationOverlay />
              <RoomInfoPanel />
              <PersonInfoPanel />
              <div className="absolute top-2 right-2 z-10 max-w-xs">
                <HospitalControls />
              </div>
            </div>
            {/* Status Panel - occupies 15% */}
            <div className="flex-[15] min-h-0 border-t border-slate-700/50 overflow-hidden bg-slate-900/40">
              <MetricsDashboard />
            </div>
          </div>

          {/* Bottom Panel */}
          <div
            className="shrink-0 overflow-y-auto border-t border-slate-800 bg-slate-950/90 scroll-thin"
            style={{
              maxHeight: '260px',
              minHeight: '220px',
            }}
          >
            <div className="flex flex-col gap-2 p-2">
              <SimulationControls />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 border-t border-slate-800 pt-2">
                <ComparisonPanel />
                <SmartTimeline />
                <HospitalLog />
              </div>
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: DAA ANALYTICS LAB */
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 scroll-thin">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-cyan-400">DAA Analytics Lab</h2>
              <p className="text-xs text-slate-400 mt-1">
                Explore real-time algorithmic execution, priority heaps, shortest path routing, and knapsack resource allocations.
              </p>
            </div>
            <DaaConsole />
            <div className="glass p-4 rounded-xl border border-slate-800">
              <Recommendations />
            </div>
          </div>
        </div>
      )}

      <OutbreakReportModal />
      <SimulationLoop />
    </div>
  );
}
