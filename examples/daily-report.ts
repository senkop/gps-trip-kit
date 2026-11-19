// Run with: npx tsx examples/daily-report.ts
import { clean, encodePolyline, segmentTrips, simplify } from "../src/index.js";
import { deliveryDay } from "../test/fixtures.js";

const raw = deliveryDay();
const points = clean(raw, { maxSpeedKmh: 180 });
const { trips, stops } = segmentTrips(points, { radius: 60, minDuration: 3 * 60_000 });

const fmt = (ms: number) => new Date(ms).toISOString().slice(11, 16);
console.log(`${raw.length} raw points → ${stops.length} stops, ${trips.length} trips\n`);
for (const [i, t] of trips.entries()) {
  const s = t.summary;
  const line = encodePolyline(simplify(t.points, 15));
  console.log(
    `Trip ${i + 1}  ${fmt(t.start)}–${fmt(t.end)}  ` +
      `${(s.distance / 1000).toFixed(2)} km  max ${(s.maxSpeed * 3.6).toFixed(0)} km/h  ` +
      `polyline ${line.length} chars`,
  );
}
