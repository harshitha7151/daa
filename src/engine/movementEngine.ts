import type { Person, PersonRole, RoomId, SimulationConfig } from '../types';
import { ROOM_DEFINITIONS } from '../data/hospitalData';
import { ROOM_IDS } from '../types';
import { dijkstraPath } from '../algorithms/dijkstra';
import type { GraphEdge, RoomState } from '../types';
import { buildAdjacency, buildGraphEdges } from './graphBuilder';

const PATIENT_ROOMS: RoomId[] = ['ward-1', 'ward-2', 'general-ward', 'icu', 'isolation-ward'];
const DOCTOR_ROOMS: RoomId[] = ['doctor-cabin', 'ward-1', 'ward-2', 'icu', 'general-ward', 'emergency'];
const NURSE_ROOMS: RoomId[] = ['icu', 'ward-1', 'ward-2', 'laboratory', 'general-ward'];
const VISITOR_ROOMS: RoomId[] = ['reception', 'waiting-area', 'ward-1', 'ward-2', 'general-ward'];
const CLEANING_ROOMS: RoomId[] = [...ROOM_IDS];

export function createPopulation(config: SimulationConfig): Person[] {
  const people: Person[] = [];
  let idx = 1;

  const addPerson = (role: PersonRole, roomPool: RoomId[], prefix: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const roomId = roomPool[i % roomPool.length];
      const def = ROOM_DEFINITIONS[roomId];
      const offset: [number, number, number] = [
        def.position[0] + (Math.random() - 0.5) * def.size[0] * 0.6,
        def.position[1] + 0.5,
        def.position[2] + (Math.random() - 0.5) * def.size[2] * 0.6,
      ];
      people.push({
        id: `${prefix}${String(idx++).padStart(2, '0')}`,
        role,
        roomId,
        position: offset,
        targetRoomId: null,
        path: [],
        pathIndex: 0,
        status: 'healthy',
        isPatientZero: false,
        visitedRooms: [roomId],
        interactions: [],
        transmissionProb: 0,
        infectedAtMinute: null,
        exposedAtMinute: null,
        schedule: buildSchedule(role, roomId, i),
        scheduleIndex: 0,
        animPhase: Math.random() * Math.PI * 2,
        walkProgress: 0,
        lastActionMinute: 0,
        action: role === 'visitor' ? 'waiting' : 'standing',
      });
    }
  };

  addPerson('patient', PATIENT_ROOMS, 'P', config.numPatients);
  addPerson('doctor', DOCTOR_ROOMS, 'D', config.numDoctors);
  addPerson('nurse', NURSE_ROOMS, 'N', config.numNurses);
  addPerson('visitor', VISITOR_ROOMS, 'V', config.numVisitors);
  addPerson('cleaning', CLEANING_ROOMS, 'C', config.numCleaningStaff);
  addPerson('security', ['reception', 'emergency', 'waiting-area'], 'S', 2);

  return people;
}

function buildSchedule(role: PersonRole, homeRoom: RoomId, seed: number): RoomId[] {
  switch (role) {
    case 'patient':
      return seed % 3 === 0
        ? [homeRoom, 'laboratory', homeRoom]
        : seed % 3 === 1
          ? [homeRoom, 'radiology', homeRoom]
          : [homeRoom, homeRoom];
    case 'doctor':
      return ['doctor-cabin', 'ward-1', 'icu', 'ward-2', 'general-ward', 'doctor-cabin'];
    case 'nurse':
      return ['icu', 'ward-1', 'ward-2', 'laboratory', 'icu'];
    case 'visitor':
      return ['reception', 'waiting-area', 'ward-1', 'reception'];
    case 'cleaning':
      return ['sanitization-room', 'waiting-area', 'general-ward', 'pharmacy', 'ward-1', 'icu'];
    default:
      return [homeRoom, 'waiting-area', homeRoom];
  }
}

export function updateMovement(
  people: Person[],
  rooms: Record<RoomId, RoomState>,
  config: SimulationConfig,
  minute: number,
  delta: number,
): Person[] {
  const adjacency = buildAdjacency(rooms);
  const edges = buildGraphEdges(rooms, config, 1);
  const locked = new Set(ROOM_IDS.filter((id) => rooms[id].locked));

  return people.map((person) => {
    if (person.status === 'recovered') return person;

    let updated = { ...person };

    const curMin = Math.floor(minute);
    if (!updated.path.length && curMin >= updated.lastActionMinute + 15) {
      const scheduleTarget = updated.schedule[updated.scheduleIndex % updated.schedule.length];
      if (scheduleTarget !== updated.roomId) {
        if (config.restrictPatientMovement && updated.role === 'patient') return updated;
        if (config.restrictStaffMovement && (updated.role === 'doctor' || updated.role === 'nurse')) return updated;

        const path = dijkstraPath(updated.roomId, scheduleTarget, edges, adjacency, locked);
        if (path.length > 1) {
          updated = { ...updated, path, pathIndex: 0, walkProgress: 0, targetRoomId: scheduleTarget, action: 'walking', lastActionMinute: curMin };
        }
      } else {
        updated.scheduleIndex = (updated.scheduleIndex + 1) % updated.schedule.length;
        updated.action = updated.role === 'visitor' ? 'waiting' : 'standing';
        updated.lastActionMinute = curMin;
      }
    }

    if (updated.path.length > 0 && updated.pathIndex < updated.path.length - 1) {
      const fromRoom = updated.roomId;
      const toRoom = updated.path[updated.pathIndex + 1];
      const fromDef = ROOM_DEFINITIONS[fromRoom];
      const toDef = ROOM_DEFINITIONS[toRoom];
      const step = 0.8 * config.simulationSpeed * delta;

      updated.walkProgress = Math.min(1, updated.walkProgress + step);
      updated.animPhase += delta * 8;
      const t = updated.walkProgress;

      updated.position = [
        fromDef.position[0] + (toDef.position[0] - fromDef.position[0]) * t,
        fromDef.position[1] + 0.5 + Math.sin(updated.animPhase * 6) * 0.04,
        fromDef.position[2] + (toDef.position[2] - fromDef.position[2]) * t,
      ];

      if (t >= 1) {
        updated.roomId = toRoom;
        updated.pathIndex++;
        updated.walkProgress = 0;
        if (!updated.visitedRooms.includes(toRoom)) {
          updated.visitedRooms = [...updated.visitedRooms, toRoom];
        }
        if (updated.pathIndex >= updated.path.length - 1) {
          updated.path = [];
          updated.pathIndex = 0;
          updated.targetRoomId = null;
          updated.scheduleIndex = (updated.scheduleIndex + 1) % updated.schedule.length;
          updated.action = 'standing';
        }
      }
    }

    return updated;
  });
}

export function assignRoomOccupancy(people: Person[], rooms: Record<RoomId, RoomState>): Record<RoomId, RoomState> {
  const updated = { ...rooms };
  for (const id of ROOM_IDS) {
    updated[id] = {
      ...updated[id],
      patients: [],
      nurses: [],
      doctors: [],
      visitors: [],
      cleaningStaff: [],
      occupancy: 0,
    };
  }
  for (const p of people) {
    const r = updated[p.roomId];
    if (!r) continue;
    if (p.role === 'patient') r.patients.push(p.id);
    else if (p.role === 'nurse') r.nurses.push(p.id);
    else if (p.role === 'doctor') r.doctors.push(p.id);
    else if (p.role === 'visitor') r.visitors.push(p.id);
    else if (p.role === 'cleaning') r.cleaningStaff.push(p.id);
    r.occupancy++;
  }
  return updated;
}
