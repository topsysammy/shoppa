import { ShaderFill } from '@/lib/shader-runtime';
import { setup, render, manifest } from '@/lib/shader-runtime/effects/water-caustic';

// Exact parameters from the Figma Home banner layer (screen 13).
const shader = {
  setup,
  render,
  manifest,
  params: {
    center: { x: 50, y: 50 },
    scale: 1,
    playhead: 0,
    highlightColor: { r: 0.14627337455749512, g: 0.7315812110900879, b: 0.37697815895080566, a: 1 },
    waterColor: { r: 0.12156862765550613, g: 0.658823549747467, b: 0.3333333432674408, a: 1 },
    intensity: 0.5,
  },
};

export default function BannerCaustic() {
  return <ShaderFill className="absolute inset-0 rounded-18" shader={shader} />;
}
