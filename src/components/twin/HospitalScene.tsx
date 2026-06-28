import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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

function RoomAssets({ assets, w, d }: { assets: string[]; w: number; d: number }) {
  return (
    <group>
      {assets.includes('beds') && (
        <>
          {[-0.28, 0.28].map((x) => (
            <group key={x} position={[w * x, 0, 0]}>
              <mesh position={[0, 0.35, 0]} castShadow>
                <boxGeometry args={[2.4, 0.35, 3.5]} />
                <meshStandardMaterial color="#cbd5e1" />
              </mesh>
              <mesh position={[0, 0.7, -1.5]} castShadow>
                <boxGeometry args={[2.4, 0.15, 0.15]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
            </group>
          ))}
        </>
      )}
      {assets.includes('ventilator') && (
        <mesh position={[w * 0.32, 0.9, -d * 0.2]} castShadow>
          <boxGeometry args={[0.7, 1.2, 0.7]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} />
        </mesh>
      )}
      {assets.includes('mri-scanner') && (
        <mesh position={[0, 0.8, 0]} castShadow>
          <torusGeometry args={[1.6, 0.45, 8, 24]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} />
        </mesh>
      )}
      {assets.includes('ct-scanner') && (
        <mesh position={[w * 0.28, 0.65, 0]} castShadow>
          <boxGeometry args={[2.2, 1.1, 2.2]} />
          <meshStandardMaterial color="#475569" metalness={0.5} />
        </mesh>
      )}
      {assets.includes('microscopes') && (
        <mesh position={[-w * 0.22, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 0.9, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      )}
      {assets.includes('reception-desk') && (
        <RoundedBox args={[4, 1, 1.4]} position={[0, 0.5, d * 0.22]} radius={0.08} castShadow>
          <meshStandardMaterial color="#475569" />
        </RoundedBox>
      )}
      {assets.includes('medicine-shelves') && (
        <mesh position={[0, 1.1, -d * 0.22]} castShadow>
          <boxGeometry args={[w * 0.65, 2, 0.5]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      )}
      {assets.includes('chairs') && (
        <>
          {[[0.3, 0.3], [-0.3, 0.3], [0.3, -0.2]].map(([x, z], i) => (
            <mesh key={i} position={[w * x, 0.35, d * z]} castShadow>
              <boxGeometry args={[0.8, 0.8, 0.8]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          ))}
        </>
      )}
      {assets.includes('curtains') && (
        <mesh position={[0, 1.2, -d * 0.38]} castShadow>
          <boxGeometry args={[w * 0.55, 2.2, 0.08]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.55} />
        </mesh>
      )}
      {assets.includes('operating-table') && (
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[3.5, 0.25, 1.4]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      )}
      {assets.includes('lights') && (
        <mesh position={[0, 2.8, 0]}>
          <cylinderGeometry args={[1, 1, 0.2, 16]} />
          <meshStandardMaterial color="#f8fafc" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      )}
      {assets.includes('desk') && (
        <mesh position={[0, 0.5, d * 0.18]} castShadow>
          <boxGeometry args={[2.2, 0.1, 1]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      )}
      {assets.includes('computers') && (
        <mesh position={[0.5, 0.72, d * 0.18]} castShadow>
          <boxGeometry args={[0.6, 0.45, 0.08]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      )}
      {assets.includes('monitor') && (
        <mesh position={[-w * 0.28, 1.1, 0]} castShadow>
          <boxGeometry args={[0.8, 0.55, 0.08]} />
          <meshStandardMaterial color="#0f172a" emissive="#06b6d4" emissiveIntensity={0.15} />
        </mesh>
      )}
      {assets.includes('iv-stand') && (
        <mesh position={[-w * 0.35, 0.9, 0.3]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.8, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
      )}
      {assets.includes('cleaning-equipment') && (
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[1, 1.4, 0.6]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      )}
      {assets.includes('digital-display') && (
        <mesh position={[0, 1.5, d * 0.42]}>
          <boxGeometry args={[2, 1.2, 0.08]} />
          <meshStandardMaterial color="#0f172a" emissive="#06b6d4" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

/** Architectural room with walls, door opening, cutaway roof */
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
  const floorColor = riskColor(riskLevel, contamination);
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
      {/* Side walls */}
      <mesh position={[-w / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, h, d]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, h, d]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* Front wall with door gap */}
      <mesh position={[-(w / 2 - (w - doorW) / 4), h / 2, d / 2]} castShadow>
        <boxGeometry args={[(w - doorW) / 2, h, 0.25]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[(w / 2 - (w - doorW) / 4), h / 2, d / 2]} castShadow>
        <boxGeometry args={[(w - doorW) / 2, h, 0.25]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* Door frame */}
      <mesh position={[0, h * 0.45, d / 2]}>
        <boxGeometry args={[doorW, h * 0.9, 0.12]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.35} />
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
        <div className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap pointer-events-none shadow-lg ${
          highlight === 'bfs' ? 'bg-cyan-500/90 text-white border border-cyan-300' :
          highlight === 'heap' ? 'bg-red-500/90 text-white border border-red-300 animate-pulse' :
          highlight === 'knapsack' ? 'bg-green-600/90 text-white border border-green-300' :
          highlight === 'dijkstra' ? 'bg-amber-500/90 text-white border border-amber-300' :
          'bg-slate-900/92 text-white border border-slate-600'
        }`}>
          {name}
          {contamination > 0.08 && <span className="ml-1.5 text-orange-200">{(contamination * 100).toFixed(0)}%</span>}
          {highlight && <span className="ml-1.5 text-[9px] uppercase opacity-80">[{highlight}]</span>}
        </div>
      </Html>
    </group>
  );
}

function LowPolyHuman({ person }: { person: Person }) {
  const ref = useRef<THREE.Group>(null);
  const selectPerson = useSimulationStore((s) => s.selectPerson);
  const selectedPersonId = useSimulationStore((s) => s.selectedPersonId);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (person.action === 'walking') {
      const swing = Math.sin(person.animPhase * 8) * 0.35;
      if (legL.current) legL.current.rotation.x = swing;
      if (legR.current) legR.current.rotation.x = -swing;
      if (ref.current) ref.current.rotation.y = Math.sin(person.animPhase * 2) * 0.05;
    }
  });

  const infected = person.status === 'infected';
  const exposed = person.status === 'exposed';
  const coatColor = infected ? '#ef4444' :
    person.role === 'doctor' ? '#ffffff' :
    person.role === 'nurse' ? '#2563eb' :
    person.role === 'cleaning' ? '#16a34a' :
    person.role === 'security' ? '#475569' :
    person.role === 'visitor' ? '#a78bfa' : '#e2e8f0';

  return (
    <group ref={ref} position={person.position} onClick={(e) => { e.stopPropagation(); selectPerson(person.id); }}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.55, 4, 8]} />
        <meshStandardMaterial color={coatColor} emissive={infected ? '#7f1d1d' : '#000000'} emissiveIntensity={infected ? 0.4 : 0} />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#fcd9b6" />
      </mesh>
      <mesh ref={legL} position={[-0.12, 0.32, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.38, 4, 6]} />
        <meshStandardMaterial color={person.role === 'patient' ? '#94a3b8' : '#1e293b'} />
      </mesh>
      <mesh ref={legR} position={[0.12, 0.32, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.38, 4, 6]} />
        <meshStandardMaterial color={person.role === 'patient' ? '#94a3b8' : '#1e293b'} />
      </mesh>
      {person.isPatientZero && (
        <>
          <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.32, 0.42, 24]} />
            <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[0, 1.5, 0]} color="#ef4444" intensity={2} distance={4} />
        </>
      )}
      {exposed && (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.85} />
        </mesh>
      )}
      {selectedPersonId === person.id && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.52, 24]} />
          <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

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
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}

      {/* Stairs */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={`st${i}`} position={[44, i * 1 + 0.5, -10]} castShadow>
          <boxGeometry args={[3, 0.18, 2.5]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      ))}

      {/* Lift shaft */}
      <mesh position={[44, 3, -6]} castShadow>
        <boxGeometry args={[3.5, 6, 3.5]} />
        <meshStandardMaterial color="#475569" transparent opacity={0.55} metalness={0.4} />
      </mesh>
      <Html position={[44, 7.5, -6]} center distanceFactor={30}>
        <div className="text-[9px] text-slate-400 pointer-events-none">LIFT</div>
      </Html>

      {/* Building base */}
      <mesh position={[0, -0.15, -10]} receiveShadow>
        <boxGeometry args={[92, 0.3, 42]} />
        <meshStandardMaterial color="#0f172a" />
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
    <Line points={points} color="#f59e0b" lineWidth={3} dashed dashSize={1} gapSize={0.5} />
  );
}

function TransmissionEffects() {
  const events = useSimulationStore((s) => s.transmissionEvents);
  const people = useSimulationStore((s) => s.people);
  const recent = events.slice(-5);

  return (
    <>
      {recent.map((ev) => {
        const fromP = people.find((p) => p.id === ev.fromId);
        const toP = people.find((p) => p.id === ev.toId);
        const from = fromP ? new THREE.Vector3(...fromP.position.map((v, i) => v + (i === 1 ? 1.2 : 0))) :
          new THREE.Vector3(...getRoomPosition(ev.fromRoom).map((v, i) => v + (i === 1 ? 2 : 0)));
        const to = toP ? new THREE.Vector3(...toP.position.map((v, i) => v + (i === 1 ? 1.2 : 0))) :
          new THREE.Vector3(...getRoomPosition(ev.toRoom).map((v, i) => v + (i === 1 ? 2 : 0)));
        return (
          <group key={ev.id}>
            <Line points={[from, to]} color="#ef4444" lineWidth={2} />
            <mesh position={to.toArray()}>
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function SceneContent() {
  const people = useSimulationStore((s) => s.people);
  const rooms = useSimulationStore((s) => s.rooms);
  const selectRoom = useSimulationStore((s) => s.selectRoom);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[40, 50, 30]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-30, 40, -20]} intensity={0.35} color="#38bdf8" />
      <hemisphereLight args={['#38bdf8', '#0f172a', 0.3]} />

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

      <OrbitControls
        makeDefault enablePan
        maxPolarAngle={Math.PI / 2.05}
        minDistance={15}
        maxDistance={120}
        target={[0, 3, -10]}
      />
    </>
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
    <Canvas shadows camera={{ position: [0, 42, 58], fov: 42 }} className="w-full h-full bg-slate-950">
      <color attach="background" args={['#0b1120']} />
      <fog attach="fog" args={['#0b1120', 80, 160]} />
      <SceneContent />
    </Canvas>
  );
}
