import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/simulationStore';
import {
  ROOM_DEFINITIONS, riskColor, personColor, statusColor,
  EXTRA_VISUAL_ROOMS, getRoomPosition,
} from '../../data/hospitalData';
import type { Person, RoomId } from '../../types';
import { ROOM_IDS } from '../../types';

type HighlightKind = 'bfs' | 'dijkstra' | 'heap' | 'knapsack' | 'merge' | null;

function useRoomHighlight(roomId: string): HighlightKind {
  const daa = useSimulationStore((s) => s.daa);
  if (daa.bfs.nextPredicted === roomId) return 'bfs';
  if (daa.heap.root === roomId) return 'heap';
  if (daa.knapsack.selected.includes(roomId as RoomId)) return 'knapsack';
  if (daa.dijkstra.path.includes(roomId as RoomId)) return 'dijkstra';
  if (daa.mergeSort.sorted[0]?.roomId === roomId) return 'merge';
  return null;
}

const HIGHLIGHT_COLORS: Record<NonNullable<HighlightKind>, string> = {
  bfs: '#06b6d4',
  dijkstra: '#f59e0b',
  heap: '#ef4444',
  knapsack: '#22c55e',
  merge: '#a855f7',
};

/** Detailed Room Furniture Assets */
function RoomAssets({ assets, w, d }: { assets: string[]; w: number; d: number }) {
  return (
    <group>
      {/* Beds (Ward, ICU, Emergency) */}
      {assets.includes('beds') && (
        <>
          {[-0.28, 0.28].map((x) => (
            <group key={x} position={[w * x, 0, 0]}>
              {/* Bed base */}
              <mesh position={[0, 0.35, 0]} castShadow>
                <boxGeometry args={[2.2, 0.35, 3.4]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
              </mesh>
              {/* Mattress */}
              <mesh position={[0, 0.55, 0.1]} castShadow>
                <boxGeometry args={[2.0, 0.2, 3.0]} />
                <meshStandardMaterial color="#ffffff" roughness={0.9} />
              </mesh>
              {/* Pillow */}
              <mesh position={[0, 0.68, -1.1]} castShadow>
                <boxGeometry args={[1.6, 0.12, 0.8]} />
                <meshStandardMaterial color="#93c5fd" roughness={0.9} />
              </mesh>
              {/* Headboard */}
              <mesh position={[0, 0.7, -1.45]} castShadow>
                <boxGeometry args={[2.2, 0.6, 0.1]} />
                <meshStandardMaterial color="#64748b" metalness={0.4} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* Ventilator (ICU) */}
      {assets.includes('ventilator') && (
        <group position={[w * 0.32, 0.4, -d * 0.25]}>
          {/* Main stand */}
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          {/* Monitor box */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[0.6, 0.6, 0.5]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Glowing vitals graph screen */}
          <mesh position={[0, 0.7, 0.26]}>
            <boxGeometry args={[0.45, 0.45, 0.02]} />
            <meshStandardMaterial color="#000000" emissive="#22c55e" emissiveIntensity={0.5} />
          </mesh>
          {/* Ventilator pipes */}
          <mesh position={[-0.2, 0.3, 0.1]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
            <meshStandardMaterial color="#e2e8f0" transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      {/* MRI Scanner (Radiology) */}
      {assets.includes('mri-scanner') && (
        <group position={[0, 0.8, 0]}>
          {/* Outer ring */}
          <mesh castShadow>
            <torusGeometry args={[1.5, 0.5, 12, 32]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
          </mesh>
          {/* Scanning bed */}
          <mesh position={[0, -0.45, 0]} castShadow>
            <boxGeometry args={[1.2, 0.25, 3.2]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          {/* Pillows/Detail */}
          <mesh position={[0, -0.3, 1.0]}>
            <boxGeometry args={[0.8, 0.1, 0.4]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        </group>
      )}

      {/* CT Scanner (Radiology) */}
      {assets.includes('ct-scanner') && (
        <group position={[w * 0.28, 0.65, 0]}>
          {/* Main scanner ring */}
          <mesh castShadow>
            <boxGeometry args={[2.0, 1.3, 2.0]} />
            <meshStandardMaterial color="#475569" metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 2.05, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      )}

      {/* Microscopes & Lab Equipment (Laboratory) */}
      {assets.includes('microscopes') && (
        <group position={[-w * 0.22, 0.65, 0]}>
          {/* Microscope base */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Ocular tubes */}
          <mesh position={[0, 0.45, 0.1]} rotation={[Math.PI / 6, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      )}

      {/* Reception Desk (Reception) */}
      {assets.includes('reception-desk') && (
        <group position={[0, 0.5, d * 0.22]}>
          {/* Curved counter */}
          <RoundedBox args={[4.2, 1.0, 1.2]} radius={0.06} castShadow>
            <meshStandardMaterial color="#1e3a8a" roughness={0.3} />
          </RoundedBox>
          {/* Top shelf */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[4.2, 0.1, 0.8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* Medicine Shelves (Pharmacy) */}
      {assets.includes('medicine-shelves') && (
        <group position={[0, 1.1, -d * 0.22]}>
          <mesh castShadow>
            <boxGeometry args={[w * 0.7, 2.2, 0.45]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          {/* Simulated colorful medicine boxes */}
          {[-1.2, 0, 1.2].map((x, i) => (
            <mesh key={i} position={[x, 0.3, 0.25]}>
              <boxGeometry args={[0.8, 0.25, 0.1]} />
              <meshStandardMaterial color={i === 0 ? '#10b981' : i === 1 ? '#ef4444' : '#3b82f6'} />
            </mesh>
          ))}
          {[-0.8, 0.8].map((x, i) => (
            <mesh key={`y${i}`} position={[x, -0.4, 0.25]}>
              <boxGeometry args={[0.8, 0.25, 0.1]} />
              <meshStandardMaterial color={i === 0 ? '#f59e0b' : '#ec4899'} />
            </mesh>
          ))}
        </group>
      )}

      {/* Chairs / Waiting Room seats (Reception, Waiting Area, Doctor Cabin) */}
      {assets.includes('chairs') && (
        <group>
          {[[0.25, 0.25], [-0.25, 0.25], [0.25, -0.15], [-0.25, -0.15]].map(([x, z], i) => (
            <group key={i} position={[w * x, 0, d * z]}>
              {/* Chair seat */}
              <mesh position={[0, 0.25, 0]} castShadow>
                <boxGeometry args={[0.7, 0.1, 0.7]} />
                <meshStandardMaterial color="#334155" roughness={0.5} />
              </mesh>
              {/* Chair back */}
              <mesh position={[0, 0.6, -0.3]} castShadow>
                <boxGeometry args={[0.7, 0.6, 0.1]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              {/* Chair legs */}
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.24, 6]} />
                <meshStandardMaterial color="#1e293b" metalness={0.7} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Curtains (Wards) */}
      {assets.includes('curtains') && (
        <group position={[0, 1.2, -d * 0.35]}>
          <mesh castShadow>
            <boxGeometry args={[w * 0.6, 2.4, 0.06]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.65} />
          </mesh>
          {/* Curtain rail */}
          <mesh position={[0, 1.25, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, w * 0.62, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      )}

      {/* Operating Table & Surgical Lights (Operation Theatre) */}
      {assets.includes('operating-table') && (
        <group>
          {/* Base */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.7, 0.5, 12]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
          {/* Table pad */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[3.2, 0.15, 1.2]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* Surgical Dome Lights (Operation Theatre) */}
      {assets.includes('lights') && (
        <group position={[0, 2.8, 0]}>
          {/* Mount rod */}
          <mesh position={[0, -0.4, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          {/* Light dome */}
          <mesh position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]} castShadow>
            <sphereGeometry args={[0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.2} />
          </mesh>
          {/* Emissive surgical light */}
          <mesh position={[0, -0.82, 0]}>
            <cylinderGeometry args={[0.48, 0.48, 0.04, 16]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} />
          </mesh>
          {/* Light glow spotlight */}
          <spotLight position={[0, -0.85, 0]} angle={Math.PI / 6} intensity={3} color="#ffffff" distance={6} />
        </group>
      )}

      {/* Doctor Office Desk (Doctor Cabin) */}
      {assets.includes('desk') && (
        <group position={[0, 0.45, d * 0.15]}>
          <mesh castShadow>
            <boxGeometry args={[2.2, 0.9, 1.2]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.4} />
          </mesh>
          {/* Computer stand & Monitor */}
          <mesh position={[0.2, 0.5, 0]} castShadow>
            <boxGeometry args={[0.6, 0.1, 0.4]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0.2, 0.8, 0.1]} castShadow>
            <boxGeometry args={[0.8, 0.5, 0.06]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.2, 0.8, 0.14]}>
            <boxGeometry args={[0.7, 0.42, 0.01]} />
            <meshStandardMaterial color="#000000" emissive="#06b6d4" emissiveIntensity={0.25} />
          </mesh>
        </group>
      )}

      {/* Patient Monitor (ICU, Emergency, Isolation Ward) */}
      {assets.includes('monitor') && (
        <group position={[-w * 0.3, 1.2, -d * 0.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.55, 0.4]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Glowing display */}
          <mesh position={[0, 0, 0.21]}>
            <boxGeometry args={[0.55, 0.42, 0.02]} />
            <meshStandardMaterial color="#0f172a" emissive="#ef4444" emissiveIntensity={0.35} />
          </mesh>
        </group>
      )}

      {/* IV Stand (ICU, Wards) */}
      {assets.includes('iv-stand') && (
        <group position={[-w * 0.35, 0.85, 0.2]}>
          {/* Metal pole */}
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.7, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
          {/* IV Bag hook */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[0.4, 0.04, 0.04]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          {/* Fluid bags */}
          {[-0.15, 0.15].map((x) => (
            <mesh key={x} position={[x, 0.65, 0]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      )}

      {/* Large Digital Display (Reception, Waiting Area) */}
      {assets.includes('digital-display') && (
        <group position={[0, 1.5, d * 0.44]}>
          <mesh castShadow>
            <boxGeometry args={[2.2, 1.1, 0.1]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Glowing status info */}
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[2.0, 0.9, 0.02]} />
            <meshStandardMaterial color="#020617" emissive="#10b981" emissiveIntensity={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Architectural room with walls, glass windows, door opening, cutaway roof */
function ArchitecturalRoom({
  name, position, size, floor, assets, roomId, contamination, riskLevel, onClick,
}: {
  name: string; position: [number, number, number]; size: [number, number, number];
  floor: 'ground' | 'first'; assets: string[]; roomId: string;
  contamination: number; riskLevel: string; onClick?: () => void;
}) {
  const activeFloor = useSimulationStore((s) => s.activeFloor);
  const selectedRoomId = useSimulationStore((s) => s.selectedRoomId);
  const highlight = useRoomHighlight(roomId);
  const [w, h, d] = size;
  
  // Custom transition from Green -> Yellow -> Orange -> Red -> Purple
  const floorColor = useMemo(() => {
    if (riskLevel === 'locked') return '#7c3aed'; // Purple
    if (contamination >= 0.85) return '#8b5cf6'; // Purple
    if (contamination >= 0.6) return '#dc2626';  // Red
    if (contamination >= 0.35) return '#ea580c'; // Orange
    if (contamination >= 0.15) return '#eab308'; // Yellow
    return '#22c55e'; // Green
  }, [contamination, riskLevel]);

  const selected = selectedRoomId === roomId;
  const hlColor = highlight ? HIGHLIGHT_COLORS[highlight] : null;

  if (activeFloor !== 'all' && floor !== activeFloor) return null;

  const wallMat = { color: '#475569', transparent: true, opacity: 0.82 };
  const doorW = w * 0.28;

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      {/* Floor tile */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[w - 0.2, d - 0.2]} />
        <meshStandardMaterial color={floorColor} transparent opacity={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, h / 2, -d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.25]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* Side walls with glass windows */}
      <group position={[-w / 2, h / 2, 0]}>
        {/* Wall panels */}
        <mesh position={[0, 0, -d * 0.3]} castShadow receiveShadow>
          <boxGeometry args={[0.25, h, d * 0.4]} />
          <meshStandardMaterial {...wallMat} />
        </mesh>
        <mesh position={[0, 0, d * 0.3]} castShadow receiveShadow>
          <boxGeometry args={[0.25, h, d * 0.4]} />
          <meshStandardMaterial {...wallMat} />
        </mesh>
        {/* Glass Window panel */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.08, h * 0.55, d * 0.22]} />
          <meshStandardMaterial color="#06b6d4" transparent opacity={0.4} roughness={0.1} metalness={0.9} />
        </mesh>
      </group>

      <group position={[w / 2, h / 2, 0]}>
        <mesh position={[0, 0, -d * 0.3]} castShadow receiveShadow>
          <boxGeometry args={[0.25, h, d * 0.4]} />
          <meshStandardMaterial {...wallMat} />
        </mesh>
        <mesh position={[0, 0, d * 0.3]} castShadow receiveShadow>
          <boxGeometry args={[0.25, h, d * 0.4]} />
          <meshStandardMaterial {...wallMat} />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.08, h * 0.55, d * 0.22]} />
          <meshStandardMaterial color="#06b6d4" transparent opacity={0.4} roughness={0.1} metalness={0.9} />
        </mesh>
      </group>

      {/* Front wall with door gap */}
      <mesh position={[-(w / 2 - (w - doorW) / 4), h / 2, d / 2]} castShadow>
        <boxGeometry args={[(w - doorW) / 2, h, 0.25]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[(w / 2 - (w - doorW) / 4), h / 2, d / 2]} castShadow>
        <boxGeometry args={[(w - doorW) / 2, h, 0.25]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      
      {/* Brown Door slightly open */}
      <mesh position={[-doorW * 0.45, h * 0.42, d / 2]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[doorW * 0.95, h * 0.84, 0.08]} />
        <meshStandardMaterial color="#78350f" roughness={0.6} />
      </mesh>

      {/* Door frame */}
      <mesh position={[0, h * 0.45, d / 2]}>
        <boxGeometry args={[doorW, h * 0.9, 0.12]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.35} />
      </mesh>

      {/* Exit Sign (Green Glowing Exit box above door) */}
      <mesh position={[0, h * 0.88, d / 2 - 0.1]}>
        <boxGeometry args={[0.6, 0.25, 0.15]} />
        <meshStandardMaterial color="#022c22" emissive="#10b981" emissiveIntensity={1.2} />
      </mesh>

      {/* Ceiling lights */}
      <mesh position={[0, h - 0.05, 0]}>
        <boxGeometry args={[w * 0.2, 0.05, d * 0.2]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>

      {/* Infection heat glow */}
      {contamination > 0.15 && (
        <pointLight position={[0, h * 0.8, 0]} color="#ef4444" intensity={contamination * 3} distance={w} />
      )}

      {/* Algorithm highlight ring */}
      {hlColor && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[w * 0.45, w * 0.52, 32]} />
          <meshBasicMaterial color={hlColor} transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      )}
      {selected && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[w * 0.52, w * 0.58, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      <RoomAssets assets={assets} w={w} d={d} />

      <Html position={[0, h + 0.8, 0]} center distanceFactor={28} zIndexRange={[100, 0]}>
        <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap pointer-events-none shadow-xl border transition-all ${
          highlight === 'bfs' ? 'bg-cyan-500/90 text-white border-cyan-300 shadow-cyan-500/20' :
          highlight === 'heap' ? 'bg-red-500/90 text-white border-red-300 animate-pulse shadow-red-500/20' :
          highlight === 'knapsack' ? 'bg-green-600/90 text-white border-green-300 shadow-green-500/20' :
          highlight === 'dijkstra' ? 'bg-amber-500/90 text-white border-amber-300 shadow-amber-500/20' :
          'bg-slate-900/92 text-white border-slate-700'
        }`}>
          {name}
          {contamination > 0.08 && <span className="ml-1.5 text-orange-300 font-extrabold">{(contamination * 100).toFixed(0)}%</span>}
          {highlight && <span className="ml-1 text-[9px] font-light opacity-80">({highlight})</span>}
        </div>
      </Html>
    </group>
  );
}

/** Animated Low Poly Human Models scaled up by 40% (scale = 1.4) */
function LowPolyHuman({ person }: { person: Person }) {
  const ref = useRef<THREE.Group>(null);
  const selectPerson = useSimulationStore((s) => s.selectPerson);
  const selectedPersonId = useSimulationStore((s) => s.selectedPersonId);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);

  // Position offset logic for clinical checkups / mop sweeping / bed layouts
  const isBedRoom = ['ward-1', 'ward-2', 'icu', 'general-ward', 'emergency'].includes(person.roomId);
  const onBed = isBedRoom && person.action !== 'walking';
  
  // Calculate specific bed positions (offsets) based on ID hashes so multiple patients are distributed
  const bedX = useMemo(() => {
    if (!onBed) return 0;
    const def = ROOM_DEFINITIONS[person.roomId as RoomId];
    if (!def) return 0;
    // Alternate left/right bed
    const side = person.id.charCodeAt(person.id.length - 1) % 2 === 0 ? -0.28 : 0.28;
    return def.size[0] * side;
  }, [onBed, person.id, person.roomId]);

  const bedY = onBed ? 0.7 : 0;
  const bedZ = onBed ? -0.5 : 0;

  useFrame((_, delta) => {
    if (person.action === 'walking') {
      const swing = Math.sin(person.animPhase * 8) * 0.45;
      if (legL.current) legL.current.rotation.x = swing;
      if (legR.current) legR.current.rotation.x = -swing;
      if (armL.current) armL.current.rotation.x = -swing * 0.9;
      if (armR.current) armR.current.rotation.x = swing * 0.9;
      if (ref.current) ref.current.rotation.y = Math.sin(person.animPhase * 2) * 0.05;
    } else {
      // Idle or checkup gestures
      if (legL.current) legL.current.rotation.x = 0;
      if (legR.current) legR.current.rotation.x = 0;
      
      if (person.role === 'cleaning' && armL.current && armR.current) {
        // Mopping sweeping motion
        const sweep = Math.sin(performance.now() * 0.005) * 0.6;
        armL.current.rotation.x = sweep;
        armR.current.rotation.x = sweep;
      } else if ((person.role === 'doctor' || person.role === 'nurse') && armR.current) {
        // Medical checkup pose (checking chart, hands up and down)
        armR.current.rotation.x = -Math.PI / 4 + Math.sin(performance.now() * 0.002) * 0.15;
      } else {
        if (armL.current) armL.current.rotation.x = 0;
        if (armR.current) armR.current.rotation.x = 0;
      }
    }
  });

  const infected = person.status === 'infected';
  const exposed = person.status === 'exposed';
  
  const coatColor = infected ? '#dc2626' :
    person.role === 'doctor' ? '#ffffff' :
    person.role === 'nurse' ? '#2563eb' :
    person.role === 'cleaning' ? '#10b981' :
    person.role === 'security' ? '#1e293b' :
    person.role === 'visitor' ? '#c084fc' : '#93c5fd';

  // Reposition character slightly to stand beside patient if role is Doctor/Nurse in a bed room
  const localPos: [number, number, number] = useMemo(() => {
    if (onBed && person.role === 'patient') {
      return [bedX, bedY, bedZ];
    }
    // Doctors/Nurses stand next to the beds in Ward/ICU if patients are present
    if (isBedRoom && (person.role === 'doctor' || person.role === 'nurse') && person.action !== 'walking') {
      const side = person.id.charCodeAt(person.id.length - 1) % 2 === 0 ? -0.28 : 0.28;
      const def = ROOM_DEFINITIONS[person.roomId as RoomId];
      if (def) {
        // Positioned next to the bed
        return [def.size[0] * side + 1.1, 0.4, -0.5];
      }
    }
    return person.position;
  }, [person.position, person.role, person.roomId, onBed, isBedRoom, bedX, bedY, bedZ]);

  return (
    <group
      ref={ref}
      position={localPos}
      rotation={onBed && person.role === 'patient' ? [Math.PI / 2, 0, Math.PI / 2] : [0, 0, 0]}
      scale={1.4}
      onClick={(e) => { e.stopPropagation(); selectPerson(person.id); }}
    >
      {/* Torso/Gown */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.5, 4, 8]} />
        <meshStandardMaterial color={coatColor} emissive={infected ? '#7f1d1d' : '#000000'} emissiveIntensity={infected ? 0.45 : 0} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#fca5a5" />
      </mesh>

      {/* Doctor / Nurse White/Blue Cap */}
      {(person.role === 'doctor' || person.role === 'nurse') && (
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[0.22, 0.08, 0.22]} />
          <meshStandardMaterial color={person.role === 'doctor' ? '#f8fafc' : '#3b82f6'} />
        </mesh>
      )}

      {/* Left Leg */}
      <mesh ref={legL} position={[-0.1, 0.28, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.32, 4, 6]} />
        <meshStandardMaterial color={person.role === 'patient' ? '#cbd5e1' : '#1e293b'} />
      </mesh>
      {/* Right Leg */}
      <mesh ref={legR} position={[0.1, 0.28, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.32, 4, 6]} />
        <meshStandardMaterial color={person.role === 'patient' ? '#cbd5e1' : '#1e293b'} />
      </mesh>

      {/* Left Arm */}
      <mesh ref={armL} position={[-0.24, 0.82, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.28, 4, 6]} />
        <meshStandardMaterial color={coatColor} />
      </mesh>
      {/* Right Arm */}
      <mesh ref={armR} position={[0.24, 0.82, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.28, 4, 6]} />
        <meshStandardMaterial color={coatColor} />
      </mesh>

      {/* Cleaner Mop tool */}
      {person.role === 'cleaning' && person.action !== 'walking' && (
        <group position={[0.24, 0.68, 0.35]} rotation={[Math.PI / 4, 0, 0]}>
          {/* Mop pole */}
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} />
          </mesh>
          {/* Mop head */}
          <mesh position={[0, -0.6, 0]}>
            <boxGeometry args={[0.25, 0.1, 0.15]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        </group>
      )}

      {/* Patient Zero Indicator overlay */}
      {person.isPatientZero && (
        <group position={[0, 1.8, 0]}>
          {/* Floating glowing label */}
          <Html center distanceFactor={22}>
            <div className="bg-red-600 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded shadow-lg border border-red-300 animate-pulse whitespace-nowrap">
              PATIENT ZERO (P0)
            </div>
          </Html>
          {/* Pulsing ring above head */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 0.35, 24]} />
            <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
          </mesh>
          <pointLight color="#ef4444" intensity={2.5} distance={5} />
        </group>
      )}

      {/* Exposed/Infection Pulse particle */}
      {exposed && (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Selected highlights */}
      {selectedPersonId === person.id && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.44, 24]} />
          <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/** Realistic stairs and Elevator Infrastructure details */
function HospitalInfrastructure() {
  return (
    <group>
      {/* Ground floor corridors */}
      {[
        { pos: [0, 0.04, -18] as [number, number, number], size: [88, 0.08, 3] },
        { pos: [0, 0.04, -2] as [number, number, number], size: [88, 0.08, 3] },
        { pos: [-46, 0.04, -10] as [number, number, number], size: [3, 0.08, 20] },
        { pos: [46, 0.04, -10] as [number, number, number], size: [3, 0.08, 20] },
        { pos: [0, 6.04, -18] as [number, number, number], size: [88, 0.08, 3] },
        { pos: [0, 6.04, -2] as [number, number, number], size: [88, 0.08, 3] },
        { pos: [-46, 6.04, -10] as [number, number, number], size: [3, 0.08, 20] },
        { pos: [46, 6.04, -10] as [number, number, number], size: [3, 0.08, 20] },
      ].map((c, i) => (
        <mesh key={i} position={c.pos} receiveShadow>
          <boxGeometry args={c.size as [number, number, number]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      ))}

      {/* Stairs */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={`st${i}`} position={[44, i * 1 + 0.5, -10]} castShadow>
          <boxGeometry args={[3, 0.18, 2.5]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}

      {/* Stair handrail (Silver metal pipe) */}
      <mesh position={[45.6, 3, -10]} rotation={[0, 0, Math.PI / 6.2]} castShadow>
        <boxGeometry args={[0.06, 7.2, 0.06]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Lift shaft */}
      <mesh position={[44, 3, -6]} castShadow>
        <boxGeometry args={[3.5, 6, 3.5]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.4} metalness={0.6} roughness={0.2} />
      </mesh>
      
      {/* Sliding steel double doors for elevator */}
      {/* Ground Floor Elevator doors */}
      <group position={[44, 1.5, -4.3]}>
        <mesh position={[-0.8, 0, 0]}>
          <boxGeometry args={[1.5, 3, 0.08]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.8, 0, 0]}>
          <boxGeometry args={[1.5, 3, 0.08]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      {/* First Floor Elevator doors */}
      <group position={[44, 7.5, -4.3]}>
        <mesh position={[-0.8, 0, 0]}>
          <boxGeometry args={[1.5, 3, 0.08]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.8, 0, 0]}>
          <boxGeometry args={[1.5, 3, 0.08]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      <Html position={[44, 7.8, -6]} center distanceFactor={30}>
        <div className="text-[10px] font-extrabold text-cyan-400 pointer-events-none">ELEVATOR</div>
      </Html>

      {/* Building base */}
      <mesh position={[0, -0.15, -10]} receiveShadow>
        <boxGeometry args={[92, 0.3, 42]} />
        <meshStandardMaterial color="#090d16" />
      </mesh>
    </group>
  );
}

function DijkstraPathViz() {
  const path = useSimulationStore((s) => s.daa.dijkstra.path);
  const points = useMemo(() => {
    if (path.length < 2) return [];
    return path.map((id) => {
      const p = getRoomPosition(id);
      return new THREE.Vector3(p[0], p[1] + 2, p[2]);
    });
  }, [path]);

  if (points.length < 2) return null;
  return (
    <Line points={points} color="#eab308" lineWidth={3.5} dashed dashSize={1} gapSize={0.5} />
  );
}

/** Detailed Transmission Path Flows & Directional Arrows */
function TransmissionEffects() {
  const events = useSimulationStore((s) => s.transmissionEvents);
  const people = useSimulationStore((s) => s.people);
  const recent = events.slice(-8);
  const flowProgress = useRef(0);

  useFrame((_, delta) => {
    flowProgress.current = (flowProgress.current + delta * 1.5) % 1;
  });

  return (
    <group>
      {recent.map((ev) => {
        const fromP = people.find((p) => p.id === ev.fromId);
        const toP = people.find((p) => p.id === ev.toId);
        const from = fromP ? new THREE.Vector3(...fromP.position.map((v, i) => v + (i === 1 ? 1.2 : 0))) :
          new THREE.Vector3(...getRoomPosition(ev.fromRoom).map((v, i) => v + (i === 1 ? 2 : 0)));
        const to = toP ? new THREE.Vector3(...toP.position.map((v, i) => v + (i === 1 ? 1.2 : 0))) :
          new THREE.Vector3(...getRoomPosition(ev.toRoom).map((v, i) => v + (i === 1 ? 2 : 0)));
        
        // Calculate dynamic particle along line to show infection flow
        const particlePos = new THREE.Vector3().lerpVectors(from, to, flowProgress.current);

        return (
          <group key={ev.id}>
            {/* Glowing line */}
            <Line points={[from, to]} color="#ef4444" lineWidth={3.5} />
            
            {/* Directional Flow sphere */}
            <mesh position={particlePos.toArray()}>
              <sphereGeometry args={[0.22, 8, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>

            {/* Target glow ring */}
            <mesh position={to.toArray()}>
              <sphereGeometry args={[0.38, 8, 8]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Dynamic Camera Controller with smooth LERP focus transitions */
function CameraController() {
  const { camera } = useThree();
  const stateControls = useThree((state) => state.controls) as any;
  const cameraMode = useSimulationStore((s) => s.cameraMode);
  const followedPersonId = useSimulationStore((s) => s.followedPersonId);
  const selectedRoomId = useSimulationStore((s) => s.selectedRoomId);
  const people = useSimulationStore((s) => s.people);

  const targetPos = useRef(new THREE.Vector3(0, 42, 58));
  const targetLookAt = useRef(new THREE.Vector3(0, 3, -10));

  useFrame(() => {
    if (!stateControls) return;

    if (cameraMode === 'top') {
      targetPos.current.set(0, 75, -10);
      targetLookAt.current.set(0, 0, -11);
    } else if (cameraMode === 'ground') {
      targetPos.current.set(0, 18, 52);
      targetLookAt.current.set(0, 1, -10);
    } else if (cameraMode === 'first') {
      targetPos.current.set(0, 24, 52);
      targetLookAt.current.set(0, 7, -10);
    } else if (cameraMode === 'icu') {
      const p = getRoomPosition('icu');
      targetPos.current.set(p[0], p[1] + 12, p[2] + 18);
      targetLookAt.current.set(p[0], p[1], p[2]);
    } else if (cameraMode === 'patientZero') {
      const pz = people.find((p) => p.isPatientZero);
      if (pz) {
        targetPos.current.set(pz.position[0], pz.position[1] + 8, pz.position[2] + 12);
        targetLookAt.current.set(pz.position[0], pz.position[1], pz.position[2]);
      }
    } else if (cameraMode === 'follow') {
      const followed = people.find((p) => p.id === followedPersonId);
      if (followed) {
        targetPos.current.set(followed.position[0], followed.position[1] + 8, followed.position[2] + 12);
        targetLookAt.current.set(followed.position[0], followed.position[1], followed.position[2]);
      }
    } else if (cameraMode === 'free') {
      if (selectedRoomId) {
        const p = getRoomPosition(selectedRoomId);
        targetPos.current.set(p[0], p[1] + 12, p[2] + 18);
        targetLookAt.current.set(p[0], p[1], p[2]);
      } else {
        // Orbit freely, don't LERP
        return;
      }
    }

    stateControls.target.lerp(targetLookAt.current, 0.05);
    camera.position.lerp(targetPos.current, 0.05);
    stateControls.update();
  });

  return null;
}

function SceneContent() {
  const people = useSimulationStore((s) => s.people);
  const rooms = useSimulationStore((s) => s.rooms);
  const selectRoom = useSimulationStore((s) => s.selectRoom);
  const setCameraMode = useSimulationStore((s) => s.setCameraMode);

  // Proximity connection lines calculation inside the 3D twin
  const proximityConnections = useMemo(() => {
    const conns: { id: string; from: [number, number, number]; to: [number, number, number] }[] = [];
    const infectedList = people.filter((p) => p.status === 'infected');
    const healthyOrExposed = people.filter((p) => p.status === 'healthy' || p.status === 'exposed');

    for (const source of infectedList) {
      for (const target of healthyOrExposed) {
        const d = Math.sqrt(
          Math.pow(source.position[0] - target.position[0], 2) +
          Math.pow(source.position[1] - target.position[1], 2) +
          Math.pow(source.position[2] - target.position[2], 2)
        );
        if (d < 3.5) {
          conns.push({
            id: `${source.id}-${target.id}`,
            from: source.position,
            to: target.position,
          });
        }
      }
    }
    return conns;
  }, [people]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[40, 50, 30]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-30, 40, -20]} intensity={0.35} color="#38bdf8" />
      <hemisphereLight args={['#38bdf8', '#090d16', 0.3]} />

      <HospitalInfrastructure />

      {ROOM_IDS.map((id) => {
        const def = ROOM_DEFINITIONS[id];
        const room = rooms[id];
        return (
          <ArchitecturalRoom
            key={id}
            roomId={id}
            name={def.name}
            position={def.position}
            size={def.size}
            floor={def.floor}
            assets={def.assets}
            contamination={room.contamination}
            riskLevel={room.riskLevel}
            onClick={() => selectRoom(id)}
          />
        );
      })}

      {EXTRA_VISUAL_ROOMS.map((room) => (
        <ArchitecturalRoom
          key={room.id}
          roomId={room.id}
          name={room.name}
          position={room.position}
          size={room.size}
          floor={room.floor}
          assets={room.assets}
          contamination={0}
          riskLevel="safe"
        />
      ))}

      <DijkstraPathViz />
      {people.map((p) => <LowPolyHuman key={p.id} person={p} />)}
      <TransmissionEffects />

      {/* Proximity Interaction lines */}
      {proximityConnections.map((c) => (
        <Line key={c.id} points={[c.from, c.to]} color="#f97316" lineWidth={2} dashed dashSize={0.4} gapSize={0.2} />
      ))}

      <CameraController />

      <OrbitControls
        makeDefault enablePan
        maxPolarAngle={Math.PI / 2.05}
        minDistance={12}
        maxDistance={110}
        target={[0, 3, -10]}
        onStart={() => {
          setCameraMode('free');
          selectRoom(null);
        }}
      />
    </>
  );
}

/** Quick Camera buttons overlay */
export function CameraControlsOverlay() {
  const cameraMode = useSimulationStore((s) => s.cameraMode);
  const setCameraMode = useSimulationStore((s) => s.setCameraMode);
  const people = useSimulationStore((s) => s.people);
  const pz = people.find((p) => p.isPatientZero);

  return (
    <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 bg-slate-900/90 p-1.5 rounded-lg border border-slate-700/50 shadow-xl max-w-[260px] md:max-w-none">
      <div className="text-[9px] font-extrabold text-cyan-400 w-full mb-0.5 tracking-wider px-1">CAMERA VIEWPORTS</div>
      {([
        ['top', 'Top View'],
        ['ground', 'Ground Floor'],
        ['first', 'First Floor'],
        ['icu', 'ICU'],
      ] as const).map(([mode, label]) => (
        <button
          key={mode}
          className={`px-2 py-1 text-[10px] font-semibold rounded transition-all duration-150 ${
            cameraMode === mode ? 'bg-cyan-600 text-white shadow shadow-cyan-900/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
          onClick={() => setCameraMode(mode)}
        >
          {label}
        </button>
      ))}
      <button
        disabled={!pz}
        className={`px-2 py-1 text-[10px] font-semibold rounded transition-all duration-150 ${
          cameraMode === 'patientZero' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40'
        }`}
        onClick={() => pz && setCameraMode('patientZero')}
        title={pz ? 'Focus on Patient Zero' : 'Select Patient Zero first'}
      >
        Patient Zero
      </button>
      <button
        disabled={people.length === 0}
        className={`px-2 py-1 text-[10px] font-semibold rounded transition-all duration-150 ${
          cameraMode === 'follow' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40'
        }`}
        onClick={() => {
          const target = pz ?? people.find((p) => p.status === 'infected') ?? people[0];
          if (target) setCameraMode('follow', target.id);
        }}
      >
        Follow Patient
      </button>
      <button
        className="px-2 py-1 text-[10px] font-semibold rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
        onClick={() => setCameraMode('free')}
      >
        Reset Camera
      </button>
    </div>
  );
}

/** Floating explanation banner over the 3D twin */
export function TwinExplanationOverlay() {
  const daa = useSimulationStore((s) => s.daa);
  const status = useSimulationStore((s) => s.status);
  const bfs = daa.bfs;
  const heap = daa.heap;
  const knapsack = daa.knapsack;

  const messages: string[] = [];
  if (bfs.nextPredicted) {
    messages.push(`BFS: ${ROOM_DEFINITIONS[bfs.nextPredicted].name} highlighted — next predicted infection wave (level ${bfs.level}).`);
  }
  if (daa.dijkstra.path.length > 1) {
    messages.push(`Dijkstra: amber path shows highest-risk transmission route (cost ${daa.dijkstra.cost.toFixed(1)}).`);
  }
  if (heap.root) {
    messages.push(`Heap: ${ROOM_DEFINITIONS[heap.root].name} glowing red — highest infection priority.`);
  }
  if (knapsack.selected.length) {
    messages.push(`Knapsack: green highlight on ${knapsack.selected.map((r) => ROOM_DEFINITIONS[r].name).join(', ')} — optimal sanitization under budget.`);
  }

  if (!messages.length && status === 'idle') {
    messages.push('Configure case study, select starting room and Patient Zero, then press Start Outbreak.');
  }

  return (
    <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
      <div className="glass rounded-lg px-3 py-2 text-[11px] text-slate-200 border border-cyan-500/20 max-h-16 overflow-y-auto scroll-thin">
        {messages.map((m, i) => (
          <p key={i} className={i > 0 ? 'mt-0.5 text-slate-400' : 'text-cyan-100'}>{m}</p>
        ))}
      </div>
    </div>
  );
}

export default function HospitalScene() {
  return (
    <div className="w-full h-full relative">
      <CameraControlsOverlay />
      <Canvas shadows camera={{ position: [0, 42, 58], fov: 42 }} className="w-full h-full bg-slate-950">
        <color attach="background" args={['#090d16']} />
        <fog attach="fog" args={['#090d16', 75, 150]} />
        <SceneContent />
      </Canvas>
    </div>
  );
}
