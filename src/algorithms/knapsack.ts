import type { KnapsackResult, KnapsackStep, RoomId } from '../types';
import { ROOM_CLEANING_COSTS, ROOM_DEFINITIONS } from '../data/hospitalData';

export interface KnapsackItem {
  roomId: RoomId;
  cost: number;
  value: number;
}

export function runKnapsack(
  items: KnapsackItem[],
  budget: number,
  maxTeams: number,
): KnapsackResult {
  const n = items.length;
  const cap = Math.floor(budget / 1000);
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(0));
  const keep: boolean[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(false));

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    const w = Math.floor(item.cost / 1000);
    for (let wgt = 0; wgt <= cap; wgt++) {
      dp[i][wgt] = dp[i - 1][wgt];
      if (w <= wgt && dp[i - 1][wgt - w] + item.value > dp[i][wgt]) {
        dp[i][wgt] = dp[i - 1][wgt - w] + item.value;
        keep[i][wgt] = true;
      }
    }
  }

  const steps: KnapsackStep[] = [];
  const selected: RoomId[] = [];
  let wgt = cap;

  steps.push({
    itemIndex: n,
    currentItem: null,
    itemCost: 0,
    itemValue: 0,
    currentBudget: wgt * 1000,
    decision: 'backtrack',
    selectedList: [],
    dpRow: [],
    description: `Constructed Knapsack DP table. Starting backtracking from item count ${n} with capacity ₹${(wgt * 1000).toLocaleString()}.`
  });

  for (let i = n; i > 0; i--) {
    const item = items[i - 1];
    const isKept = keep[i][wgt];
    const itemCost = item.cost;
    const itemValue = item.value;

    if (isKept) {
      selected.push(item.roomId);
      wgt -= Math.floor(itemCost / 1000);
      steps.push({
        itemIndex: i - 1,
        currentItem: item.roomId,
        itemCost,
        itemValue,
        currentBudget: wgt * 1000,
        decision: 'select',
        selectedList: [...selected],
        dpRow: dp[i],
        description: `Backtrack decision: Select "${ROOM_DEFINITIONS[item.roomId].name}" (Value: ${itemValue.toFixed(1)}, Cost: ₹${itemCost.toLocaleString()}). Capacity left: ₹${(wgt * 1000).toLocaleString()}.`
      });
    } else {
      steps.push({
        itemIndex: i - 1,
        currentItem: item.roomId,
        itemCost,
        itemValue,
        currentBudget: wgt * 1000,
        decision: 'reject',
        selectedList: [...selected],
        dpRow: dp[i],
        description: `Backtrack decision: Skip "${ROOM_DEFINITIONS[item.roomId].name}" (Value: ${itemValue.toFixed(1)}, Cost: ₹${itemCost.toLocaleString()}) to preserve remaining budget.`
      });
    }
  }

  const teamLimited = selected.slice(0, maxTeams);
  const rejected = items.filter((x) => !teamLimited.includes(x.roomId)).map((x) => x.roomId);
  const budgetUsed = teamLimited.reduce((s, id) => s + ROOM_CLEANING_COSTS[id], 0);
  const expectedReduction = teamLimited.reduce(
    (s, id) => s + (items.find((x) => x.roomId === id)?.value ?? 0),
    0,
  );

  const selectedNames = teamLimited.map((r) => ROOM_DEFINITIONS[r].name).join(' + ');

  return {
    selected: teamLimited,
    rejected,
    budgetUsed,
    budgetRemaining: budget - budgetUsed,
    expectedReduction,
    explanation: teamLimited.length
      ? `Within the available cleaning budget, sanitizing ${selectedNames} provides the highest overall reduction (${expectedReduction.toFixed(0)}% risk reduction).`
      : 'Insufficient budget for any room sanitization — increase budget or reduce costs.',
    educational: {
      purpose: '0/1 Knapsack optimizes room sanitization selection under budget and team constraints.',
      inputs: { Budget: `₹${budget}`, Teams: maxTeams, 'Candidate Rooms': items.length },
      result: `Selected: ${teamLimited.length} rooms, ${expectedReduction.toFixed(0)}% reduction`,
      clinicalMeaning: 'Resource allocation should prioritize rooms with highest risk-reduction value per rupee spent.',
    },
    steps,
  };
}
