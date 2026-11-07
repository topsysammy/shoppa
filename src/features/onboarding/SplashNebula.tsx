import { ShaderFill } from '@/lib/shader-runtime';
import { setup, render, manifest } from '@/lib/shader-runtime/effects/nebula';

// Figma screen 01: Nebula ShaderFill at 15% opacity over the green gradient.
// Parameters are the exact values from the Figma layer.
const shader = {
  setup,
  render,
  manifest,
  params: {
    colorB: { r: 0.10000000149011612, g: 0.30000001192092896, b: 0.8999999761581421, a: 1 },
    seed: 0,
    colorA: { r: 0.5, g: 0.20000000298023224, b: 0.800000011920929, a: 1 },
    colorC: { r: 0.800000011920929, g: 0.10000000149011612, b: 0.5, a: 1 },
    brightness: 0.25999999046325684,
    center: { x: 50, y: 50 },
    travel: 0,
    starDensity: 0.1899999976158142,
  },
};

/** Lazy-loaded so the WebGPU runtime never counts toward the initial JS budget. */
export default function SplashNebula() {
  return <ShaderFill className="absolute inset-0 opacity-15" shader={shader} />;
}
