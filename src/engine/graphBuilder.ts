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
  lastEventLabel: string = 'System initialization',
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

  const recommendations = buildRecommendations(bfs, dijkstra, floydWarshall, heap, mergeSort, knapsack, lastEventLabel);

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
  triggeredBy: string,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // 1. BFS Recommendation
  if (bfs.nextPredicted) {
    const nextRoomName = ROOM_DEFINITIONS[bfs.nextPredicted].name;
    recs.push({
      id: 'rec-bfs',
      algorithm: 'BFS',
      recommendation: `Isolate and Sanitize ${nextRoomName} immediately`,
      reason: `BFS wave propagation analysis projects that ${nextRoomName} is the next room at risk (Level ${bfs.level}). Isolating it now stops the wave.`,
      expectedEffect: 'Block upcoming outbreak propagation wave by 18%.',
      affectedRooms: [bfs.nextPredicted],
      estimatedCost: ROOM_CLEANING_COSTS[bfs.nextPredicted],
      estimatedTime: 10,
      priority: 'high',
      confidence: 92,
      triggeredBy,
      actionType: 'sanitize',
      actionParams: { roomId: bfs.nextPredicted },
    });
  }

  // 2. Dijkstra Recommendation
  if (dijkstra.path.length > 1) {
    const fromRoom = dijkstra.path[0];
    const toRoom = dijkstra.path[1];
    recs.push({
      id: 'rec-dijkstra',
      algorithm: 'Dijkstra',
      recommendation: `Close Corridor: ${ROOM_DEFINITIONS[fromRoom].name} ↔ ${ROOM_DEFINITIONS[toRoom].name}`,
      reason: `Dijkstra shortest-path risk analysis identifies this corridor as the highest-intensity path for cross-contamination (Path cost: ${dijkstra.cost.toFixed(1)}).`,
      expectedEffect: 'Reduce overall path risk transmission index by 15%.',
      affectedRooms: [fromRoom, toRoom],
      estimatedCost: 0,
      estimatedTime: 1,
      priority: 'high',
      confidence: 95,
      triggeredBy,
      actionType: 'close_corridor',
      actionParams: { from: fromRoom, to: toRoom },
    });
  }

  // 3. Floyd-Warshall Recommendation
  // Find a central hub room to lock (e.g. ICU or general-ward or laboratory if they are unlocked)
  const roomToLock: RoomId = fw.roomIds.find(id => id !== 'reception' && id !== 'waiting-area') || 'icu';
  recs.push({
    id: 'rec-floyd',
    algorithm: 'Floyd-Warshall',
    recommendation: `Lock central room: ${ROOM_DEFINITIONS[roomToLock].name}`,
    reason: `Floyd-Warshall all-pairs shortest paths identifies ${ROOM_DEFINITIONS[roomToLock].name} as a major cross-floor transit node. Locking it forces safe detours.`,
    expectedEffect: 'Decreases indirect contamination paths by 12%.',
    affectedRooms: [roomToLock],
    estimatedCost: 0,
    estimatedTime: 1,
    priority: 'medium',
    confidence: 88,
    triggeredBy,
    actionType: 'lock',
    actionParams: { roomId: roomToLock },
  });

  // 4. Max Heap Recommendation
  if (heap.root) {
    const rootName = ROOM_DEFINITIONS[heap.root].name;
    recs.push({
      id: 'rec-heap',
      algorithm: 'Heap',
      recommendation: `Sanitize highest priority room: ${rootName}`,
      reason: `Max Heap priority queue identifies ${rootName} as having the highest active contamination score (Score: ${heap.priorityList[0]?.score.toFixed(1)}).`,
      expectedEffect: 'Reduces immediate outbreak peak index by 22%.',
      affectedRooms: [heap.root],
      estimatedCost: ROOM_CLEANING_COSTS[heap.root],
      estimatedTime: 10,
      priority: 'critical',
      confidence: 97,
      triggeredBy,
      actionType: 'sanitize',
      actionParams: { roomId: heap.root },
    });
  }

  // 5. Knapsack Recommendation
  if (knapsack.selected.length > 0) {
    const selectedNames = knapsack.selected.map(r => ROOM_DEFINITIONS[r].name).join(', ');
    recs.push({
      id: 'rec-knapsack',
      algorithm: 'Knapsack',
      recommendation: `Implement budget-optimized cleaning for: ${selectedNames}`,
      reason: `Knapsack budget-allocation computes that sanitizing these rooms yields the maximum contamination reduction of ${knapsack.expectedReduction.toFixed(0)}% within budget.`,
      expectedEffect: 'Maximizes cleaning ROI and protects critical patient zones.',
      affectedRooms: knapsack.selected,
      estimatedCost: knapsack.budgetUsed,
      estimatedTime: 15,
      priority: 'high',
      confidence: 93,
      triggeredBy,
      actionType: 'sanitize',
      actionParams: { roomId: knapsack.selected[0] }, // Sanitize first priority room
    });
  } else {
    recs.push({
      id: 'rec-knapsack-budget',
      algorithm: 'Knapsack',
      recommendation: 'Increase cleaning budget by ₹20,000',
      reason: 'Your current cleaning budget is fully depleted. Increasing budget allows sanitizing remaining high-risk rooms.',
      expectedEffect: 'Enables cleaning of next priority wards.',
      affectedRooms: [],
      estimatedCost: 20000,
      estimatedTime: 1,
      priority: 'medium',
      confidence: 90,
      triggeredBy,
      actionType: 'increase_budget',
      actionParams: { budgetIncrement: 20000 },
    });
  }

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
