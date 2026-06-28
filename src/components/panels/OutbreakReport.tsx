import { jsPDF } from 'jspdf';
import { useSimulationStore } from '../../store/simulationStore';
import { X, Download } from 'lucide-react';

export default function OutbreakReportModal() {
  const showReport = useSimulationStore((s) => s.showReport);
  const report = useSimulationStore((s) => s.outbreakReport);

  if (!showReport || !report) return null;

  const exportPdf = () => {
    const doc = new jsPDF();
    let y = 20;
    const line = (text: string, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, 14, y);
      y += 7;
    };
    line('Hospital Outbreak Summary', true);
    y += 3;
    line(`Case Study: ${report.caseStudy}`);
    line(`Disease: ${report.disease}`);
    line(`Patient Zero: ${report.patientZero} (${report.originRoom})`);
    line(`Duration: ${report.duration}`);
    line(`Rooms Infected: ${report.roomsInfected} | Patients Infected: ${report.patientsInfected}`);
    line(`Recovery: ${report.recoveryPercent}% | Final Risk: ${(report.finalRiskPercent * 100).toFixed(1)}%`);
    line(`Cleaning Cost: ₹${report.cleaningCost.toLocaleString()}`);
    y += 3;
    line('Algorithm Results:', true);
    line(`BFS: ${report.bfsResult.substring(0, 80)}...`);
    line(`Dijkstra: ${report.dijkstraResult.substring(0, 80)}...`);
    line(`Heap Ranking: ${report.heapRanking}`);
    line(`Knapsack: ${report.knapsackAllocation}`);
    y += 3;
    line('Lessons Learned:', true);
    report.lessonsLearned.forEach((l) => line(`• ${l}`));
    doc.save('hospital-outbreak-report.pdf');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-white">Hospital Outbreak Summary</h2>
          <div className="flex gap-2">
            <button onClick={exportPdf} className="p-2 rounded bg-cyan-600 text-white hover:bg-cyan-500"><Download className="w-4 h-4" /></button>
            <button onClick={() => useSimulationStore.getState().closeReport()} className="p-2 rounded bg-slate-700 text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="grid grid-cols-2 gap-2">
            <div>Case Study: <strong>{report.caseStudy}</strong></div>
            <div>Disease: {report.disease}</div>
            <div>Patient Zero: {report.patientZero}</div>
            <div>Origin: {report.originRoom}</div>
            <div>Duration: {report.duration}</div>
            <div>Highest Risk: {report.highestRiskRoom}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="glass rounded p-2"><div className="text-2xl font-bold text-red-400">{report.roomsInfected}</div><div className="text-xs text-slate-500">Rooms Infected</div></div>
            <div className="glass rounded p-2"><div className="text-2xl font-bold text-orange-400">{report.patientsInfected}</div><div className="text-xs text-slate-500">Patients Infected</div></div>
            <div className="glass rounded p-2"><div className="text-2xl font-bold text-green-400">{report.recoveryPercent}%</div><div className="text-xs text-slate-500">Recovery</div></div>
          </div>
          <div><strong className="text-cyan-400">BFS:</strong> {report.bfsResult}</div>
          <div><strong className="text-cyan-400">Dijkstra:</strong> {report.dijkstraResult}</div>
          <div><strong className="text-cyan-400">Floyd-Warshall:</strong> {report.floydResult}</div>
          <div><strong className="text-cyan-400">Heap:</strong> {report.heapRanking}</div>
          <div><strong className="text-cyan-400">Merge Sort:</strong> {report.mergeSortOrder}</div>
          <div><strong className="text-cyan-400">Knapsack:</strong> {report.knapsackAllocation}</div>
          <div><strong>Interventions:</strong> {report.interventions.join('; ') || 'None'}</div>
          <div><strong>Lessons:</strong><ul className="list-disc ml-4 mt-1">{report.lessonsLearned.map((l) => <li key={l}>{l}</li>)}</ul></div>
        </div>
      </div>
    </div>
  );
}
