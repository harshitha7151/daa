import type { BfsResult, RoomId } from '../types';
import { ROOM_DEFINITIONS } from '../data/hospitalData';

export function runBfs(
  root: RoomId,
  adjacency: Record<RoomId, RoomId[]>,
  roomContamination: Record<RoomId, number>,
  infectedRooms: Set<RoomId>,
): BfsResult {
  const queue: RoomId[] = [root];
  const visited = new Set<RoomId>([root]);
  const tree: Record<string, RoomId | null> = { [root]: null };
  const levels: RoomId[][] = [[root]];
  let level = 0;
  let qi = 0;

  while (qi < queue.length) {
    const levelSize = queue.length - qi;
    const currentLevel: RoomId[] = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue[qi++];
      for (const neighbor of adjacency[node] ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          tree[neighbor] = node;
          currentLevel.push(neighbor);
        }
      }
    }
    if (currentLevel.length) {
      level++;
      levels.push(currentLevel);
    }
  }

  const frontier = levels[levels.length - 1] ?? [];
  const uninfectedFrontier = frontier.filter((r) => !infectedRooms.has(r));
  const nextPredicted = uninfectedFrontier.sort(
    (a, b) => (roomContamination[b] ?? 0) - (roomContamination[a] ?? 0),
  )[0] ?? frontier[0] ?? null;

  const nextName = nextPredicted ? ROOM_DEFINITIONS[nextPredicted].name : 'None';
  const explanation = nextPredicted
    ? `BFS predicts that ${nextName} is the next room likely to be infected because it is directly connected to the current infection wave at level ${level}.`
    : 'BFS traversal complete — all connected rooms visited.';

  return {
    queue: [...queue],
    visited: [...visited],
    level,
    tree: tree as Record<RoomId, RoomId | null>,
    nextPredicted,
    levels,
    explanation,
    educational: {
      purpose: 'Breadth First Search predicts how the infection spreads level by level across connected hospital rooms.',
      inputs: {
        'Root Node': ROOM_DEFINITIONS[root].name,
        'Visited Rooms': visited.size,
        'Queue Size': queue.length,
      },
      result: `Next predicted room: ${nextName}`,
      clinicalMeaning: nextPredicted
        ? `If ${nextName} is sanitized now, the next infection wave can be delayed.`
        : 'All reachable rooms have been analyzed for propagation risk.',
    },
  };
}
