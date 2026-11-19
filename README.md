# gps-trip-kit

[![CI](https://github.com/senkop/gps-trip-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/senkop/gps-trip-kit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/gps-trip-kit.svg)](https://www.npmjs.com/package/gps-trip-kit)
![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/npm/l/gps-trip-kit.svg)

**Turn a day of raw GPS points into clean trips and stops.**

Every tracking product ends up writing the same code: drop the GPS jumps, find where the vehicle parked, cut the day into trips, report distance and speed, and send a light polyline to the map. `gps-trip-kit` does that in one small, typed, zero-dependency package that runs in Node, Deno, Bun, and the browser.

Built from real fleet-tracking work (dispatch, live maps, and daily trip reports).

```
300 raw points → 3 stops, 2 trips

Trip 1  06:09–06:17  5.00 km  max 42 km/h  polyline 14 chars
Trip 2  06:32–06:39  5.00 km  max 41 km/h  polyline 14 chars
```

## Install

```sh
npm install gps-trip-kit
```

## Quick start

```ts
import { clean, segmentTrips, simplify, encodePolyline } from "gps-trip-kit";

// { lat, lng, time (ms epoch), accuracy? } — straight from your tracker or DB
const points = clean(rawPoints, { maxSpeedKmh: 180, maxAccuracy: 50 });

const { trips, stops } = segmentTrips(points, {
  radius: 60,               // meters: how far a parked device may wander
  minDuration: 3 * 60_000,  // ms: how long it must stay to count as a stop
  maxGap: 10 * 60_000,      // ms: signal silence that ends a trip
  minDistance: 200,         // meters: drop tiny "trips" caused by drift
});

for (const trip of trips) {
  trip.summary.distance;     // meters
  trip.summary.maxSpeed;     // m/s
  trip.summary.movingTime;   // ms
  trip.from, trip.to;        // the stops it connects (if any)
  encodePolyline(simplify(trip.points, 15)); // small string for Google Maps / Mapbox
}
```

## Why not just sum the distances?

A parked GPS device still moves, by 5–20 m every fix. Over a working day that wobble turns into kilometers of driving that never happened. `segmentTrips` measures only the time between stops, so reports match the odometer. The test suite includes this case: summing raw points overcounts a 10 km day by about 1 km.

## API

| Function | What it does |
| --- | --- |
| `clean(points, { maxSpeedKmh?, maxAccuracy? })` | Sorts by time and removes invalid coordinates, `0,0` fixes, duplicate timestamps, low-accuracy fixes, and teleport jumps. Returns a new array. |
| `detectStops(points, { radius?, minDuration? })` | Stay-point detection. Returns `{ lat, lng, start, end, duration, startIndex, endIndex }[]`. |
| `segmentTrips(points, options)` | Splits points into trips between stops and signal gaps. Returns `{ trips, stops }`. Each trip has `points`, `start`, `end`, `from`, `to`, and `summary`. |
| `summarize(points, { idleSpeedKmh?, maxGap? })` | Distance, duration, moving and idle time, and max, average and moving-average speed. |
| `simplify(points, toleranceMeters = 10)` | Douglas–Peucker simplification with the tolerance in meters. Keeps your original objects. Iterative, so it's safe on long tracks. |
| `encodePolyline(points, precision = 5)` / `decodePolyline(str, precision = 5)` | Google Encoded Polyline. Use precision 6 for OSRM and Valhalla. |
| `distance(a, b)`, `pathLength(points)`, `speedBetween(a, b)`, `centroid(points)` | Haversine helpers, in meters and m/s. |

Generic types are preserved, so your extra fields (`deviceId`, `heading`, `ignition`, …) come back through `clean`, `simplify`, and `trip.points` unchanged.

## Defaults

| Option | Default |
| --- | --- |
| `maxSpeedKmh` | 250 |
| `radius` | 60 m |
| `minDuration` | 3 min |
| `maxGap` | 10 min |
| `minDistance` | 200 m |
| `idleSpeedKmh` | 3 km/h |

## Development

```sh
npm install
npm test          # node:test, 17 tests
npm run build     # ESM + CJS + types via tsup
npx tsx examples/daily-report.ts
```

Contributions are welcome. Good next steps include ignition-based trip splitting, a map-matching adapter, and a Dart port for Flutter apps.

## License

MIT © Mostafa Khaled
