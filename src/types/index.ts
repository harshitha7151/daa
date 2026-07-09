export type RoomId =
  | 'reception'
  | 'waiting-area'
  | 'emergency'
  | 'general-ward'
  | 'radiology'
  | 'pharmacy'
  | 'doctor-cabin'
  | 'sanitization-room'
  | 'ward-1'
  | 'ward-2'
  | 'icu'
  | 'isolation-ward'
  | 'laboratory';

export type Floor = 'ground' | 'first';

export type PersonRole = 'patient' | 'doctor' | 'nurse' | 'visitor' | 'cleaning' | 'security';

export type HealthStatus = 'healthy' | 'exposed' | 'infected' | 'recovered';

export type RoomRiskLevel = 'safe' | 'low' | 'moderate' | 'high' | 'critical' | 'locked';

export type CaseStudyId = 'mrsa';

export type OutbreakStatus = 'idle' | 'running' | 'paused' | 'contained' | 'ended';

export type Trend = 'increasing' | 'stable' | 'decreasing';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface RoomDefinition {
  id: RoomId;
  name: string;
  floor: Floor;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  assets: string[];
}

export interface DiseaseParams {
  id: CaseStudyId;
  name: string;
  shortName: string;
  cause: string;
  typicalSpread: RoomId[];
  surfaceTransmission: number;
  patientTransmission: number;
  equipmentTransmission: number;
  airborneSpread: number;
  cleaningDependency: number;
  incubationMinutes: number;
  spreadMultiplier: number;
}

export interface Person {
  id: string;
  role: PersonRole;
  roomId: RoomId;
  position: [number, number, number];
  targetRoomId: RoomId | null;
  path: RoomId[];
  pathIndex: number;
  status: HealthStatus;
  isPatientZero: boolean;
  visitedRooms: RoomId[];
  interactions: string[];
  transmissionProb: number;
  infectedAtMinute: number | null;
  exposedAtMinute: number | null;
  schedule: RoomId[];
  scheduleIndex: number;
  animPhase: number;
  walkProgress: number;
  lastActionMinute: number;
  action: 'walking' | 'standing' | 'sitting' | 'waiting';
  waitingReason?: string;
}

export interface VisualExtraRoom {
  id: string;
  name: string;
  floor: Floor;
  position: [number, number, number];
  size: [number, number, number];
  assets: string[];
}

export interface RoomState {
  id: RoomId;
  contamination: number;
  riskLevel: RoomRiskLevel;
  occupancy: number;
  patients: string[];
  nurses: string[];
  doctors: string[];
  visitors: string[];
  cleaningStaff: string[];
  locked: boolean;
  sanitized: boolean;
  lastSanitizedMinute: number;
  cleaningCost: number;
  riskReductionValue: number;
  predictedInfectionMinute: number | null;
  corridorClosed: Record<string, boolean>;
}

export interface GraphEdge {
  from: RoomId;
  to: RoomId;
  baseWeight: number;
  weight: number;
  closed: boolean;
  explanation: string;
}

export interface SimulationConfig {
  caseStudy: CaseStudyId;
  startingRoom: RoomId;
  patientZeroId: string | null;
  numPatients: number;
  numDoctors: number;
  numNurses: number;
  numVisitors: number;
  numCleaningStaff: number;
  crowdDensity: number;
  cleaningFrequency: number;
  simulationSpeed: number;
  diseaseSpreadSpeed: number;
  cleaningBudget: number;
  cleaningTeams: number;
  restrictPatientMovement: boolean;
  restrictStaffMovement: boolean;
  isolationWardOpen: boolean;
  automaticSchedule: boolean;
  educationalMode: boolean;
}

export interface LogEntry {
  id: string;
  minute: number;
  timeLabel: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success' | 'algorithm';
}

export interface TimelineEvent {
  id: string;
  minute: number;
  timeLabel: string;
  message: string;
}

export interface Recommendation {
  id: string;
  algorithm: string;
  recommendation: string;
  reason: string;
  expectedEffect: string;
  affectedRooms: string[];
  estimatedCost: number;
  estimatedTime: number;
  priority: Priority;
  confidence: number;
  triggeredBy: string;
  actionType: 'sanitize' | 'lock' | 'unlock' | 'close_corridor' | 'increase_budget';
  actionParams: any;
}

export interface RecommendationHistoryEntry {
  timeLabel: string;
  trigger: string;
  recommendation: string;
  action: 'Implemented' | 'Ignored';
}

export interface RiskComparison {
  before: {
    risk: number;
    recovery: number;
    highestRiskRoom: string;
  };
  after: {
    risk: number;
    recovery: number;
    highestRiskRoom: string;
  };
  actionLabel: string;
}

export interface AlgorithmEducational {
  purpose: string;
  inputs: Record<string, string | number>;
  result: string;
  clinicalMeaning: string;
}

export interface BfsStep {
  currentNode: RoomId | null;
  queue: RoomId[];
  visited: RoomId[];
  checkingNeighbor: RoomId | null;
  tree: Record<RoomId, RoomId | null>;
  level: number;
  description: string;
}

export interface BfsResult {
  queue: RoomId[];
  visited: RoomId[];
  level: number;
  tree: Record<RoomId, RoomId | null>;
  nextPredicted: RoomId | null;
  levels: RoomId[][];
  explanation: string;
  educational: AlgorithmEducational;
  steps?: BfsStep[];
}

export interface DijkstraStep {
  currentNode: RoomId | null;
  visited: RoomId[];
  distances: Record<RoomId, number>;
  previous: Record<RoomId, RoomId | null>;
  checkingNeighbor: RoomId | null;
  edgeWeight: number | null;
  oldDistance: number | null;
  newDistance: number | null;
  updated: boolean;
  description: string;
}

export interface DijkstraResult {
  path: RoomId[];
  saferPath: RoomId[];
  cost: number;
  saferCost: number;
  edgeWeights: { from: RoomId; to: RoomId; weight: number; explanation: string }[];
  explanation: string;
  educational: AlgorithmEducational;
  steps?: DijkstraStep[];
}

export interface FloydWarshallResult {
  matrix: number[][];
  roomIds: RoomId[];
  pivot: number;
  iteration: number;
  updatedCells: [number, number][];
  explanation: string;
  educational: AlgorithmEducational;
}

export interface HeapNode {
  roomId: RoomId;
  priority: number;
  left?: HeapNode;
  right?: HeapNode;
}

export interface HeapStep {
  type: 'insert' | 'compare' | 'swap' | 'heapify' | 'extract';
  array: { roomId: RoomId; score: number }[];
  i?: number;
  j?: number;
  description: string;
}

export interface HeapResult {
  tree: HeapNode | null;
  priorityList: { roomId: RoomId; score: number }[];
  root: RoomId | null;
  explanation: string;
  educational: AlgorithmEducational;
  steps?: HeapStep[];
}

export interface MergeSortStep {
  phase: 'divide' | 'merge' | 'complete';
  left: RoomId[];
  right: RoomId[];
  merged: RoomId[];
  description: string;
}

export interface MergeSortResult {
  sorted: { roomId: RoomId; score: number }[];
  steps: MergeSortStep[];
  explanation: string;
  educational: AlgorithmEducational;
}

export interface KnapsackStep {
  itemIndex: number;
  currentItem: RoomId | null;
  itemCost: number;
  itemValue: number;
  currentBudget: number;
  decision: 'checking' | 'select' | 'reject' | 'backtrack';
  selectedList: RoomId[];
  dpRow: number[];
  description: string;
}

export interface KnapsackResult {
  selected: RoomId[];
  rejected: RoomId[];
  budgetUsed: number;
  budgetRemaining: number;
  expectedReduction: number;
  explanation: string;
  educational: AlgorithmEducational;
  steps?: KnapsackStep[];
}

export interface DaaResults {
  bfs: BfsResult;
  dijkstra: DijkstraResult;
  floydWarshall: FloydWarshallResult;
  heap: HeapResult;
  mergeSort: MergeSortResult;
  knapsack: KnapsackResult;
  recommendations: Recommendation[];
  currentAlgorithm: string;
  animationMessage: string;
}

export interface TransmissionEvent {
  id: string;
  fromId: string;
  toId: string;
  fromRoom: RoomId;
  toRoom: RoomId;
  minute: number;
  type: 'person' | 'surface' | 'equipment';
}

export interface SimulationSnapshot {
  minute: number;
  rooms: Record<RoomId, RoomState>;
  people: Person[];
  logs: LogEntry[];
  transmissionEvents: TransmissionEvent[];
  daa: DaaResults;
  roomsInfected: number;
  patientsInfected: number;
  riskScore: number;
  recoveryPercent: number;
  budgetRemaining: number;
  budgetUsed: number;
  interventions: string[];
}

export interface ComparisonMetrics {
  baseline: {
    roomsInfected: number;
    patientsInfected: number;
    infectionPercent: number;
    recoveryPercent: number;
    avgTransmissionCost: number;
    budgetUsed: number;
    containmentTime: number | null;
    peakInfectionMinute: number | null;
    highestRiskRoom: RoomId | null;
    transmissionRoute: RoomId[];
  };
  current: {
    roomsInfected: number;
    patientsInfected: number;
    infectionPercent: number;
    recoveryPercent: number;
    avgTransmissionCost: number;
    budgetUsed: number;
    containmentTime: number | null;
    peakInfectionMinute: number | null;
    highestRiskRoom: RoomId | null;
    transmissionRoute: RoomId[];
  };
  improvements: {
    roomsSaved: number;
    riskReduced: number;
    containmentTimeImproved: number;
    cleaningCostSaved: number;
  };
}

export interface OutbreakReport {
  caseStudy: string;
  disease: string;
  patientZero: string;
  originRoom: string;
  duration: string;
  totalPatients: number;
  totalStaff: number;
  roomsInfected: number;
  patientsInfected: number;
  highestRiskRoom: string;
  bfsResult: string;
  dijkstraResult: string;
  floydResult: string;
  heapRanking: string;
  mergeSortOrder: string;
  knapsackAllocation: string;
  interventions: string[];
  recoveryPercent: number;
  finalRiskPercent: number;
  cleaningCost: number;
  lessonsLearned: string[];
  recommendations: string[];
}

export const ROOM_IDS: RoomId[] = [
  'reception', 'waiting-area', 'emergency', 'general-ward', 'radiology',
  'pharmacy', 'doctor-cabin', 'sanitization-room', 'ward-1', 'ward-2',
  'icu', 'isolation-ward', 'laboratory',
];

export const TOTAL_ROOMS = 13;
