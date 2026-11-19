import type { GpsPoint } from "../src/index.js";

const M_PER_DEG = 111_320;

/**
 * A synthetic delivery day in Cairo:
 * 10 min parked at depot → drive ~5 km east at 40 km/h → 15 min at customer
 * → drive back → 10 min parked at depot. One fix every 10 seconds.
 */
export function deliveryDay(start = Date.UTC(2026, 10, 19, 6, 0, 0)): GpsPoint[] {
  const depot = { lat: 30.0444, lng: 31.2357 };
  const kx = M_PER_DEG * Math.cos((depot.lat * Math.PI) / 180);
  const pts: GpsPoint[] = [];
  let t = start;
  const step = 10_000;
  const jitter = (i: number) => (Math.sin(i * 12.9898) * 43758.5453) % 1; // deterministic
  let n = 0;

  const park = (lat: number, lng: number, minutes: number) => {
    for (let k = 0; k < (minutes * 60_000) / step; k++) {
      const j = jitter(n++) * 8 / M_PER_DEG; // ±8 m wobble
      pts.push({ lat: lat + j, lng: lng + j, time: t });
      t += step;
    }
  };
  const drive = (fromLng: number, toLng: number) => {
    const meters = Math.abs(toLng - fromLng) * kx;
    const v = 40 / 3.6;
    const steps = Math.round(meters / (v * (step / 1000)));
    for (let k = 1; k <= steps; k++) {
      pts.push({ lat: depot.lat, lng: fromLng + ((toLng - fromLng) * k) / steps, time: t });
      t += step;
    }
  };

  const customerLng = depot.lng + 5000 / kx;
  park(depot.lat, depot.lng, 10);
  drive(depot.lng, customerLng);
  park(depot.lat, customerLng, 15);
  drive(customerLng, depot.lng);
  park(depot.lat, depot.lng, 10);
  return pts;
}
