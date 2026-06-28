import type { MergeSortResult, MergeSortStep, RoomId } from '../types';
import { ROOM_DEFINITIONS } from '../data/hospitalData';

export function mergeSortRooms(items: { roomId: RoomId; score: number }[]): MergeSortResult {
  const steps: MergeSortStep[] = [];

  function merge(
    left: { roomId: RoomId; score: number }[],
    right: { roomId: RoomId; score: number }[],
  ): { roomId: RoomId; score: number }[] {
    const merged: { roomId: RoomId; score: number }[] = [];
    let li = 0;
    let ri = 0;
    while (li < left.length && ri < right.length) {
      if (left[li].score >= right[ri].score) merged.push(left[li++]);
      else merged.push(right[ri++]);
    }
    while (li < left.length) merged.push(left[li++]);
    while (ri < right.length) merged.push(right[ri++]);

    steps.push({
      phase: 'merge',
      left: left.map((x) => x.roomId),
      right: right.map((x) => x.roomId),
      merged: merged.map((x) => x.roomId),
      description: `Merging ${left.map((x) => ROOM_DEFINITIONS[x.roomId].name).join(', ')} with ${right.map((x) => ROOM_DEFINITIONS[x.roomId].name).join(', ')}`,
    });
    return merged;
  }

  function sort(arr: { roomId: RoomId; score: number }[]): { roomId: RoomId; score: number }[] {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);
    steps.push({
      phase: 'divide',
      left: left.map((x) => x.roomId),
      right: right.map((x) => x.roomId),
      merged: [],
      description: `Dividing contamination list into ${left.length} and ${right.length} segments`,
    });
    return merge(sort(left), sort(right));
  }

  const sorted = sort([...items]);
  steps.push({
    phase: 'complete',
    left: [],
    right: [],
    merged: sorted.map((x) => x.roomId),
    description: 'Merge Sort complete — intervention priority ranked',
  });

  const order = sorted.slice(0, 4).map((x, i) => `${i + 1}. ${ROOM_DEFINITIONS[x.roomId].name}`).join('\n');

  return {
    sorted,
    steps,
    explanation: 'Merge Sort ranks intervention priority from highest to lowest contamination.',
    educational: {
      purpose: 'Merge Sort orders all rooms by contamination score for systematic intervention planning.',
      inputs: { 'Room Count': items.length, 'Divide Steps': steps.filter((s) => s.phase === 'divide').length },
      result: `Top priority: ${sorted[0] ? ROOM_DEFINITIONS[sorted[0].roomId].name : 'None'}`,
      clinicalMeaning: `Intervention order:\n${order || 'No rooms require intervention'}`,
    },
  };
}
