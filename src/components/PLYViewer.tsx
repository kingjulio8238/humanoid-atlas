import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

// Global geometry cache - parsed geometries persist across mounts/tab switches
const geometryCache = new Map<string, THREE.BufferGeometry>();
const loadingPromises = new Map<string, Promise<THREE.BufferGeometry>>();

function loadPLY(url: string): Promise<THREE.BufferGeometry> {
  if (geometryCache.has(url)) {
    return Promise.resolve(geometryCache.get(url)!);
  }
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }
  const promise = new Promise<THREE.BufferGeometry>((resolve) => {
    const loader = new PLYLoader();
    loader.load(url, (geo) => {
      geometryCache.set(url, geo);
      loadingPromises.delete(url);
      resolve(geo);
    });
  });
  loadingPromises.set(url, promise);
  return promise;
}

// Preload a model without rendering - call early to start fetching
export function preloadPLY(url: string) {
  loadPLY(url);
}

interface RegionBounds {
  min: [number, number, number];
  max: [number, number, number];
}

interface Region {
  id: string;
  label: string;
  bounds: RegionBounds[];
  color: string;
}

function isInBounds(x: number, y: number, z: number, bounds: RegionBounds[]): boolean {
  return bounds.some(b =>
    x >= b.min[0] && x <= b.max[0] &&
    y >= b.min[1] && y <= b.max[1] &&
    z >= b.min[2] && z <= b.max[2]
  );
}

// Sub-component: the base point cloud
function PointCloud({ url, color = '#1a1a1a', initialRotation, spinSpeed = 1, scale = 1.05, onGeometryReady }: {
  url: string; color?: string; initialRotation?: [number, number, number]; spinSpeed?: number; scale?: number;
  onGeometryReady?: (geo: THREE.BufferGeometry) => void;
}) {
  const ref = useRef<THREE.Points>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let disposed = false;
    setGeometry(null);
    loadPLY(url).then((geo) => {
      if (disposed) return;
      const clone = geo.clone();
      if (initialRotation) {
        clone.rotateX(initialRotation[0]);
        clone.rotateY(initialRotation[1]);
        clone.rotateZ(initialRotation[2]);
      }
      clone.center();
      clone.computeBoundingSphere();
      const s = scale / (clone.boundingSphere?.radius || 1);
      clone.scale(s, s, s);
      setGeometry(clone);
      onGeometryReady?.(clone);
    });
    return () => { disposed = true; };
  }, [url, initialRotation, scale]);

  useEffect(() => {
    return () => { geometry?.dispose(); };
  }, [geometry]);

  const c = useMemo(() => new THREE.Color(color), [color]);
  const vertexCount = geometry?.attributes.position?.count || 20000;
  const densityScale = Math.min(1.0, 20000 / vertexCount);
  const adaptedSize = 1.2 * (0.3 + 0.7 * densityScale);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
      uniform float uSize;
      uniform float uPixelRatio;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float sizeVariation = 0.7 + 0.6 * fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
        gl_PointSize = uSize * uPixelRatio * sizeVariation * (3.0 / -mvPosition.z);
      }
    `,
        fragmentShader: `
      uniform vec3 uColor;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        if (dot(center, center) > 0.25) discard;
        gl_FragColor = vec4(uColor, 0.6);
      }
    `,
        uniforms: {
          uSize: { value: adaptedSize },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uColor: { value: c },
        },
        transparent: true,
        depthWrite: false,
      }),
    [c, adaptedSize]
  );

  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);

  useFrame(() => {
    if (ref.current && spinSpeed > 0) {
      ref.current.rotation.y += 0.012 * spinSpeed;
    }
  });

  if (!geometry) return null;
  return <points ref={ref} geometry={geometry} material={material} />;
}

// Sub-component: highlight overlay for selected region
function RegionHighlight({ geometry, region, densityScale }: {
  geometry: THREE.BufferGeometry; region: Region; densityScale: number;
}) {
  const highlightGeo = useMemo(() => {
    const positions = geometry.attributes.position.array;
    const filtered: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      if (isInBounds(positions[i], positions[i + 1], positions[i + 2], region.bounds)) {
        filtered.push(positions[i], positions[i + 1], positions[i + 2]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(filtered, 3));
    return geo;
  }, [geometry, region]);

  useEffect(() => {
    return () => { highlightGeo.dispose(); };
  }, [highlightGeo]);

  const highlightColor = useMemo(() => new THREE.Color(region.color), [region.color]);
  const adaptedSize = 1.6 * (0.3 + 0.7 * densityScale);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
      uniform float uSize;
      uniform float uPixelRatio;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float sizeVariation = 0.7 + 0.6 * fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
        gl_PointSize = uSize * uPixelRatio * sizeVariation * (3.0 / -mvPosition.z);
      }
    `,
        fragmentShader: `
      uniform vec3 uColor;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        if (dot(center, center) > 0.25) discard;
        gl_FragColor = vec4(uColor, 0.85);
      }
    `,
        uniforms: {
          uSize: { value: adaptedSize },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uColor: { value: highlightColor },
        },
        transparent: true,
        depthWrite: false,
      }),
    [highlightColor, adaptedSize]
  );

  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);

  return <points geometry={highlightGeo} material={material} />;
}

// Sub-component: invisible hit meshes for region click detection
function HitMeshes({ regions, onRegionClick }: {
  regions: Region[]; onRegionClick: (regionId: string) => void;
}) {
  const handleClick = useCallback((e: { stopPropagation: () => void }, regionId: string) => {
    e.stopPropagation();
    onRegionClick(regionId);
  }, [onRegionClick]);

  return (
    <>
      {regions.flatMap(region =>
        region.bounds.map((b, i) => {
          const cx = (b.min[0] + b.max[0]) / 2;
          const cy = (b.min[1] + b.max[1]) / 2;
          const cz = (b.min[2] + b.max[2]) / 2;
          const sx = b.max[0] - b.min[0];
          const sy = b.max[1] - b.min[1];
          const sz = b.max[2] - b.min[2];
          return (
            <mesh
              key={`${region.id}-${i}`}
              position={[cx, cy, cz]}
              onClick={(e) => handleClick(e, region.id)}
              onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = ''; }}
            >
              <boxGeometry args={[sx, sy, sz]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          );
        })
      )}
    </>
  );
}

interface PLYViewerProps {
  modelUrl: string;
  className?: string;
  color?: string;
  initialRotation?: [number, number, number];
  spinSpeed?: number;
  scale?: number;
  interactive?: boolean;
  regions?: Region[];
  selectedRegion?: string | null;
  onRegionClick?: (regionId: string) => void;
}

export default function PLYViewer({ modelUrl, className, color, initialRotation, spinSpeed, scale, interactive, regions, selectedRegion, onRegionClick }: PLYViewerProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  const activeRegion = useMemo(() => {
    if (!selectedRegion || !regions) return null;
    return regions.find(r => r.id === selectedRegion) || null;
  }, [selectedRegion, regions]);

  const vertexCount = geometry?.attributes.position?.count || 20000;
  const densityScale = Math.min(1.0, 20000 / vertexCount);

  const effectiveSpinSpeed = interactive ? 0 : (spinSpeed ?? 1);

  return (
    <div className={`ply-viewer ${className || ''}`}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <PointCloud
          url={modelUrl}
          color={color}
          initialRotation={initialRotation}
          spinSpeed={effectiveSpinSpeed}
          scale={scale}
          onGeometryReady={setGeometry}
        />
        {interactive && geometry && activeRegion && (
          <RegionHighlight geometry={geometry} region={activeRegion} densityScale={densityScale} />
        )}
        {interactive && regions && onRegionClick && (
          <HitMeshes regions={regions} onRegionClick={onRegionClick} />
        )}
      </Canvas>
    </div>
  );
}
