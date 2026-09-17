// Rough, cheap heuristic to tell capable desktops apart from phones/older
// devices, so the scene can start at a lighter complexity instead of always
// loading the full 30k-star / 3k-asteroid desktop scene and hoping it copes.
// This runs once at module load — no need to react to it changing mid-session.
export function isLowPowerDevice() {
  if (typeof window === 'undefined') return false;

  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 700;
  const fewCores = (navigator.hardwareConcurrency || 8) <= 4;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;

  // Treat it as low-power if it's a touch device with a small screen, OR
  // it simply doesn't report many CPU cores (older laptops, budget phones).
  return (coarsePointer && smallScreen) || fewCores;
}
