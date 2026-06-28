import type { FloydWarshallResult, RoomId } from '../types';
import { ROOM_DEFINITIONS } from '../data/hospitalData';
import { ROOM_IDS } from '../types';

export function runFloydWarshall(
  roomIds: RoomId[],
  getWeight: (from: RoomId, to: RoomId) => number,
  highlightPivot?: number,
): FloydWarshallResult {
  const n = roomIds.length;
  const idx = (id: RoomId) => roomIds.indexOf(id);

  let dist: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)),
  );

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const w = getWeight(roomIds[i], roomIds[j]);
      if (w < Infinity) {
        dist[i][j] = w;
        dist[j][i] = w;
      }
    }
  }

  const updatedCells: [number, number][] = [];
  let explanation = 'All-pairs shortest paths computed.';
  const maxIter = highlightPivot !== undefined ? highlightPivot + 1 : n;

  for (let k = 0; k < maxIter; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const through = dist[i][k] + dist[k][j];
        if (through < dist[i][j]) {
          dist[i][j] = through;
          if (k === (highlightPivot ?? n - 1)) {
            updatedCells.push([i, j]);
          }
        }
      }
    }
    if (highlightPivot === k) {
      const pivotRoom = ROOM_DEFINITIONS[roomIds[k]].name;
      explanation = `Pivot node ${pivotRoom} (k=${k}) updated indirect transmission paths across the hospital.`;
    }
  }

  if (updatedCells.length > 0 && highlightPivot !== undefined) {
    const from = roomIds[updatedCells[0]?.[0] ?? 0];
    const to = roomIds[updatedCells[0]?.[1] ?? 1];
    if (from && to) {
      explanation = `Closing or sanitizing ${ROOM_DEFINITIONS[roomIds[highlightPivot]].name} changed shortest contamination distance between ${ROOM_DEFINITIONS[from].name} and ${ROOM_DEFINITIONS[to].name}.`;
    }
  }

  return {
    matrix: dist,
    roomIds,
    pivot: highlightPivot ?? n - 1,
    iteration: maxIter,
    updatedCells,
    explanation,
    educational: {
      purpose: 'Floyd-Warshall computes all-pairs shortest transmission paths, revealing indirect contamination routes.',
      inputs: { 'Matrix Size': `${n}×${n}`, 'Pivot Node': ROOM_DEFINITIONS[roomIds[highlightPivot ?? 0]].name, Iteration: maxIter },
      result: `${updatedCells.length} cells updated in current iteration`,
      clinicalMeaning: 'Understanding indirect paths helps plan corridor closures that maximize transmission distance.',
    },
  };
}

export function getPairDistance(result: FloydWarshallResult, a: RoomId, b: RoomId): number {
  const i = result.roomIds.indexOf(a);
  const j = result.roomIds.indexOf(b);
  if (i < 0 || j < 0) return Infinity;
  return result.matrix[i][j];
}

export { ROOM_IDS };