import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

const geometryCache = new Map<string, THREE.BufferGeometry>();
const loadingPromises = new Map<string, Promise<THREE.BufferGeometry>>();

export function loadPLY(url: string): Promise<THREE.BufferGeometry> {
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

export function preloadPLY(url: string) {
  loadPLY(url);
}
