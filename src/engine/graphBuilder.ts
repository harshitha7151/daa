import type {
  DaaResults,
  GraphEdge,
  Person,
  Recommendation,
  RoomId,
  RoomState,
  SimulationConfig,
} from '../types';
import { BASE_ADJACENCY, BASE_EDGE_WEIGHTS, CASE_STUDIES, ROOM_CLEANING_COSTS, ROOM_DEFINITIONS, edgeKey } from '../data/hospitalData';
import { runBfs } from '../algorithms/bfs';
import { runDijkstra } from '../algorithms/dijkstra';
import { runFloydWarshall } from '../algorithms/floydWarshall';
import { buildMaxHeap } from '../algorithms/maxHeap';
import { mergeSortRooms } from '../algorithms/mergeSort';
import { runKnapsack, type KnapsackItem } from '../algorithms/knapsack';
import { ROOM_IDS } from '../types';

export function buildAdjacency(rooms: Record<RoomId, RoomState>): Record<RoomId, RoomId[]> {
  const adj: Record<RoomId, RoomId[]> = {} as Record<RoomId, RoomId[]>;
  for (const id of ROOM_IDS) {
    if (rooms[id]?.locked) {
      adj[id] = [];
      continue;
    }
    adj[id] = (BASE_ADJACENCY[id] ?? []).filter((n) => !rooms[n]?.locked);
  }
  return adj;
}

export function buildGraphEdges(
  rooms: Record<RoomId, RoomState>,
  config: SimulationConfig,
  diseaseMultiplier: number,
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const id of ROOM_IDS) {
    for (const neighbor of BASE_ADJACENCY[id] ?? []) {
      const key = edgeKey(id, neighbor);
      if (seen.has(key)) continue;
      seen.add(key);

      const ra = rooms[id];
      const rb = rooms[neighbor];
      const base = BASE_EDGE_WEIGHTS[key] ?? 1.5;
      const crowdFactor = 1 + config.crowdDensity * 0.3;
      const contamFactor = 1 + ((ra?.contamination ?? 0) + (rb?.contamination ?? 0)) * 0.5;
      const cleanFactor = ra?.sanitized && rb?.sanitized ? 0.5 : 1;
      const movementFactor = 1 + ((ra?.occupancy ?? 0) + (rb?.occupancy ?? 0)) * 0.02;
      const weight = base * crowdFactor * contamFactor * cleanFactor * movementFactor * diseaseMultiplier;

      const closed = ra?.corridorClosed?.[neighbor] || rb?.corridorClosed?.[id] || ra?.locked || rb?.locked;

      edges.push({
        from: id,
        to: neighbor,
        baseWeight: base,
        weight: Math.round(weight * 100) / 100,
        closed: !!closed,
        explanation: `Base ${base} × crowd ${crowdFactor.toFixed(2)} × contamination ${contamFactor.toFixed(2)} × cleaning ${cleanFactor}`,
      });
    }
  }
  return edges;
}

export function computeRoomScores(rooms: Record<RoomId, RoomState>): { roomId: RoomId; score: number }[] {
  return ROOM_IDS.map((roomId) => {
    const r = rooms[roomId];
    const score =
      r.contamination * 50 +
      r.occupancy * 3 +
      r.patients.length * 8 +
      (r.riskLevel === 'critical' ? 20 : r.riskLevel === 'high' ? 10 : 0);
    return { roomId, score: Math.round(score * 10) / 10 };
  });
}

export function runAllAlgorithms(
  rooms: Record<RoomId, RoomState>,
  config: SimulationConfig,
  originRoom: RoomId,
  targetRoom: RoomId | null,
): DaaResults {
  const disease = CASE_STUDIES[config.caseStudy];
  const adjacency = buildAdjacency(rooms);
  const edges = buildGraphEdges(rooms, config, disease.spreadMultiplier);
  const contamination: Record<RoomId, number> = {} as Record<RoomId, number>;
  const infectedRooms = new Set<RoomId>();

  for (const id of ROOM_IDS) {
    contamination[id] = rooms[id].contamination;
    if (rooms[id].contamination > 0.3) infectedRooms.add(id);
  }

  const bfs = runBfs(originRoom, adjacency, contamination, infectedRooms);

  const target = targetRoom ?? bfs.nextPredicted ?? 'icu';
  const dijkstra = runDijkstra(originRoom, target, edges, adjacency);

  const getWeight = (a: RoomId, b: RoomId) => {
    const e = edges.find((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));
    return e && !e.closed ? e.weight : Infinity;
  };
  const floydWarshall = runFloydWarshall(ROOM_IDS, getWeight, Math.min(5, ROOM_IDS.length - 1));

  const scores = computeRoomScores(rooms);
  const heap = buildMaxHeap(scores);
  const mergeSort = mergeSortRooms(scores);

  const knapsackItems: KnapsackItem[] = scores
    .filter((s) => s.score > 5)
    .map((s) => ({
      roomId: s.roomId,
      cost: ROOM_CLEANING_COSTS[s.roomId],
      value: Math.min(40, s.score * 0.8),
    }));

  const knapsack = runKnapsack(knapsackItems, config.cleaningBudget, config.cleaningTeams);

  const recommendations = buildRecommendations(bfs, dijkstra, floydWarshall, heap, mergeSort, knapsack);

  return {
    bfs,
    dijkstra,
    floydWarshall,
    heap,
    mergeSort,
    knapsack,
    recommendations,
    currentAlgorithm: 'All algorithms synchronized',
    animationMessage: 'All DAA algorithms recalculated from current hospital state.',
  };
}

function buildRecommendations(
  bfs: DaaResults['bfs'],
  dijkstra: DaaResults['dijkstra'],
  fw: DaaResults['floydWarshall'],
  heap: DaaResults['heap'],
  mergeSort: DaaResults['mergeSort'],
  knapsack: DaaResults['knapsack'],
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (bfs.nextPredicted) {
    recs.push({
      algorithm: 'BFS',
      recommendation: `Isolate ${ROOM_DEFINITIONS[bfs.nextPredicted].name}`,
      reason: `Next propagation level — ${bfs.explanation}`,
      expectedReduction: 18,
      priority: 'high',
      confidence: 92,
    });
  }

  const route = dijkstra.path.map((r) => ROOM_DEFINITIONS[r].name).join(' → ');
  recs.push({
    algorithm: 'Dijkstra',
    recommendation: `Reduce movement through ${route || 'high-cost corridors'}`,
    reason: `Transmission cost ${dijkstra.cost.toFixed(1)} — ${dijkstra.explanation}`,
    expectedReduction: 15,
    priority: 'high',
    confidence: 95,
  });

  recs.push({
    algorithm: 'Floyd-Warshall',
    recommendation: fw.explanation,
    reason: 'All-pairs shortest path analysis reveals indirect transmission routes.',
    expectedReduction: 12,
    priority: 'medium',
    confidence: 88,
  });

  if (heap.root) {
    recs.push({
      algorithm: 'Heap',
      recommendation: `Sanitize ${ROOM_DEFINITIONS[heap.root].name} immediately`,
      reason: heap.explanation,
      expectedReduction: 22,
      priority: 'critical',
      confidence: 97,
    });
  }

  const top4 = mergeSort.sorted.slice(0, 4).map((x, i) => `${i + 1}. ${ROOM_DEFINITIONS[x.roomId].name}`).join(', ');
  recs.push({
    algorithm: 'Merge Sort',
    recommendation: `Intervention order: ${top4}`,
    reason: mergeSort.explanation,
    expectedReduction: 10,
    priority: 'medium',
    confidence: 90,
  });

  const knapsackNames = knapsack.selected.map((r) => ROOM_DEFINITIONS[r].name).join(' and ');
  recs.push({
    algorithm: 'Knapsack',
    recommendation: knapsack.selected.length
      ? `Current budget is sufficient to sanitize ${knapsackNames}`
      : 'Increase cleaning budget to enable optimal room sanitization',
    reason: knapsack.explanation,
    expectedReduction: knapsack.expectedReduction,
    priority: 'high',
    confidence: 93,
  });

  return recs;
}

export function getInfectedRooms(rooms: Record<RoomId, RoomState>): RoomId[] {
  return ROOM_IDS.filter((id) => rooms[id].contamination > 0.25);
}

export function computeRiskScore(rooms: Record<RoomId, RoomState>, people: Person[]): number {
  const roomRisk = ROOM_IDS.reduce((s, id) => s + rooms[id].contamination, 0) / ROOM_IDS.length;
  const infected = people.filter((p) => p.status === 'infected').length;
  const patientRisk = people.length ? infected / people.filter((p) => p.role === 'patient').length : 0;
  return Math.round((roomRisk * 60 + patientRisk * 40) * 100);
}

export function computeRecovery(rooms: Record<RoomId, RoomState>, people: Person[]): number {
  const sanitized = ROOM_IDS.filter((id) => rooms[id].sanitized).length;
  const recovered = people.filter((p) => p.status === 'recovered').length;
  const healthy = people.filter((p) => p.status === 'healthy').length;
  const base = (sanitized / ROOM_IDS.length) * 30 + (recovered / Math.max(1, people.length)) * 40;
  const containment = healthy / Math.max(1, people.length) * 30;
  return Math.min(100, Math.round((base + containment) * 100) / 100);
}
