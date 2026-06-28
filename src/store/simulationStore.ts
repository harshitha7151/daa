import { create } from 'zustand';
import type {
  ComparisonMetrics,
  LogEntry,
  OutbreakReport,
  OutbreakStatus,
  Person,
  RoomId,
  RoomState,
  SimulationConfig,
  SimulationSnapshot,
  TimelineEvent,
  TransmissionEvent,
  Trend,
  DaaResults,
} from '../types';
import { CASE_STUDIES, HOSPITAL_NAME, ROOM_CLEANING_COSTS, ROOM_DEFINITIONS, formatSimTime } from '../data/hospitalData';
import { ROOM_IDS } from '../types';
import { createPopulation, assignRoomOccupancy, updateMovement } from '../engine/movementEngine';
import { initializeRooms, infectPatientZero, runTransmissionStep } from '../engine/transmissionEngine';
import { computeRecovery, computeRiskScore, runAllAlgorithms } from '../engine/graphBuilder';

const DEFAULT_CONFIG: SimulationConfig = {
  caseStudy: 'mrsa',
  startingRoom: 'ward-1',
  patientZeroId: null,
  numPatients: 20,
  numDoctors: 4,
  numNurses: 6,
  numVisitors: 8,
  numCleaningStaff: 3,
  crowdDensity: 0.5,
  cleaningFrequency: 8,
  simulationSpeed: 1,
  diseaseSpreadSpeed: 1,
  cleaningBudget: 100000,
  cleaningTeams: 3,
  restrictPatientMovement: false,
  restrictStaffMovement: false,
  isolationWardOpen: false,
};

let logCounter = 0;
let timelineCounter = 0;

function emptyDaa(): DaaResults {
  return runAllAlgorithms(initializeRooms(), DEFAULT_CONFIG, 'ward-1', 'icu');
}

function addLog(logs: LogEntry[], minute: number, message: string, type: LogEntry['type'] = 'info'): LogEntry[] {
  return [{ id: `log-${++logCounter}`, minute, timeLabel: formatSimTime(minute), message, type }, ...logs].slice(0, 200);
}

function addTimeline(events: TimelineEvent[], minute: number, message: string): TimelineEvent[] {
  return [...events, { id: `tl-${++timelineCounter}`, minute, timeLabel: formatSimTime(minute), message }].slice(-100);
}

interface SimStore {
  hospitalName: string;
  config: SimulationConfig;
  rooms: Record<RoomId, RoomState>;
  people: Person[];
  minute: number;
  timelineHour: number;
  status: OutbreakStatus;
  logs: LogEntry[];
  timeline: TimelineEvent[];
  transmissionEvents: TransmissionEvent[];
  daa: DaaResults;
  snapshots: SimulationSnapshot[];
  selectedRoomId: RoomId | null;
  selectedPersonId: string | null;
  interventions: string[];
  budgetUsed: number;
  riskTrend: Trend;
  recoveryTrend: Trend;
  prevRisk: number;
  showComparison: boolean;
  baselineSnapshots: SimulationSnapshot[];
  baselinePeople: Person[] | null;
  baselineRooms: Record<RoomId, RoomState> | null;
  showReport: boolean;
  outbreakReport: OutbreakReport | null;
  activeFloor: 'all' | 'ground' | 'first';
  mergeSortAnimStep: number;
  
  // Camera and UI focus states
  cameraMode: 'free' | 'top' | 'ground' | 'first' | 'icu' | 'patientZero' | 'follow';
  followedPersonId: string | null;
  setCameraMode: (mode: 'free' | 'top' | 'ground' | 'first' | 'icu' | 'patientZero' | 'follow', personId?: string | null) => void;
  algorithmSteps: Record<string, number>;
  setAlgorithmStep: (algo: string, step: number) => void;
  hasFocusedIcu: boolean;

  populateHospital: () => void;
  setConfig: (partial: Partial<SimulationConfig>) => void;
  setPatientZero: (id: string) => void;
  setStartingRoom: (roomId: RoomId) => void;
  startOutbreak: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  replay: () => void;
  tick: (delta: number) => void;
  seekTimeline: (hour: number) => void;
  recalculateAll: () => void;
  sanitizeRoom: (roomId: RoomId) => void;
  lockRoom: (roomId: RoomId) => void;
  unlockRoom: (roomId: RoomId) => void;
  toggleCorridor: (from: RoomId, to: RoomId) => void;
  adjustParam: (key: keyof SimulationConfig, delta: number) => void;
  selectRoom: (roomId: RoomId | null) => void;
  selectPerson: (personId: string | null) => void;
  runWhatIf: (scenario: string) => void;
  exportReport: () => void;
  closeReport: () => void;
  getComparison: () => ComparisonMetrics;
  getPatientsInRoom: (roomId: RoomId) => Person[];
}

export const useSimulationStore = create<SimStore>((set, get) => ({
  hospitalName: HOSPITAL_NAME,
  config: { ...DEFAULT_CONFIG },
  rooms: initializeRooms(),
  people: [],
  minute: 0,
  timelineHour: 0,
  status: 'idle',
  logs: [],
  timeline: [],
  transmissionEvents: [],
  daa: emptyDaa(),
  snapshots: [],
  selectedRoomId: null,
  selectedPersonId: null,
  interventions: [],
  budgetUsed: 0,
  riskTrend: 'stable',
  recoveryTrend: 'stable',
  prevRisk: 0,
  showComparison: true,
  baselineSnapshots: [],
  baselinePeople: null,
  baselineRooms: null,
  showReport: false,
  outbreakReport: null,
  activeFloor: 'all',
  mergeSortAnimStep: 0,

  // Camera & Stepping Initial States
  cameraMode: 'free',
  followedPersonId: null,
  setCameraMode: (mode, personId = null) => set({ cameraMode: mode, followedPersonId: personId }),
  algorithmSteps: { bfs: 0, dijkstra: 0, floydWarshall: 0, heap: 0, mergeSort: 0, knapsack: 0 },
  setAlgorithmStep: (algo, step) => set((s) => ({ algorithmSteps: { ...s.algorithmSteps, [algo]: step } })),
  hasFocusedIcu: false,

  populateHospital: () => {
    const { config } = get();
    const people = createPopulation(config);
  // Ensure starting room has patients for Patient Zero selection
  const patients = people.filter((p) => p.role === 'patient');
  const inStarting = patients.filter((p) => p.roomId === config.startingRoom);
  if (inStarting.length === 0 && patients.length > 0) {
    const def = ROOM_DEFINITIONS[config.startingRoom];
    for (let i = 0; i < Math.min(5, patients.length); i++) {
      patients[i].roomId = config.startingRoom;
      patients[i].position = [
        def.position[0] + (Math.random() - 0.5) * def.size[0] * 0.5,
        def.position[1] + 0.5,
        def.position[2] + (Math.random() - 0.5) * def.size[2] * 0.5,
      ];
      patients[i].visitedRooms = [config.startingRoom];
    }
  }
    let rooms = initializeRooms();
    if (config.isolationWardOpen) {
      rooms['isolation-ward'] = { ...rooms['isolation-ward'], locked: false };
    }
    rooms = assignRoomOccupancy(people, rooms);
    const daa = runAllAlgorithms(rooms, config, config.startingRoom, null);
    set({
      people,
      rooms,
      daa,
      logs: addLog([], 0, `Hospital populated: ${config.numPatients} patients, ${config.numDoctors} doctors, ${config.numNurses} nurses.`),
      minute: 0,
      status: 'idle',
      transmissionEvents: [],
      snapshots: [],
      interventions: [],
      budgetUsed: 0,
    });
  },

  setConfig: (partial) => {
    set((s) => ({ config: { ...s.config, ...partial } }));
    get().recalculateAll();
  },

  setStartingRoom: (roomId) => {
    set((s) => ({
      config: { ...s.config, startingRoom: roomId, patientZeroId: null },
      selectedRoomId: roomId,
      people: s.people.map((p) => ({ ...p, isPatientZero: false })),
    }));
    get().populateHospital();
    get().recalculateAll();
  },

  setPatientZero: (id) => {
    set((s) => ({
      config: { ...s.config, patientZeroId: id },
      people: s.people.map((p) => ({ ...p, isPatientZero: p.id === id })),
      logs: addLog(s.logs, s.minute, `Patient Zero selected: ${id}`, 'warning'),
      cameraMode: 'patientZero',
      followedPersonId: id,
    }));
  },

  startOutbreak: () => {
    const { config, people, rooms, logs } = get();
    if (!config.patientZeroId) {
      set({ logs: addLog(logs, 0, 'Select Patient Zero before starting outbreak.', 'danger') });
      return;
    }
    const disease = CASE_STUDIES[config.caseStudy];
    const result = infectPatientZero(people, config.patientZeroId, rooms);
    const pz = result.people.find((p) => p.id === config.patientZeroId);
    const origin = pz?.roomId ?? config.startingRoom;
    const daa = runAllAlgorithms(result.rooms, config, origin, null);
    set({
      people: result.people,
      rooms: result.rooms,
      status: 'running',
      daa,
      baselinePeople: structuredClone(result.people),
      baselineRooms: structuredClone(result.rooms),
      baselineSnapshots: [],
      logs: addLog(addLog(logs, 0, `${disease.shortName} outbreak initiated — Patient Zero: ${config.patientZeroId}.`, 'danger'), 0, 'BFS predicts next infection wave from origin room.', 'algorithm'),
      timeline: addTimeline([], 0, `${disease.shortName} detected — Patient ${config.patientZeroId} in ${ROOM_DEFINITIONS[origin].name}`),
      snapshots: [],
      cameraMode: 'patientZero',
      followedPersonId: config.patientZeroId,
      hasFocusedIcu: false,
    });
  },

  pause: () => set({ status: 'paused' }),
  resume: () => set({ status: 'running' }),

  reset: () => {
    set({
      config: { ...DEFAULT_CONFIG },
      rooms: initializeRooms(),
      people: [],
      minute: 0,
      timelineHour: 0,
      status: 'idle',
      logs: [],
      timeline: [],
      transmissionEvents: [],
      daa: emptyDaa(),
      snapshots: [],
      baselineSnapshots: [],
      baselinePeople: null,
      baselineRooms: null,
      interventions: [],
      budgetUsed: 0,
      selectedRoomId: null,
      selectedPersonId: null,
      showReport: false,
      outbreakReport: null,
      cameraMode: 'free',
      followedPersonId: null,
      algorithmSteps: { bfs: 0, dijkstra: 0, floydWarshall: 0, heap: 0, mergeSort: 0, knapsack: 0 },
      hasFocusedIcu: false,
    });
    get().populateHospital();
  },

  replay: () => {
    const { snapshots } = get();
    if (!snapshots.length) return;
    const first = snapshots[0];
    set({
      minute: first.minute,
      rooms: first.rooms,
      people: first.people,
      logs: first.logs,
      transmissionEvents: first.transmissionEvents,
      daa: first.daa,
      status: 'paused',
    });
  },

  tick: (delta) => {
    const state = get();
    if (state.status !== 'running') return;

    const speed = state.config.simulationSpeed;
    const newMinute = state.minute + delta * speed;

    let people = updateMovement(state.people, state.rooms, state.config, state.minute, delta);
    let rooms = assignRoomOccupancy(people, state.rooms);
    const tx = runTransmissionStep(people, rooms, state.config, Math.floor(newMinute));
    people = tx.people;
    rooms = assignRoomOccupancy(tx.people, tx.rooms);

    const risk = computeRiskScore(rooms, people);
    const recovery = computeRecovery(rooms, people);
    const origin = state.people.find((p) => p.isPatientZero)?.roomId ?? state.config.startingRoom;
    const daa = runAllAlgorithms(rooms, state.config, origin, null);

    let logs = state.logs;
    let timeline = state.timeline;
    const minInt = Math.floor(newMinute);

    const infectedCount = people.filter((p) => p.status === 'infected').length;
    const roomsInfected = ROOM_IDS.filter((id) => rooms[id].contamination > 0.3).length;

    let status: OutbreakStatus = state.status;
    const hadInfected = state.people.some((p) => p.status === 'infected');
    if (hadInfected && infectedCount === 0 && minInt > 30) status = 'contained';
    if (recovery >= 85 && infectedCount <= 1 && minInt > 60) status = 'contained';
    if (minInt >= 1440) status = 'ended';

    let cameraMode = state.cameraMode;
    let hasFocusedIcu = state.hasFocusedIcu;

    if (rooms.icu.contamination > 0.3 && !hasFocusedIcu) {
      hasFocusedIcu = true;
      cameraMode = 'icu';
      logs = addLog(logs, minInt, `WARNING: ICU contamination increased. Camera auto-focused on ICU.`, 'warning');
    }

    if (minInt > Math.floor(state.minute) && minInt % 5 === 0 && daa.bfs.nextPredicted) {
      const rn = ROOM_DEFINITIONS[daa.bfs.nextPredicted].name;
      logs = addLog(logs, minInt, `BFS predicts ${rn} at risk.`, 'algorithm');
      timeline = addTimeline(timeline, minInt, `BFS predicted ${rn} — next propagation level`);
    }
    if (minInt > Math.floor(state.minute) && minInt % 8 === 0 && daa.heap.root) {
      timeline = addTimeline(timeline, minInt, `${ROOM_DEFINITIONS[daa.heap.root].name} becomes highest risk (Heap)`);
    }
    if (tx.events.length) {
      const ev = tx.events[0];
      logs = addLog(logs, minInt, `Transmission: ${ev.fromId} → ${ev.toId} in ${ROOM_DEFINITIONS[ev.fromRoom].name}.`, 'danger');
      timeline = addTimeline(timeline, minInt, `${ev.fromId} transmitted to ${ev.toId} in ${ROOM_DEFINITIONS[ev.fromRoom].name}`);
    }
    if (status === 'contained' && state.status === 'running') {
      timeline = addTimeline(timeline, minInt, 'Outbreak contained — hospital recovery increasing');
      cameraMode = 'top';
    }

    const snapshot: SimulationSnapshot = {
      minute: minInt,
      rooms,
      people,
      logs,
      transmissionEvents: [...state.transmissionEvents, ...tx.events],
      daa,
      roomsInfected,
      patientsInfected: infectedCount,
      riskScore: risk,
      recoveryPercent: recovery,
      budgetRemaining: state.config.cleaningBudget - state.budgetUsed,
      budgetUsed: state.budgetUsed,
      interventions: state.interventions,
    };

    let nextBaselinePeople = state.baselinePeople;
    let nextBaselineRooms = state.baselineRooms;
    const baselineSnapshots = [...state.baselineSnapshots];
    if (state.baselinePeople && state.baselineRooms) {
      let bPeople = updateMovement(state.baselinePeople, state.baselineRooms, { ...state.config, cleaningTeams: 0 }, state.minute, delta);
      let bRooms = assignRoomOccupancy(bPeople, state.baselineRooms);
      const bTx = runTransmissionStep(bPeople, bRooms, { ...state.config, cleaningTeams: 0, cleaningFrequency: 999 }, minInt);
      bPeople = bTx.people;
      bRooms = assignRoomOccupancy(bTx.people, bTx.rooms);
      nextBaselinePeople = bPeople;
      nextBaselineRooms = bRooms;
      if (baselineSnapshots.length < 500) {
        baselineSnapshots.push({
          ...snapshot,
          people: bPeople,
          rooms: bRooms,
          patientsInfected: bPeople.filter((p) => p.status === 'infected').length,
          roomsInfected: ROOM_IDS.filter((id) => bRooms[id].contamination > 0.3).length,
          budgetUsed: 0,
          interventions: [],
        });
      }
    } else if (baselineSnapshots.length < 500) {
      baselineSnapshots.push({ ...snapshot });
    }

    if (status === 'ended' && !state.showReport) get().exportReport();

    set({
      minute: newMinute,
      timelineHour: newMinute / 60,
      people,
      rooms,
      daa,
      logs,
      timeline,
      transmissionEvents: [...state.transmissionEvents, ...tx.events].slice(-50),
      snapshots: [...state.snapshots, snapshot].slice(-500),
      baselineSnapshots,
      baselinePeople: nextBaselinePeople,
      baselineRooms: nextBaselineRooms,
      prevRisk: risk,
      riskTrend: risk > state.prevRisk + 2 ? 'increasing' : risk < state.prevRisk - 2 ? 'decreasing' : 'stable',
      recoveryTrend: recovery > computeRecovery(state.rooms, state.people) ? 'increasing' : 'stable',
      status,
      mergeSortAnimStep: (state.mergeSortAnimStep + 1) % Math.max(1, daa.mergeSort.steps.length),
      cameraMode,
      hasFocusedIcu,
    });
  },

  seekTimeline: (hour) => {
    const { snapshots } = get();
    const targetMinute = hour * 60;
    const snap = [...snapshots].reverse().find((s) => s.minute <= targetMinute);
    if (snap) {
      set({
        minute: snap.minute,
        timelineHour: hour,
        rooms: snap.rooms,
        people: snap.people,
        logs: snap.logs,
        daa: snap.daa,
        transmissionEvents: snap.transmissionEvents,
        status: 'paused',
      });
    } else {
      set({ timelineHour: hour });
    }
  },

  recalculateAll: () => {
    const { rooms, config, people } = get();
    const origin = people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    set({ daa: runAllAlgorithms(rooms, config, origin, null), mergeSortAnimStep: 0 });
  },

  sanitizeRoom: (roomId) => {
    const { rooms, config, logs, minute, budgetUsed, interventions } = get();
    const cost = ROOM_CLEANING_COSTS[roomId];
    if (budgetUsed + cost > config.cleaningBudget) {
      set({ logs: addLog(logs, minute, `Insufficient budget to sanitize ${ROOM_DEFINITIONS[roomId].name}.`, 'danger') });
      return;
    }
    set({
      rooms: {
        ...rooms,
        [roomId]: {
          ...rooms[roomId],
          contamination: Math.max(0, rooms[roomId].contamination - 0.4),
          sanitized: true,
          lastSanitizedMinute: minute,
          riskLevel: 'safe',
        },
      },
      budgetUsed: budgetUsed + cost,
      interventions: [...interventions, `Sanitized ${ROOM_DEFINITIONS[roomId].name}`],
      logs: addLog(logs, minute, `Cleaning completed in ${ROOM_DEFINITIONS[roomId].name}.`, 'success'),
      timeline: addTimeline(get().timeline, minute, `${ROOM_DEFINITIONS[roomId].name} sanitized — risk decreased`),
      cameraMode: 'free',
      selectedRoomId: roomId,
    });
    get().recalculateAll();
  },

  lockRoom: (roomId) => {
    const { rooms, logs, minute, interventions } = get();
    set({
      rooms: { ...rooms, [roomId]: { ...rooms[roomId], locked: true, riskLevel: 'locked' } },
      interventions: [...interventions, `Locked ${ROOM_DEFINITIONS[roomId].name}`],
      logs: addLog(logs, minute, `${ROOM_DEFINITIONS[roomId].name} locked.`, 'warning'),
    });
    get().recalculateAll();
  },

  unlockRoom: (roomId) => {
    const { rooms, logs, minute } = get();
    set({
      rooms: { ...rooms, [roomId]: { ...rooms[roomId], locked: false, riskLevel: 'safe' } },
      logs: addLog(logs, minute, `${ROOM_DEFINITIONS[roomId].name} unlocked.`, 'info'),
    });
    get().recalculateAll();
  },

  toggleCorridor: (from, to) => {
    const { rooms, logs, minute } = get();
    const closed = !rooms[from].corridorClosed[to];
    set({
      rooms: {
        ...rooms,
        [from]: { ...rooms[from], corridorClosed: { ...rooms[from].corridorClosed, [to]: closed } },
        [to]: { ...rooms[to], corridorClosed: { ...rooms[to].corridorClosed, [from]: closed } },
      },
      logs: addLog(logs, minute, `Corridor ${ROOM_DEFINITIONS[from].name} ↔ ${ROOM_DEFINITIONS[to].name} ${closed ? 'closed' : 'opened'}.`, 'warning'),
    });
    get().recalculateAll();
  },

  adjustParam: (key, delta) => {
    const { config } = get();
    const numericKeys = ['numPatients', 'numDoctors', 'numNurses', 'numVisitors', 'numCleaningStaff', 'crowdDensity', 'cleaningFrequency', 'simulationSpeed', 'diseaseSpreadSpeed', 'cleaningBudget', 'cleaningTeams'] as const;
    if (numericKeys.includes(key as (typeof numericKeys)[number])) {
      const cur = config[key as (typeof numericKeys)[number]] as number;
      get().setConfig({ [key]: Math.max(0, cur + delta) });
      if (['numPatients', 'numDoctors', 'numNurses', 'numVisitors', 'numCleaningStaff'].includes(key)) {
        get().populateHospital();
      }
    } else if (key === 'restrictPatientMovement' || key === 'restrictStaffMovement' || key === 'isolationWardOpen') {
      get().setConfig({ [key]: delta > 0 });
    }
  },

  selectRoom: (roomId) => set({ selectedRoomId: roomId, selectedPersonId: null }),
  selectPerson: (personId) => set({ selectedPersonId: personId, selectedRoomId: null }),

  runWhatIf: (scenario) => {
    const { logs, minute } = get();
    set({ logs: addLog(logs, minute, `What-if: ${scenario}`, 'algorithm') });
    switch (scenario) {
      case 'sanitize-icu': get().sanitizeRoom('icu'); break;
      case 'close-laboratory': get().lockRoom('laboratory'); break;
      case 'reduce-budget': get().adjustParam('cleaningBudget', -20000); break;
      case 'patient-zero-icu': get().setStartingRoom('icu'); break;
      case 'fast-cleaning': get().setConfig({ cleaningFrequency: 2 }); break;
      case 'more-visitors': get().adjustParam('numVisitors', 5); get().populateHospital(); break;
      default: break;
    }
    get().recalculateAll();
  },

  closeReport: () => set({ showReport: false }),

  exportReport: () => {
    const { config, people, rooms, minute, daa, interventions, budgetUsed } = get();
    const pz = people.find((p) => p.isPatientZero);
    const disease = CASE_STUDIES[config.caseStudy];
    set({
      outbreakReport: {
        caseStudy: disease.shortName,
        disease: disease.name,
        patientZero: pz?.id ?? 'N/A',
        originRoom: pz ? ROOM_DEFINITIONS[pz.roomId].name : ROOM_DEFINITIONS[config.startingRoom].name,
        duration: formatSimTime(minute),
        totalPatients: people.filter((p) => p.role === 'patient').length,
        totalStaff: people.filter((p) => p.role !== 'patient' && p.role !== 'visitor').length,
        roomsInfected: ROOM_IDS.filter((id) => rooms[id].contamination > 0.3).length,
        patientsInfected: people.filter((p) => p.status === 'infected').length,
        highestRiskRoom: daa.heap.root ? ROOM_DEFINITIONS[daa.heap.root].name : 'N/A',
        bfsResult: daa.bfs.explanation,
        dijkstraResult: daa.dijkstra.explanation,
        floydResult: daa.floydWarshall.explanation,
        heapRanking: daa.heap.priorityList.slice(0, 5).map((x) => ROOM_DEFINITIONS[x.roomId].name).join(', '),
        mergeSortOrder: daa.mergeSort.sorted.map((x) => ROOM_DEFINITIONS[x.roomId].name).join(' → '),
        knapsackAllocation: daa.knapsack.selected.map((r) => ROOM_DEFINITIONS[r].name).join(', '),
        interventions,
        recoveryPercent: computeRecovery(rooms, people),
        finalRiskPercent: computeRiskScore(rooms, people) / 100,
        cleaningCost: budgetUsed,
        lessonsLearned: [
          'Early sanitization of predicted rooms reduces secondary transmission.',
          'Corridor management changes shortest transmission paths.',
          'Knapsack maximizes risk reduction per rupee spent.',
        ],
        recommendations: daa.recommendations.map((r) => r.recommendation),
      },
      showReport: true,
    });
  },

  getComparison: () => {
    const { snapshots, baselineSnapshots, daa, config, budgetUsed } = get();
    const cur = snapshots[snapshots.length - 1];
    const base = baselineSnapshots[baselineSnapshots.length - 1];
    const patientCount = cur?.people.filter((p) => p.role === 'patient').length ?? config.numPatients;
    const current = {
      roomsInfected: cur?.roomsInfected ?? 0,
      patientsInfected: cur?.patientsInfected ?? 0,
      infectionPercent: cur ? (cur.patientsInfected / Math.max(1, patientCount)) * 100 : 0,
      recoveryPercent: cur?.recoveryPercent ?? 0,
      avgTransmissionCost: daa.dijkstra.cost,
      budgetUsed: cur?.budgetUsed ?? budgetUsed,
      containmentTime: cur?.minute ?? null,
      peakInfectionMinute: cur?.minute ?? null,
      highestRiskRoom: daa.heap.root,
      transmissionRoute: daa.dijkstra.path,
    };
    const basePatients = base?.people.filter((p) => p.role === 'patient').length ?? patientCount;
    const baseline = {
      roomsInfected: base?.roomsInfected ?? 0,
      patientsInfected: base?.patientsInfected ?? 0,
      infectionPercent: base ? (base.patientsInfected / Math.max(1, basePatients)) * 100 : 0,
      recoveryPercent: base?.recoveryPercent ?? 0,
      avgTransmissionCost: daa.dijkstra.cost * 1.2,
      budgetUsed: 0,
      containmentTime: base?.minute ?? null,
      peakInfectionMinute: base?.minute ?? null,
      highestRiskRoom: daa.heap.root,
      transmissionRoute: daa.dijkstra.path,
    };
    return {
      baseline,
      current,
      improvements: {
        roomsSaved: Math.max(0, baseline.roomsInfected - current.roomsInfected),
        riskReduced: Math.max(0, baseline.infectionPercent - current.infectionPercent),
        containmentTimeImproved: baseline.containmentTime && current.containmentTime ? (baseline.containmentTime - current.containmentTime) / 60 : 0,
        cleaningCostSaved: Math.max(0, (baseline.roomsInfected - current.roomsInfected) * 3000),
      },
    };
  },

  getPatientsInRoom: (roomId) => get().people.filter((p) => p.role === 'patient' && p.roomId === roomId),
}));
