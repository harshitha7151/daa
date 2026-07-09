import type { DiseaseParams, Person, RoomId, RoomState, SimulationConfig, TransmissionEvent } from '../types';
import { CASE_STUDIES } from '../data/hospitalData';
import { ROOM_IDS } from '../types';

let txCounter = 0;
let attCounter = 0;

export function runTransmissionStep(
  people: Person[],
  rooms: Record<RoomId, RoomState>,
  config: SimulationConfig,
  minute: number,
): { people: Person[]; rooms: Record<RoomId, RoomState>; events: TransmissionEvent[]; attempts: any[] } {
  const disease = CASE_STUDIES[config.caseStudy];
  const events: TransmissionEvent[] = [];
  const attempts: any[] = [];
  let updatedPeople = people.map((p) => ({ ...p }));
  let updatedRooms = { ...rooms };

  for (const id of ROOM_IDS) {
    updatedRooms[id] = { ...updatedRooms[id] };
  }

  const spreadRate = config.diseaseSpreadSpeed * disease.spreadMultiplier * 0.02;

  for (let i = 0; i < updatedPeople.length; i++) {
    const person = updatedPeople[i];

    if (person.status === 'exposed' && person.exposedAtMinute !== null) {
      // 30x faster incubation for manual demonstration purposes
      const demoIncubation = Math.max(3, disease.incubationMinutes / 30);
      if (minute - person.exposedAtMinute >= demoIncubation) {
        updatedPeople[i] = {
          ...person,
          status: 'infected',
          infectedAtMinute: minute,
          transmissionProb: disease.patientTransmission,
        };
        events.push({
          id: `tx-${++txCounter}`,
          fromId: person.id,
          toId: person.id,
          fromRoom: person.roomId,
          toRoom: person.roomId,
          minute,
          type: 'person',
        });
      }
    }
  }

  const byRoom: Record<string, Person[]> = {};
  for (const p of updatedPeople) {
    if (!byRoom[p.roomId]) byRoom[p.roomId] = [];
    byRoom[p.roomId].push(p);
  }

  for (const roomId of ROOM_IDS) {
    const roomPeople = byRoom[roomId] ?? [];
    const room = updatedRooms[roomId];
    const infectedInRoom = roomPeople.filter((p) => p.status === 'infected');
    if (!infectedInRoom.length) continue;

    const crowdBoost = 1 + room.occupancy * 0.05 * config.crowdDensity;
    const cleanPenalty = room.sanitized ? 0.3 : room.lastSanitizedMinute > 0 ? 0.7 : 1;

    for (const target of roomPeople) {
      if (target.status !== 'healthy') continue;

      for (const source of infectedInRoom) {
        if (source.id === target.id) continue;

        let prob = computeTransmissionProb(source, target, disease, room, crowdBoost, cleanPenalty);
        prob *= spreadRate * 60;

        const rand = Math.random();
        const success = rand < prob;

        attempts.push({
          id: `att-${++attCounter}`,
          minute,
          sourceId: source.id,
          targetId: target.id,
          roomId,
          prob,
          rand,
          success,
        });

        if (success) {
          updatedPeople = updatedPeople.map((p) =>
            p.id === target.id
              ? {
                  ...p,
                  status: 'exposed' as const,
                  exposedAtMinute: minute,
                  interactions: [...p.interactions, source.id],
                  transmissionProb: prob,
                }
              : p,
          );
          events.push({
            id: `tx-${++txCounter}`,
            fromId: source.id,
            toId: target.id,
            fromRoom: roomId,
            toRoom: roomId,
            minute,
            type: 'person',
          });
        }
      }
    }

    const contamIncrease = infectedInRoom.length * 0.002 * crowdBoost * cleanPenalty * config.diseaseSpreadSpeed;
    updatedRooms[roomId] = {
      ...room,
      contamination: Math.min(1, room.contamination + contamIncrease),
      riskLevel: contaminationToRisk(Math.min(1, room.contamination + contamIncrease), room.locked),
    };
  }

  for (const p of updatedPeople.filter((x) => x.role === 'cleaning')) {
    const room = updatedRooms[p.roomId];
    if (room && minute % config.cleaningFrequency === 0) {
      updatedRooms[p.roomId] = {
        ...room,
        contamination: Math.max(0, room.contamination - 0.05 * config.cleaningTeams),
        lastSanitizedMinute: minute,
        sanitized: room.contamination - 0.05 < 0.1,
      };
    }
  }

  return { people: updatedPeople, rooms: updatedRooms, events, attempts };
}

function computeTransmissionProb(
  source: Person,
  target: Person,
  disease: DiseaseParams,
  room: RoomState,
  crowdBoost: number,
  cleanPenalty: number,
): number {
  let base = disease.patientTransmission;

  if (source.role === 'doctor' || target.role === 'doctor') base *= 1.2;
  if (source.role === 'nurse' || target.role === 'nurse') base *= 1.15;
  if (source.role === 'visitor' || target.role === 'visitor') base *= 0.9;

  if (room.id === 'icu') base *= disease.equipmentTransmission;
  if (room.id === 'laboratory') base *= disease.surfaceTransmission * 0.8;

  return base * crowdBoost * cleanPenalty;
}

function contaminationToRisk(c: number, locked: boolean): RoomState['riskLevel'] {
  if (locked) return 'locked';
  if (c >= 0.75) return 'critical';
  if (c >= 0.5) return 'high';
  if (c >= 0.3) return 'moderate';
  if (c >= 0.1) return 'low';
  return 'safe';
}

export function initializeRooms(): Record<RoomId, RoomState> {
  const rooms = {} as Record<RoomId, RoomState>;
  for (const id of ROOM_IDS) {
    rooms[id] = {
      id,
      contamination: 0,
      riskLevel: 'safe',
      occupancy: 0,
      patients: [],
      nurses: [],
      doctors: [],
      visitors: [],
      cleaningStaff: [],
      locked: id === 'isolation-ward',
      sanitized: false,
      lastSanitizedMinute: 0,
      cleaningCost: 0,
      riskReductionValue: 0,
      predictedInfectionMinute: null,
      corridorClosed: {},
    };
  }
  return rooms;
}

export function infectPatientZero(
  people: Person[],
  patientZeroId: string,
  rooms: Record<RoomId, RoomState>,
): { people: Person[]; rooms: Record<RoomId, RoomState> } {
  const updatedPeople = people.map((p) =>
    p.id === patientZeroId
      ? { ...p, status: 'infected' as const, isPatientZero: true, infectedAtMinute: 0, transmissionProb: 0.9 }
      : p,
  );
  const pz = updatedPeople.find((p) => p.id === patientZeroId);
  const updatedRooms = { ...rooms };
  if (pz) {
    updatedRooms[pz.roomId] = {
      ...updatedRooms[pz.roomId],
      contamination: 0.35,
      riskLevel: 'moderate',
    };
  }
  return { people: updatedPeople, rooms: updatedRooms };
}
