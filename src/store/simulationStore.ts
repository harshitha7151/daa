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
  RecommendationHistoryEntry,
  RiskComparison,
} from '../types';
import { CASE_STUDIES, HOSPITAL_NAME, ROOM_CLEANING_COSTS, ROOM_DEFINITIONS, formatSimTime } from '../data/hospitalData';
import { ROOM_IDS } from '../types';
import { createPopulation, assignRoomOccupancy, updateMovement } from '../engine/movementEngine';
import { dijkstraPath } from '../algorithms/dijkstra';
import { initializeRooms, infectPatientZero, runTransmissionStep } from '../engine/transmissionEngine';
import { computeRecovery, computeRiskScore, runAllAlgorithms, buildAdjacency, buildGraphEdges } from '../engine/graphBuilder';

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
  automaticSchedule: false,
  educationalMode: false,
};

let logCounter = 0;
let timelineCounter = 0;

function emptyDaa(): DaaResults {
  const daa = runAllAlgorithms(initializeRooms(), DEFAULT_CONFIG, 'ward-1', 'icu', 'System initialization');
  daa.recommendations = [];
  return daa;
}

function addLog(logs: LogEntry[], minute: number, message: string, type: LogEntry['type'] = 'info'): LogEntry[] {
  return [{ id: `log-${++logCounter}`, minute, timeLabel: formatSimTime(minute), message, type }, ...logs].slice(0, 100);
}

function addTimeline(events: TimelineEvent[], minute: number, message: string): TimelineEvent[] {
  return [...events, { id: `tl-${++timelineCounter}`, minute, timeLabel: formatSimTime(minute), message }].slice(-50);
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

  // Decision Support UI States
  lastEventLabel: string;
  lastComparison: RiskComparison | null;
  recommendationHistory: RecommendationHistoryEntry[];
  
  // Camera and UI focus states
  cameraMode: 'free' | 'top' | 'ground' | 'first' | 'icu' | 'follow';
  followedPersonId: string | null;
  setCameraMode: (mode: 'free' | 'top' | 'ground' | 'first' | 'icu' | 'follow', personId?: string | null) => void;
  flashingRoomId: string | null;
  flashRoom: (roomId: string) => void;
  activeAlgorithmHighlight: string | null;
  setAlgorithmHighlight: (roomId: string | null) => void;
  algorithmSteps: Record<string, number>;
  setAlgorithmStep: (algo: string, step: number) => void;
  hasFocusedIcu: boolean;

  // Debugging & Educational states (retained for types only)
  tickExplanations: string[];
  disappearedPeople: any[];
  infectionAttempts: any[];
  currentEducationalExplanation: string | null;
  showEducationalOverlay: boolean;
  stepMode: boolean;

  // Decision support manual actions
  manuallySetContamination: (roomId: RoomId, contamination: number) => void;
  manuallyAdjustOccupancy: (roomId: RoomId, delta: number) => void;
  implementRecommendation: (recId: string) => void;
  ignoreRecommendation: (recId: string) => void;

  // Custom step actions
  stepTick: () => void;
  stepMovement: () => void;
  stepInfection: () => void;
  stepAlgorithmStep: () => void;
  stepCleaning: () => void;
  stepRecommendation: () => void;
  assignManualPath: (personId: string, roomId: RoomId) => void;
  toggleAutomaticSchedule: () => void;
  toggleStepMode: () => void;
  toggleEducationalMode: () => void;
  closeEducationalOverlay: () => void;

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
  showComparison: false,
  baselineSnapshots: [],
  baselinePeople: null,
  baselineRooms: null,
  showReport: false,
  outbreakReport: null,
  activeFloor: 'all',
  mergeSortAnimStep: 0,

  // Decision Support Initial States
  lastEventLabel: '',
  lastComparison: null,
  recommendationHistory: [],

  // Camera & Stepping Initial States
  cameraMode: 'free',
  followedPersonId: null,
  setCameraMode: (mode, personId = null) => set({ cameraMode: mode, followedPersonId: personId }),
  flashingRoomId: null,
  flashRoom: (roomId) => {
    set({ flashingRoomId: roomId });
    setTimeout(() => {
      if (get().flashingRoomId === roomId) {
        set({ flashingRoomId: null });
      }
    }, 1500);
  },
  activeAlgorithmHighlight: null,
  setAlgorithmHighlight: (roomId) => set({ activeAlgorithmHighlight: roomId }),
  algorithmSteps: { bfs: 0, dijkstra: 0, floydWarshall: 0, heap: 0, mergeSort: 0, knapsack: 0 },
  setAlgorithmStep: (algo, step) => set((s) => ({ algorithmSteps: { ...s.algorithmSteps, [algo]: step } })),
  hasFocusedIcu: false,

  // Debugging & Educational initial states (deactivated)
  tickExplanations: [],
  disappearedPeople: [],
  infectionAttempts: [],
  currentEducationalExplanation: null,
  showEducationalOverlay: false,
  stepMode: false,

  manuallySetContamination: (roomId, contamination) => {
    const { rooms, config, logs, minute } = get();
    const eventLabel = `Contamination in ${ROOM_DEFINITIONS[roomId].name} manually edited to ${Math.round(contamination * 100)}%.`;
    
    const updatedRooms = {
      ...rooms,
      [roomId]: {
        ...rooms[roomId],
        contamination,
        riskLevel: contamination > 0.6 ? 'critical' as const : contamination > 0.3 ? 'warning' as const : 'safe' as const,
      },
    };

    const origin = get().people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    const daa = runAllAlgorithms(updatedRooms, config, origin, null, eventLabel);

    set({
      rooms: updatedRooms,
      daa,
      lastEventLabel: eventLabel,
      logs: addLog(logs, minute, eventLabel, 'warning'),
    });
  },

  manuallyAdjustOccupancy: (roomId, delta) => {
    const { rooms, people, config, logs, minute } = get();
    const eventLabel = `Occupancy in ${ROOM_DEFINITIONS[roomId].name} manually adjusted (${delta > 0 ? '+1' : '-1'} patient).`;
    let updatedPeople = [...people];

    if (delta > 0) {
      const def = ROOM_DEFINITIONS[roomId];
      const pId = `P${String(people.length + 1).padStart(2, '0')}`;
      updatedPeople.push({
        id: pId,
        role: 'patient',
        roomId,
        status: 'healthy',
        action: 'standing',
        path: [],
        pathIndex: 0,
        walkProgress: 0,
        position: [
          def.position[0] + (Math.random() - 0.5) * def.size[0] * 0.4,
          def.position[1] + 0.5,
          def.position[2] + (Math.random() - 0.5) * def.size[2] * 0.4,
        ],
        visitedRooms: [roomId],
        schedule: [roomId],
        scheduleIndex: 0,
        lastActionMinute: minute,
        interactions: [],
        transmissionProb: 0,
        targetRoomId: null,
        isPatientZero: false,
        infectedAtMinute: null,
        exposedAtMinute: null,
        animPhase: 0,
      });
    } else {
      const pIdx = updatedPeople.findIndex((p) => p.role === 'patient' && p.roomId === roomId);
      if (pIdx >= 0) {
        updatedPeople.splice(pIdx, 1);
      }
    }

    const updatedRooms = assignRoomOccupancy(updatedPeople, rooms);
    const origin = updatedPeople.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    const daa = runAllAlgorithms(updatedRooms, config, origin, null, eventLabel);

    set({
      people: updatedPeople,
      rooms: updatedRooms,
      daa,
      lastEventLabel: eventLabel,
      logs: addLog(logs, minute, eventLabel, 'warning'),
    });
  },

  implementRecommendation: (recId) => {
    const state = get();
    const rec = state.daa.recommendations.find((r) => r.id === recId);
    if (!rec) return;

    // Capture before stats
    const beforeRisk = computeRiskScore(state.rooms, state.people) / 10;
    const beforeRecovery = Math.round(state.people.filter((p) => p.status === 'healthy').length / Math.max(1, state.people.length) * 100);
    const beforeHighest = state.daa.heap.root ? ROOM_DEFINITIONS[state.daa.heap.root].name : 'None';

    const eventLabel = `Implemented: ${rec.recommendation}`;
    let updatedRooms = { ...state.rooms };
    let updatedPeople = [...state.people];
    let budgetUsed = state.budgetUsed;

    if (rec.actionType === 'sanitize') {
      const rId = rec.actionParams.roomId as RoomId;
      const cost = ROOM_CLEANING_COSTS[rId];
      if (budgetUsed + cost <= state.config.cleaningBudget) {
        updatedRooms[rId] = {
          ...updatedRooms[rId],
          contamination: Math.max(0, updatedRooms[rId].contamination - 0.5),
          sanitized: true,
          lastSanitizedMinute: state.minute,
          riskLevel: 'safe' as const,
        };
        budgetUsed += cost;
      }
    } else if (rec.actionType === 'lock') {
      const rId = rec.actionParams.roomId as RoomId;
      updatedRooms[rId] = { ...updatedRooms[rId], locked: true, riskLevel: 'locked' as const };
    } else if (rec.actionType === 'close_corridor') {
      const from = rec.actionParams.from as RoomId;
      const to = rec.actionParams.to as RoomId;
      updatedRooms[from] = {
        ...updatedRooms[from],
        corridorClosed: { ...updatedRooms[from].corridorClosed, [to]: true },
      };
      updatedRooms[to] = {
        ...updatedRooms[to],
        corridorClosed: { ...updatedRooms[to].corridorClosed, [from]: true },
      };
    } else if (rec.actionType === 'increase_budget') {
      set((s) => ({ config: { ...s.config, cleaningBudget: s.config.cleaningBudget + rec.actionParams.budgetIncrement } }));
    }

    const origin = updatedPeople.find((p) => p.isPatientZero)?.roomId ?? state.config.startingRoom;
    const daa = runAllAlgorithms(updatedRooms, state.config, origin, null, eventLabel);

    // Capture after stats
    const afterRisk = computeRiskScore(updatedRooms, updatedPeople) / 10;
    const afterRecovery = Math.round(updatedPeople.filter((p) => p.status === 'healthy').length / Math.max(1, updatedPeople.length) * 100);
    const afterHighest = daa.heap.root ? ROOM_DEFINITIONS[daa.heap.root].name : 'None';

    const lastComparison: RiskComparison = {
      before: { risk: beforeRisk, recovery: beforeRecovery, highestRiskRoom: beforeHighest },
      after: { risk: afterRisk, recovery: afterRecovery, highestRiskRoom: afterHighest },
      actionLabel: `Implemented recommendation: ${rec.recommendation}`,
    };

    const newHistoryEntry: RecommendationHistoryEntry = {
      timeLabel: formatSimTime(state.minute),
      trigger: rec.triggeredBy,
      recommendation: rec.recommendation,
      action: 'Implemented',
    };

    set({
      rooms: updatedRooms,
      people: updatedPeople,
      budgetUsed,
      daa,
      lastComparison,
      lastEventLabel: eventLabel,
      recommendationHistory: [...state.recommendationHistory, newHistoryEntry],
      logs: addLog(state.logs, state.minute, `Recommendation Implemented: ${rec.recommendation}`, 'success'),
    });
  },

  ignoreRecommendation: (recId) => {
    const state = get();
    const rec = state.daa.recommendations.find((r) => r.id === recId);
    if (!rec) return;

    // Capture before stats
    const beforeRisk = computeRiskScore(state.rooms, state.people) / 10;
    const beforeRecovery = Math.round(state.people.filter((p) => p.status === 'healthy').length / Math.max(1, state.people.length) * 100);
    const beforeHighest = state.daa.heap.root ? ROOM_DEFINITIONS[state.daa.heap.root].name : 'None';

    const eventLabel = `Ignored: ${rec.recommendation}`;
    let updatedRooms = { ...state.rooms };
    let updatedPeople = [...state.people];

    // Consequence: Contamination spikes in the affected rooms due to inaction
    if (rec.affectedRooms.length > 0) {
      rec.affectedRooms.forEach((rName) => {
        const rId = ROOM_IDS.find((id) => ROOM_DEFINITIONS[id].name === rName || id === rName);
        if (rId) {
          updatedRooms[rId] = {
            ...updatedRooms[rId],
            contamination: Math.min(1, updatedRooms[rId].contamination + 0.25),
          };
        }
      });
    }

    const origin = updatedPeople.find((p) => p.isPatientZero)?.roomId ?? state.config.startingRoom;
    const daa = runAllAlgorithms(updatedRooms, state.config, origin, null, eventLabel);

    // Capture after stats
    const afterRisk = computeRiskScore(updatedRooms, updatedPeople) / 10;
    const afterRecovery = Math.round(updatedPeople.filter((p) => p.status === 'healthy').length / Math.max(1, updatedPeople.length) * 100);
    const afterHighest = daa.heap.root ? ROOM_DEFINITIONS[daa.heap.root].name : 'None';

    const lastComparison: RiskComparison = {
      before: { risk: beforeRisk, recovery: beforeRecovery, highestRiskRoom: beforeHighest },
      after: { risk: afterRisk, recovery: afterRecovery, highestRiskRoom: afterHighest },
      actionLabel: `Ignored: ${rec.recommendation} (Pathogen levels spiked)`,
    };

    const newHistoryEntry: RecommendationHistoryEntry = {
      timeLabel: formatSimTime(state.minute),
      trigger: rec.triggeredBy,
      recommendation: rec.recommendation,
      action: 'Ignored',
    };

    set({
      rooms: updatedRooms,
      people: updatedPeople,
      daa,
      lastComparison,
      lastEventLabel: eventLabel,
      recommendationHistory: [...state.recommendationHistory, newHistoryEntry],
      logs: addLog(state.logs, state.minute, `Recommendation Ignored. Outbreak risk increased in ignored wards.`, 'danger'),
    });
  },

  stepTick: () => {
    // Manually advances 5 minutes
    set((s) => {
      const newMin = s.minute + 5;
      const eventLabel = `Manual clock tick (+5m).`;
      const rooms = assignRoomOccupancy(s.people, s.rooms);
      const tx = runTransmissionStep(s.people, rooms, s.config, newMin);
      const origin = s.people.find((p) => p.isPatientZero)?.roomId ?? s.config.startingRoom;
      const daa = runAllAlgorithms(tx.rooms, s.config, origin, null, eventLabel);

      let logs = s.logs;
      tx.events.forEach((ev) => {
        logs = addLog(logs, newMin, `Infection spread: ${ev.fromId} exposed ${ev.toId} in ${ROOM_DEFINITIONS[ev.fromRoom].name}.`, 'danger');
      });

      return {
        minute: newMin,
        timelineHour: newMin / 60,
        people: tx.people,
        rooms: tx.rooms,
        daa,
        lastEventLabel: eventLabel,
        logs,
      };
    });
  },

  stepMovement: () => {},
  stepInfection: () => {},
  stepAlgorithmStep: () => {},
  stepCleaning: () => {},
  stepRecommendation: () => {},

  assignManualPath: (personId, roomId) => {
    const { people, rooms, config, minute } = get();
    const person = people.find((p) => p.id === personId);
    if (!person) return;

    const eventLabel = `${personId} (${person.role}) directed to move to ${ROOM_DEFINITIONS[roomId].name}.`;
    const adjacency = buildAdjacency(rooms);
    const edges = buildGraphEdges(rooms, config, 1);
    const locked = new Set(ROOM_IDS.filter((id) => rooms[id].locked));
    const path = dijkstraPath(person.roomId, roomId, edges, adjacency, locked);

    if (path.length > 1) {
      const updatedPeople = people.map((p) =>
        p.id === personId
          ? {
              ...p,
              path,
              pathIndex: 0,
              walkProgress: 0,
              targetRoomId: roomId,
              action: 'walking' as const,
              lastActionMinute: Math.floor(minute),
              waitingReason: '',
            }
          : p
      );
      set({
        people: updatedPeople,
        lastEventLabel: eventLabel,
        logs: addLog(get().logs, Math.floor(minute), eventLabel, 'info')
      });
    }
  },

  toggleAutomaticSchedule: () => {},
  toggleStepMode: () => {},
  toggleEducationalMode: () => {},
  closeEducationalOverlay: () => set({ showEducationalOverlay: false }),

  populateHospital: () => {
    const { config } = get();
    const people = createPopulation(config);
    
    // Position Patient Zero or other patients in default room
    const patients = people.filter((p) => p.role === 'patient');
    if (patients.length > 0) {
      const def = ROOM_DEFINITIONS[config.startingRoom];
      for (let i = 0; i < Math.min(5, patients.length); i++) {
        patients[i].roomId = config.startingRoom;
        patients[i].position = [
          def.position[0] + (Math.random() - 0.5) * def.size[0] * 0.4,
          def.position[1] + 0.5,
          def.position[2] + (Math.random() - 0.5) * def.size[2] * 0.4,
        ];
        patients[i].visitedRooms = [config.startingRoom];
      }
    }

    let rooms = initializeRooms();
    rooms = assignRoomOccupancy(people, rooms);
    const daa = runAllAlgorithms(rooms, config, config.startingRoom, null, 'Hospital initialization');
    daa.recommendations = [];

    set({
      people,
      rooms,
      daa,
      logs: addLog([], 0, `Hospital populated: ${config.numPatients} patients. Ready for manual configuration.`),
      minute: 0,
      status: 'idle',
      transmissionEvents: [],
      snapshots: [],
      interventions: [],
      budgetUsed: 0,
      tickExplanations: [],
      disappearedPeople: [],
      infectionAttempts: [],
      lastEventLabel: '',
      lastComparison: null,
      recommendationHistory: [],
    });
  },

  setConfig: (partial) => {
    const paramKey = Object.keys(partial)[0] || '';
    const eventLabel = `Simulation parameter changed (${paramKey}).`;
    set((s) => ({ config: { ...s.config, ...partial } }));
    
    const { rooms, config, people } = get();
    const origin = people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    set({
      daa: runAllAlgorithms(rooms, config, origin, null, eventLabel),
      mergeSortAnimStep: 0,
      lastEventLabel: eventLabel,
    });
  },

  setStartingRoom: (roomId) => {
    const eventLabel = `Starting room changed to ${ROOM_DEFINITIONS[roomId].name}.`;
    set((s) => ({
      config: { ...s.config, startingRoom: roomId, patientZeroId: null },
      selectedRoomId: roomId,
      people: s.people.map((p) => ({ ...p, isPatientZero: false })),
    }));
    get().populateHospital();
    
    const { rooms, config, people } = get();
    const origin = people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    set({
      daa: runAllAlgorithms(rooms, config, origin, null, eventLabel),
      mergeSortAnimStep: 0,
      lastEventLabel: eventLabel,
    });
  },

  setPatientZero: (id) => {
    const eventLabel = `Patient Zero set to ${id}.`;
    set((s) => ({
      config: { ...s.config, patientZeroId: id },
      people: s.people.map((p) => ({ ...p, isPatientZero: p.id === id })),
      logs: addLog(s.logs, s.minute, `Selected Patient Zero: ${id}`, 'warning'),
      lastEventLabel: eventLabel,
    }));
  },

  startOutbreak: () => {
    const { config, people, rooms, logs } = get();
    if (!config.patientZeroId) {
      set({ logs: addLog(logs, 0, 'Select Patient Zero to begin.', 'danger') });
      return;
    }
    const disease = CASE_STUDIES[config.caseStudy];
    const result = infectPatientZero(people, config.patientZeroId, rooms);
    const pz = result.people.find((p) => p.id === config.patientZeroId);
    const origin = pz?.roomId ?? config.startingRoom;
    const eventLabel = `Outbreak started with Patient Zero ${config.patientZeroId} in ${ROOM_DEFINITIONS[origin].name}.`;
    const daa = runAllAlgorithms(result.rooms, config, origin, null, eventLabel);

    set({
      people: result.people,
      rooms: result.rooms,
      status: 'running',
      daa,
      lastEventLabel: eventLabel,
      logs: addLog(logs, 0, `Manual demonstration started. Patient Zero ${config.patientZeroId} infected with ${disease.shortName} in ${ROOM_DEFINITIONS[origin].name}.`, 'danger'),
      timeline: addTimeline([], 0, `Outbreak started: ${config.patientZeroId} in ${ROOM_DEFINITIONS[origin].name}`),
      snapshots: [],
      hasFocusedIcu: false,
    });
  },

  pause: () => {},
  resume: () => {},

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
      tickExplanations: [],
      disappearedPeople: [],
      infectionAttempts: [],
      currentEducationalExplanation: null,
      showEducationalOverlay: false,
      stepMode: false,
      lastEventLabel: 'Hospital initialized',
      lastComparison: null,
      recommendationHistory: [],
    });
    get().populateHospital();
  },

  replay: () => {},

  tick: (delta) => {
    const state = get();
    if (state.status !== 'running') return;

    let people = updateMovement(state.people, state.rooms, state.config, state.minute, delta);
    let rooms = assignRoomOccupancy(people, state.rooms);

    let minute = state.minute;
    let logs = state.logs;
    let timeline = state.timeline;
    let transmissionEvents = state.transmissionEvents;
    let daa = state.daa;

    let recalculate = false;
    let eventLabel = state.lastEventLabel;

    people = people.map((p) => {
      const prev = state.people.find((x) => x.id === p.id);
      if (!prev) return p;

      // Detect arrival
      if (prev.action === 'walking' && p.action === 'standing') {
        recalculate = true;
        minute += 5; // discrete 5-minute ticks on arrivals!
        const toName = ROOM_DEFINITIONS[p.roomId].name;
        eventLabel = `${p.id} (${p.role}) arrived at ${toName}.`;
        logs = addLog(logs, Math.floor(minute), eventLabel, 'info');
        timeline = addTimeline(timeline, Math.floor(minute), `${p.id} moved to ${toName}`);
      }
      return p;
    });

    if (recalculate) {
      rooms = assignRoomOccupancy(people, rooms);
      const tx = runTransmissionStep(people, rooms, state.config, Math.floor(minute));
      people = tx.people;
      rooms = assignRoomOccupancy(people, tx.rooms);
      transmissionEvents = [...state.transmissionEvents, ...tx.events].slice(-50);

      tx.events.forEach((ev) => {
        logs = addLog(logs, Math.floor(minute), `${ev.toId} exposed to pathogens in ${ROOM_DEFINITIONS[ev.fromRoom].name}.`, 'danger');
        timeline = addTimeline(timeline, Math.floor(minute), `${ev.toId} infected in ${ROOM_DEFINITIONS[ev.fromRoom].name}`);
      });

      const origin = people.find((p) => p.isPatientZero)?.roomId ?? state.config.startingRoom;
      daa = runAllAlgorithms(rooms, state.config, origin, null, eventLabel);
    }

    set({
      minute,
      timelineHour: minute / 60,
      people,
      rooms,
      daa,
      logs,
      timeline,
      transmissionEvents,
      lastEventLabel: eventLabel,
    });
  },

  seekTimeline: (hour) => {
    set({ timelineHour: hour, minute: hour * 60 });
  },

  recalculateAll: () => {
    const { rooms, config, people } = get();
    const origin = people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    set({ daa: runAllAlgorithms(rooms, config, origin, null, 'DAA Recalculate Request'), mergeSortAnimStep: 0 });
  },

  sanitizeRoom: (roomId) => {
    const { rooms, config, logs, minute, budgetUsed, interventions } = get();
    const cost = ROOM_CLEANING_COSTS[roomId];
    if (budgetUsed + cost > config.cleaningBudget) {
      set({ logs: addLog(logs, minute, `Budget limit reached: Cannot sanitize ${ROOM_DEFINITIONS[roomId].name}.`, 'danger') });
      return;
    }
    const eventLabel = `${ROOM_DEFINITIONS[roomId].name} sanitized manually.`;
    const newContam = Math.max(0, rooms[roomId].contamination - 0.5);
    const updatedRooms = {
      ...rooms,
      [roomId]: {
        ...rooms[roomId],
        contamination: newContam,
        sanitized: true,
        lastSanitizedMinute: minute,
        riskLevel: 'safe' as const,
      },
    };

    const origin = get().people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    const daa = runAllAlgorithms(updatedRooms, config, origin, null, eventLabel);

    set({
      rooms: updatedRooms,
      daa,
      budgetUsed: budgetUsed + cost,
      interventions: [...interventions, `Sanitized ${ROOM_DEFINITIONS[roomId].name}`],
      lastEventLabel: eventLabel,
      logs: addLog(logs, minute, `${ROOM_DEFINITIONS[roomId].name} sanitized. Contamination reduced.`, 'success'),
      timeline: addTimeline(get().timeline, minute, `${ROOM_DEFINITIONS[roomId].name} sanitized — risk decreased`),
      selectedRoomId: roomId,
    });
  },

  lockRoom: (roomId) => {
    const { rooms, logs, minute, interventions, config } = get();
    const eventLabel = `${ROOM_DEFINITIONS[roomId].name} locked manually.`;
    const updatedRooms = { ...rooms, [roomId]: { ...rooms[roomId], locked: true, riskLevel: 'locked' as const } };
    const origin = get().people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    const daa = runAllAlgorithms(updatedRooms, config, origin, null, eventLabel);

    set({
      rooms: updatedRooms,
      daa,
      interventions: [...interventions, `Locked ${ROOM_DEFINITIONS[roomId].name}`],
      lastEventLabel: eventLabel,
      logs: addLog(logs, minute, `${ROOM_DEFINITIONS[roomId].name} locked.`, 'warning'),
    });
  },

  unlockRoom: (roomId) => {
    const { rooms, logs, minute, config } = get();
    const eventLabel = `${ROOM_DEFINITIONS[roomId].name} unlocked manually.`;
    const updatedRooms = { ...rooms, [roomId]: { ...rooms[roomId], locked: false, riskLevel: 'safe' as const } };
    const origin = get().people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    const daa = runAllAlgorithms(updatedRooms, config, origin, null, eventLabel);

    set({
      rooms: updatedRooms,
      daa,
      lastEventLabel: eventLabel,
      logs: addLog(logs, minute, `${ROOM_DEFINITIONS[roomId].name} unlocked.`, 'info'),
    });
  },

  toggleCorridor: (from, to) => {
    const { rooms, logs, minute, config } = get();
    const closed = !rooms[from].corridorClosed[to];
    const eventLabel = `Corridor ${ROOM_DEFINITIONS[from].name} ↔ ${ROOM_DEFINITIONS[to].name} ${closed ? 'closed' : 'opened'}.`;
    const updatedRooms = {
      ...rooms,
      [from]: { ...rooms[from], corridorClosed: { ...rooms[from].corridorClosed, [to]: closed } },
      [to]: { ...rooms[to], corridorClosed: { ...rooms[to].corridorClosed, [from]: closed } },
    };
    const origin = get().people.find((p) => p.isPatientZero)?.roomId ?? config.startingRoom;
    const daa = runAllAlgorithms(updatedRooms, config, origin, null, eventLabel);

    set({
      rooms: updatedRooms,
      daa,
      lastEventLabel: eventLabel,
      logs: addLog(logs, minute, eventLabel, 'warning'),
    });
  },

  adjustParam: (key, delta) => {
    const { config } = get();
    const numericKeys = ['numPatients', 'numDoctors', 'numNurses', 'numVisitors', 'numCleaningStaff', 'crowdDensity', 'cleaningFrequency', 'simulationSpeed', 'diseaseSpreadSpeed', 'cleaningBudget', 'cleaningTeams'] as const;
    if (numericKeys.includes(key as (typeof numericKeys)[number])) {
      const cur = config[key as (typeof numericKeys)[number]] as number;
      const newVal = Math.max(0, cur + delta);
      const eventLabel = `${key} parameter adjusted to ${newVal}.`;

      set((s) => ({ config: { ...s.config, [key]: newVal }, lastEventLabel: eventLabel }));
      
      if (['numPatients', 'numDoctors', 'numNurses', 'numVisitors', 'numCleaningStaff'].includes(key)) {
        get().populateHospital();
      } else {
        const { rooms, config: newConfig, people } = get();
        const origin = people.find((p) => p.isPatientZero)?.roomId ?? newConfig.startingRoom;
        set({ daa: runAllAlgorithms(rooms, newConfig, origin, null, eventLabel) });
      }
    }
  },

  selectRoom: (roomId) => set({ selectedRoomId: roomId, selectedPersonId: null }),
  selectPerson: (personId) => set({ selectedPersonId: personId, selectedRoomId: null }),

  runWhatIf: (scenario) => {
    switch (scenario) {
      case 'sanitize-icu': get().sanitizeRoom('icu'); break;
      case 'close-laboratory': get().lockRoom('laboratory'); break;
      case 'reduce-budget': get().adjustParam('cleaningBudget', -20000); break;
      case 'patient-zero-icu': get().setStartingRoom('icu'); break;
      case 'fast-cleaning': get().setConfig({ cleaningFrequency: 2 }); break;
      case 'more-visitors': get().adjustParam('numVisitors', 5); get().populateHospital(); break;
      default: break;
    }
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
          'Manual character movement models pathogen vectors directly.',
          'Interventions instantly trigger shortest-path DAA updates.',
          'Knapsack allocation operates statically within specified limits.',
        ],
        recommendations: daa.recommendations.map((r) => r.recommendation),
      },
      showReport: true,
    });
  },

  getComparison: () => {
    const current = {
      roomsInfected: 0,
      patientsInfected: 0,
      infectionPercent: 0,
      recoveryPercent: 0,
      avgTransmissionCost: 0,
      budgetUsed: 0,
      containmentTime: null,
      peakInfectionMinute: null,
      highestRiskRoom: null,
      transmissionRoute: [],
    };
    return {
      baseline: current,
      current,
      improvements: { roomsSaved: 0, riskReduced: 0, containmentTimeImproved: 0, cleaningCostSaved: 0 },
    };
  },

  getPatientsInRoom: (roomId) => get().people.filter((p) => p.role === 'patient' && p.roomId === roomId),
}));
