import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      populateHospital();
    }
  }, [populateHospital]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden">
      <TopBar />

      {/* Main focus: Digital Twin 65% | DAA 35% */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel */}
        <div className="w-[65%] relative min-h-0 border-r border-slate-700/50 flex flex-col">
          {/* Hospital 3D */}
          <div className="flex-1 min-h-0 relative">
            <HospitalScene />
            <TwinExplanationOverlay />
            <RoomInfoPanel />
            <PersonInfoPanel />
            <div className="absolute top-2 right-2 z-10 max-w-xs">
              <HospitalControls />
            </div>
          </div>
          {/* Status Panel */}
          <div className="shrink-0 border-t border-slate-700/50 overflow-hidden">
            <MetricsDashboard />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-[35%] min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <DaaConsole />
          </div>
          <div className="h-40 shrink-0 border-t border-slate-700/50 overflow-hidden">
            <Recommendations />
          </div>
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

      <OutbreakReportModal />
      <SimulationLoop />
    </div>
  );
}
