import type { CaseStudyId, DiseaseParams, RoomDefinition, RoomId, VisualExtraRoom } from '../types';

export const HOSPITAL_NAME = 'Apollo Smart Infection Control Center';

export const CASE_STUDIES: Record<CaseStudyId, DiseaseParams> = {
  mrsa: {
    id: 'mrsa',
    name: 'Methicillin-resistant Staphylococcus aureus',
    shortName: 'MRSA',
    cause: 'Delayed sanitization',
    typicalSpread: ['ward-1', 'waiting-area', 'laboratory', 'icu'],
    surfaceTransmission: 0.85,
    patientTransmission: 0.55,
    equipmentTransmission: 0.78,
    airborneSpread: 0.25,
    cleaningDependency: 0.7,
    incubationMinutes: 45,
    spreadMultiplier: 1.0,
  },
};

export const ROOM_DEFINITIONS: Record<RoomId, RoomDefinition> = {
  reception: {
    id: 'reception', name: 'Reception', floor: 'ground',
    position: [-32, 0, -18], size: [14, 3.5, 11],
    color: '#1e3a5f', assets: ['reception-desk', 'digital-display', 'chairs'],
  },
  'waiting-area': {
    id: 'waiting-area', name: 'Waiting Area', floor: 'ground',
    position: [-14, 0, -18], size: [18, 3.5, 11],
    color: '#1a3352', assets: ['chairs', 'digital-display'],
  },
  emergency: {
    id: 'emergency', name: 'Emergency', floor: 'ground',
    position: [8, 0, -18], size: [16, 3.5, 11],
    color: '#2a1a3a', assets: ['beds', 'monitors'],
  },
  'general-ward': {
    id: 'general-ward', name: 'General Ward', floor: 'ground',
    position: [32, 0, -18], size: [18, 3.5, 11],
    color: '#1a3a4a', assets: ['beds', 'lockers', 'cabinets'],
  },
  radiology: {
    id: 'radiology', name: 'Radiology', floor: 'ground',
    position: [-32, 0, -2], size: [14, 3.5, 11],
    color: '#1e2a4a', assets: ['mri-scanner', 'ct-scanner'],
  },
  pharmacy: {
    id: 'pharmacy', name: 'Pharmacy', floor: 'ground',
    position: [-14, 0, -2], size: [14, 3.5, 11],
    color: '#1a3a3a', assets: ['medicine-shelves', 'billing-counter'],
  },
  'doctor-cabin': {
    id: 'doctor-cabin', name: 'Doctor Cabin', floor: 'ground',
    position: [4, 0, -2], size: [12, 3.5, 11],
    color: '#1a2a4a', assets: ['desk', 'computer', 'chairs'],
  },
  'sanitization-room': {
    id: 'sanitization-room', name: 'Sanitization Room', floor: 'ground',
    position: [22, 0, -2], size: [12, 3.5, 11],
    color: '#1a4a3a', assets: ['cleaning-equipment', 'chemical-storage'],
  },
  'ward-1': {
    id: 'ward-1', name: 'Ward 1', floor: 'first',
    position: [-32, 6, -18], size: [18, 3.5, 11],
    color: '#1a3352', assets: ['beds', 'curtains', 'cabinets'],
  },
  'ward-2': {
    id: 'ward-2', name: 'Ward 2', floor: 'first',
    position: [-10, 6, -18], size: [18, 3.5, 11],
    color: '#1a3352', assets: ['beds', 'curtains', 'cabinets'],
  },
  icu: {
    id: 'icu', name: 'ICU', floor: 'first',
    position: [14, 6, -18], size: [16, 3.5, 11],
    color: '#2a1a2a', assets: ['beds', 'ventilator', 'monitor', 'iv-stand', 'medicine-cart'],
  },
  'isolation-ward': {
    id: 'isolation-ward', name: 'Isolation Ward', floor: 'first',
    position: [36, 6, -18], size: [14, 3.5, 11],
    color: '#3a1a4a', assets: ['beds', 'monitors'],
  },
  laboratory: {
    id: 'laboratory', name: 'Laboratory', floor: 'first',
    position: [-18, 6, -2], size: [22, 3.5, 11],
    color: '#1a2a3a', assets: ['microscopes', 'lab-tables', 'sample-rack', 'computers'],
  },
};

export const EXTRA_VISUAL_ROOMS: VisualExtraRoom[] = [
  {
    id: 'nurse-station', name: 'Nurse Station', floor: 'first',
    position: [8, 6, -2], size: [12, 3.5, 10],
    assets: ['desk', 'computers', 'medicine-cart'],
  },
  {
    id: 'operation-theatre', name: 'Operation Theatre', floor: 'first',
    position: [32, 6, -2], size: [16, 3.5, 11],
    assets: ['operating-table', 'lights', 'monitor'],
  },
];

export function getRoomPosition(id: string): [number, number, number] {
  if (id in ROOM_DEFINITIONS) return ROOM_DEFINITIONS[id as RoomId].position;
  const extra = EXTRA_VISUAL_ROOMS.find((r) => r.id === id);
  return extra?.position ?? [0, 0, 0];
}

/** Adjacency list — corridors connect rooms */
export const BASE_ADJACENCY: Record<RoomId, RoomId[]> = {
  reception: ['waiting-area', 'radiology'],
  'waiting-area': ['reception', 'emergency', 'pharmacy', 'doctor-cabin', 'ward-1'],
  emergency: ['waiting-area', 'general-ward'],
  'general-ward': ['emergency', 'sanitization-room', 'ward-2'],
  radiology: ['reception', 'pharmacy'],
  pharmacy: ['radiology', 'waiting-area', 'doctor-cabin'],
  'doctor-cabin': ['pharmacy', 'waiting-area', 'sanitization-room', 'laboratory'],
  'sanitization-room': ['doctor-cabin', 'general-ward'],
  'ward-1': ['waiting-area', 'ward-2', 'laboratory', 'icu'],
  'ward-2': ['general-ward', 'ward-1', 'icu', 'isolation-ward'],
  icu: ['ward-1', 'ward-2', 'laboratory', 'isolation-ward'],
  'isolation-ward': ['ward-2', 'icu'],
  laboratory: ['doctor-cabin', 'ward-1', 'icu'],
};

export const BASE_EDGE_WEIGHTS: Record<string, number> = {
  'reception|waiting-area': 1.2,
  'reception|radiology': 1.5,
  'waiting-area|emergency': 1.0,
  'waiting-area|pharmacy': 1.1,
  'waiting-area|doctor-cabin': 1.3,
  'waiting-area|ward-1': 2.0,
  'emergency|general-ward': 1.2,
  'general-ward|sanitization-room': 1.0,
  'general-ward|ward-2': 2.0,
  'radiology|pharmacy': 1.4,
  'pharmacy|doctor-cabin': 1.0,
  'doctor-cabin|sanitization-room': 1.1,
  'doctor-cabin|laboratory': 1.8,
  'ward-1|ward-2': 1.0,
  'ward-1|laboratory': 1.5,
  'ward-1|icu': 1.6,
  'ward-2|icu': 1.2,
  'ward-2|isolation-ward': 1.0,
  'icu|laboratory': 1.4,
  'icu|isolation-ward': 1.0,
};

export function edgeKey(a: RoomId, b: RoomId): string {
  return [a, b].sort().join('|');
}

export const ROOM_CLEANING_COSTS: Record<RoomId, number> = {
  reception: 8000,
  'waiting-area': 12000,
  emergency: 15000,
  'general-ward': 18000,
  radiology: 22000,
  pharmacy: 10000,
  'doctor-cabin': 9000,
  'sanitization-room': 7000,
  'ward-1': 20000,
  'ward-2': 20000,
  icu: 35000,
  'isolation-ward': 28000,
  laboratory: 25000,
};

export function formatSimTime(minutes: number): string {
  const h = Math.floor(minutes / 60) + 8;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function riskColor(level: string, contamination: number): string {
  if (level === 'locked') return '#7c3aed'; // Purple
  if (contamination >= 0.85) return '#8b5cf6'; // Purple
  if (contamination >= 0.6) return '#dc2626';  // Red
  if (contamination >= 0.35) return '#ea580c'; // Orange
  if (contamination >= 0.15) return '#eab308'; // Yellow
  return '#10b981'; // Green
}

import type { HealthStatus } from '../types';

export function statusColor(status: HealthStatus): string {
  switch (status) {
    case 'infected': return '#ef4444';
    case 'exposed': return '#f97316';
    case 'recovered': return '#22c55e';
    default: return '#94a3b8';
  }
}

export function personColor(role: string): string {
  switch (role) {
    case 'patient': return '#e2e8f0';
    case 'doctor': return '#ffffff';
    case 'nurse': return '#3b82f6';
    case 'visitor': return '#a78bfa';
    case 'cleaning': return '#22c55e';
    case 'security': return '#64748b';
    default: return '#94a3b8';
  }
}
