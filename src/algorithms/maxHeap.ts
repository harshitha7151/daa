import type { HeapNode, HeapResult, RoomId } from '../types';
import { ROOM_DEFINITIONS } from '../data/hospitalData';

export function buildMaxHeap(scores: { roomId: RoomId; score: number }[]): HeapResult {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const root = sorted[0]?.roomId ?? null;

  function buildTree(items: typeof sorted, start: number, end: number): HeapNode | null {
    if (start >= end) return null;
    const mid = start;
    const node: HeapNode = {
      roomId: items[mid].roomId,
      priority: items[mid].score,
    };
    const leftIdx = 2 * start + 1;
    const rightIdx = 2 * start + 2;
    if (leftIdx < end) {
      const leftEnd = Math.min(end, leftIdx + 1);
      node.left = { roomId: items[leftIdx].roomId, priority: items[leftIdx].score };
      if (leftIdx + 1 < end && items[leftIdx + 1]) {
        node.left = { roomId: items[leftIdx + 1].roomId, priority: items[leftIdx + 1].score };
      }
    }
    if (rightIdx < end) {
      node.right = { roomId: items[rightIdx].roomId, priority: items[rightIdx].score };
    }
    return node;
  }

  const tree = sorted.length > 0 ? buildTree(sorted, 0, Math.min(sorted.length, 7)) : null;
  const rootName = root ? ROOM_DEFINITIONS[root].name : 'None';
  const topScore = sorted[0]?.score ?? 0;

  return {
    tree,
    priorityList: sorted,
    root,
    explanation: root
      ? `${rootName} is currently highest priority (score ${topScore.toFixed(1)}) because of patient density and contamination.`
      : 'No rooms require priority intervention.',
    educational: {
      purpose: 'Max Heap ranks rooms by infection priority, ensuring the highest-risk room is always at the root.',
      inputs: { 'Room Count': scores.length, 'Root Score': topScore.toFixed(1) },
      result: `Highest priority: ${rootName}`,
      clinicalMeaning: `${rootName} should receive immediate sanitization or isolation to reduce outbreak severity.`,
    },
  };
}

export function heapify(arr: { roomId: RoomId; score: number }[]): { roomId: RoomId; score: number }[] {
  const result = [...arr];
  const n = result.length;

  function siftDown(i: number) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < n && result[l].score > result[largest].score) largest = l;
    if (r < n && result[r].score > result[largest].score) largest = r;
    if (largest !== i) {
      [result[i], result[largest]] = [result[largest], result[i]];
      siftDown(largest);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(i);
  return result;
}
