import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 3D Hand Pressure Visualizer
 * Loads WebXR hand GLB, colors vertices by pressure values mapped from taxel columns.
 */

// Maps common taxel column name patterns to bone names
// Returns a map of column_name → bone_name for all matched columns
export function autoMapTaxels(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const patterns: [RegExp, string][] = [
    // Thumb
    [/thumb.*(tip|distal)/i, 'thumb-tip'],
    [/thumb.*(pad|prox)/i, 'thumb-phalanx-proximal'],
    [/thumb(?!.*(tip|pad|prox|distal|meta))/i, 'thumb-phalanx-distal'],
    // Index
    [/index.*(tip|distal)/i, 'index-finger-tip'],
    [/index.*(mid|inter)/i, 'index-finger-phalanx-intermediate'],
    [/index.*(base|prox)/i, 'index-finger-phalanx-proximal'],
    // Middle
    [/middle.*(tip|distal)/i, 'middle-finger-tip'],
    [/middle.*(mid|inter)/i, 'middle-finger-phalanx-intermediate'],
    [/middle.*(base|prox)/i, 'middle-finger-phalanx-proximal'],
    // Ring
    [/ring.*(tip|distal)/i, 'ring-finger-tip'],
    [/ring.*(mid|inter)/i, 'ring-finger-phalanx-intermediate'],
    [/ring.*(base|prox)/i, 'ring-finger-phalanx-proximal'],
    // Pinky
    [/pinky.*(tip|distal)/i, 'pinky-finger-tip'],
    [/pinky.*(mid|inter)/i, 'pinky-finger-phalanx-intermediate'],
    [/pinky.*(base|prox)/i, 'pinky-finger-phalanx-proximal'],
    // Palm
    [/palm.*(center|mid)/i, 'wrist'],
    [/palm.*(edge|side)/i, 'pinky-finger-metacarpal'],
  ];

  for (const col of columns) {
    for (const [pattern, bone] of patterns) {
      if (pattern.test(col)) {
        mapping[col] = bone;
        break;
      }
    }
  }

  return mapping;
}

// Pressure → color using a warm heatmap (dark → blue → cyan → yellow → red)
function pressureToColor(value: number, color: THREE.Color): THREE.Color {
  const v = Math.max(0, Math.min(1, value));
  if (v < 0.01) return color.setRGB(0.25, 0.25, 0.28); // dark neutral
  if (v < 0.25) return color.setHSL(0.6, 0.7, 0.2 + v * 1.2); // blue
  if (v < 0.5) return color.setHSL(0.45 - (v - 0.25) * 1.4, 0.8, 0.4 + v * 0.3); // cyan → green
  if (v < 0.75) return color.setHSL(0.15 - (v - 0.5) * 0.4, 0.9, 0.45 + v * 0.15); // yellow → orange
  return color.setHSL(0.0, 0.85, 0.35 + (1 - v) * 0.2); // red
}

interface HandMeshProps {
  modelUrl: string;
  pressures: Record<string, number>;
  taxelToBone: Record<string, string>;
  side: 'left' | 'right';
}

function HandMesh({ modelUrl, pressures, taxelToBone, side }: HandMeshProps) {
  const { scene } = useGLTF(modelUrl);
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const colorsRef = useRef<Float32Array | null>(null);

  // Find the skinned mesh and set up vertex colors
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        meshRef.current = mesh;
        const geo = mesh.geometry;

        // Initialize vertex colors if not present
        if (!geo.attributes.color) {
          const count = geo.attributes.position.count;
          const colors = new Float32Array(count * 3);
          colors.fill(0.25); // dark neutral
          geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          colorsRef.current = colors;
        } else {
          colorsRef.current = geo.attributes.color.array as Float32Array;
        }

        // Enable vertex colors on material
        if (mesh.material instanceof THREE.Material) {
          (mesh.material as THREE.MeshStandardMaterial).vertexColors = true;
          (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
        }
      }
    });
  }, [scene]);

  // Update vertex colors based on pressure data
  useFrame(() => {
    const mesh = meshRef.current;
    const colors = colorsRef.current;
    if (!mesh || !colors) return;

    const geo = mesh.geometry;
    const skinIndex = geo.attributes.skinIndex;
    const skinWeight = geo.attributes.skinWeight;
    if (!skinIndex || !skinWeight) return;

    const skeleton = mesh.skeleton;
    if (!skeleton) return;

    const prefix = side === 'left' ? 'l_' : 'r_';
    const color = new THREE.Color();
    const vertexCount = geo.attributes.position.count;

    // Build bone index → pressure value mapping
    const bonePressure: Record<number, number> = {};
    for (const [taxel, boneName] of Object.entries(taxelToBone)) {
      // Only use columns matching this hand's prefix
      if (!taxel.startsWith(prefix) && !taxel.startsWith(side === 'left' ? 'left' : 'right')) continue;
      const boneIdx = skeleton.bones.findIndex(b => b.name === boneName);
      if (boneIdx >= 0) {
        bonePressure[boneIdx] = pressures[taxel] ?? 0;
      }
    }

    // Also try without prefix for generic column names
    for (const [taxel, boneName] of Object.entries(taxelToBone)) {
      if (taxel.startsWith('l_') || taxel.startsWith('r_') || taxel.startsWith('left') || taxel.startsWith('right')) continue;
      const boneIdx = skeleton.bones.findIndex(b => b.name === boneName);
      if (boneIdx >= 0 && bonePressure[boneIdx] === undefined) {
        bonePressure[boneIdx] = pressures[taxel] ?? 0;
      }
    }

    const siArray = (skinIndex as THREE.BufferAttribute).array;
    const swArray = (skinWeight as THREE.BufferAttribute).array;

    for (let i = 0; i < vertexCount; i++) {
      // Weighted average of pressure from skin weights
      let pressure = 0;
      let totalWeight = 0;
      for (let j = 0; j < 4; j++) {
        const boneIdx = siArray[i * 4 + j];
        const weight = swArray[i * 4 + j];
        if (weight > 0 && bonePressure[boneIdx] !== undefined) {
          pressure += bonePressure[boneIdx] * weight;
          totalWeight += weight;
        }
      }
      if (totalWeight > 0) pressure /= totalWeight;

      pressureToColor(pressure, color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.attributes.color.needsUpdate = true;
  });

  return (
    <primitive
      object={scene}
      scale={side === 'left' ? [8, 8, 8] : [8, 8, -8]}
      position={side === 'left' ? [-0.6, 0, 0] : [0.6, 0, 0]}
      rotation={[0, 0, Math.PI]}
    />
  );
}

interface TactileHand3DProps {
  pressures: Record<string, number>;
  taxelToBone: Record<string, string>;
  hasLeft: boolean;
  hasRight: boolean;
}

export function TactileHand3DScene({ pressures, taxelToBone, hasLeft, hasRight }: TactileHand3DProps) {
  return (
    <div className="db-tactile-3d-canvas">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} gl={{ alpha: true }}>
        <color attach="background" args={['#f5f2ed']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 4]} intensity={0.8} />
        <directionalLight position={[-2, -1, 2]} intensity={0.3} />
        {hasLeft && <HandMesh modelUrl="/models/left-hand.glb" pressures={pressures} taxelToBone={taxelToBone} side="left" />}
        {hasRight && <HandMesh modelUrl="/models/right-hand.glb" pressures={pressures} taxelToBone={taxelToBone} side="right" />}
        <OrbitControls enablePan={false} minDistance={1.5} maxDistance={5} />
      </Canvas>
    </div>
  );
}

// Preload models
useGLTF.preload('/models/left-hand.glb');
useGLTF.preload('/models/right-hand.glb');
