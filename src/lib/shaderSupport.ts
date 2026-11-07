/**
 * Whether to draw the Figma WebGPU shaders (Splash nebula, Home banner).
 * They compute ~20 noise layers per pixel; on phones that can stall or
 * reset the GPU and freeze the page, so they only run on desktop-class
 * devices (fine pointer, 8GB+ memory when reported) without reduced motion.
 * Everywhere else the green gradient underneath shows on its own.
 */
export function canRenderShaders(): boolean {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (!window.matchMedia('(pointer: fine) and (min-width: 1024px)').matches) return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return mem === undefined || mem >= 8;
}
