import type { DijkstraResult, GraphEdge, RoomId } from '../types';
import { ROOM_DEFINITIONS } from '../data/hospitalData';

interface DijkstraCoreResult {
  path: RoomId[];
  cost: number;
  edgeWeights: { from: RoomId; to: RoomId; weight: number; explanation: string }[];
  edgeMap: Map<string, GraphEdge>;
}

/** Core Dijkstra — no safer-path recursion */
function dijkstraCore(
  source: RoomId,
  target: RoomId,
  edges: GraphEdge[],
  adjacency: Record<RoomId, RoomId[]>,
): DijkstraCoreResult {
  const nodes = new Set<RoomId>();
  edges.forEach((e) => {
    nodes.add(e.from);
    nodes.add(e.to);
  });
  Object.keys(adjacency).forEach((k) => nodes.add(k as RoomId));

  const dist: Record<string, number> = {};
  const prev: Record<string, RoomId | null> = {};
  const visited = new Set<string>();

  for (const n of nodes) {
    dist[n] = Infinity;
    prev[n] = null;
  }
  dist[source] = 0;

  const edgeMap = new Map<string, GraphEdge>();
  for (const e of edges) {
    edgeMap.set(`${e.from}|${e.to}`, e);
    edgeMap.set(`${e.to}|${e.from}`, e);
  }

  while (visited.size < nodes.size) {
    let u: RoomId | null = null;
    let minD = Infinity;
    for (const n of nodes) {
      if (!visited.has(n) && dist[n] < minD) {
        minD = dist[n];
        u = n;
      }
    }
    if (u === null || minD === Infinity) break;
    visited.add(u);

    for (const v of adjacency[u] ?? []) {
      const edge = edgeMap.get(`${u}|${v}`);
      if (!edge || edge.closed) continue;
      const alt = dist[u] + edge.weight;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  const path: RoomId[] = [];
  let cur: RoomId | null = target;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
  }

  const edgeWeights = path.slice(0, -1).map((from, i) => {
    const to = path[i + 1];
    const edge = edgeMap.get(`${from}|${to}`);
    return {
      from,
      to,
      weight: edge?.weight ?? Infinity,
      explanation: edge?.explanation ?? 'Direct corridor connection',
    };
  });

  const cost = dist[target] === Infinity ? 999 : dist[target];
  return { path, cost, edgeWeights, edgeMap };
}

export function runDijkstra(
  source: RoomId,
  target: RoomId,
  edges: GraphEdge[],
  adjacency: Record<RoomId, RoomId[]>,
): DijkstraResult {
  const primary = dijkstraCore(source, target, edges, adjacency);
  const penalized = edges.map((e) => ({ ...e, weight: e.weight * 1.8 }));
  const safer = dijkstraCore(source, target, penalized, adjacency);

  const path = primary.path.length > 1 ? primary.path : [source];
  const saferPath = safer.path.length > 1 ? safer.path : path;
  const pathNames = path.map((r) => ROOM_DEFINITIONS[r].name).join(' → ');

  return {
    path,
    saferPath,
    cost: primary.cost,
    saferCost: computePathCost(saferPath, primary.edgeMap),
    edgeWeights: primary.edgeWeights,
    explanation: `Current shortest transmission route is ${pathNames}. Total transmission cost: ${primary.cost.toFixed(2)}.`,
    educational: {
      purpose: 'Dijkstra finds the lowest-cost transmission route through the hospital graph based on dynamic edge weights.',
      inputs: {
        Source: ROOM_DEFINITIONS[source].name,
        Target: ROOM_DEFINITIONS[target].name,
        'Edge Count': edges.length,
      },
      result: `Path cost: ${primary.cost.toFixed(2)}`,
      clinicalMeaning: 'Restricting movement through high-cost corridors can slow pathogen spread to critical care areas.',
    },
  };
}

function computePathCost(path: RoomId[], edgeMap: Map<string, GraphEdge>): number {
  return path.slice(0, -1).reduce((sum, from, i) => {
    const edge = edgeMap.get(`${from}|${path[i + 1]}`);
    return sum + (edge?.weight ?? 5);
  }, 0);
}

export function dijkstraPath(
  source: RoomId,
  target: RoomId,
  edges: GraphEdge[],
  adjacency: Record<RoomId, RoomId[]>,
  lockedRooms: Set<RoomId>,
): RoomId[] {
  const filteredAdj: Record<RoomId, RoomId[]> = {} as Record<RoomId, RoomId[]>;
  for (const [k, v] of Object.entries(adjacency)) {
    if (lockedRooms.has(k as RoomId)) continue;
    filteredAdj[k as RoomId] = v.filter((n) => !lockedRooms.has(n));
  }
  const result = dijkstraCore(source, target, edges, filteredAdj);
  return result.path.length > 1 ? result.path : [source];
}
