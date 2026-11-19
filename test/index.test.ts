import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clean,
  decodePolyline,
  detectStops,
  distance,
  encodePolyline,
  pathLength,
  segmentTrips,
  simplify,
  summarize,
} from "../src/index.js";
import { deliveryDay } from "./fixtures.js";

const near = (actual: number, expected: number, tol: number, msg?: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, msg ?? `${actual} not within ${tol} of ${expected}`);

describe("distance", () => {
  it("matches a known city pair (Cairo → Alexandria ≈ 179 km)", () => {
    const d = distance({ lat: 30.0444, lng: 31.2357 }, { lat: 31.2001, lng: 29.9187 });
    near(d, 179_000, 2_000);
  });
  it("is zero for the same point", () => {
    assert.equal(distance({ lat: 1, lng: 2 }, { lat: 1, lng: 2 }), 0);
  });
});

describe("clean", () => {
  it("sorts, dedupes timestamps, and drops teleports, nulls and bad accuracy", () => {
    const base = { lat: 30, lng: 31 };
    const raw = [
      { ...base, time: 20_000 },
      { ...base, time: 0 },
      { ...base, time: 0 }, // duplicate time
      { lat: 0, lng: 0, time: 5_000 }, // null island
      { lat: 31, lng: 31, time: 10_000 }, // 111 km in 10 s
      { ...base, lng: 31.0001, time: 30_000, accuracy: 500 },
      { ...base, lng: 31.0002, time: 40_000 },
    ];
    const out = clean(raw, { maxAccuracy: 100 });
    assert.deepEqual(
      out.map((p) => p.time),
      [0, 20_000, 40_000],
    );
  });
  it("does not mutate the input", () => {
    const raw = [
      { lat: 30, lng: 31, time: 2 },
      { lat: 30, lng: 31, time: 1 },
    ];
    clean(raw);
    assert.equal(raw[0].time, 2);
  });
});

describe("detectStops", () => {
  it("finds depot, customer and depot again", () => {
    const stops = detectStops(deliveryDay());
    assert.equal(stops.length, 3);
    near(stops[1].duration, 15 * 60_000, 30_000);
    near(distance(stops[0], stops[2]), 0, 20);
    near(distance(stops[0], stops[1]), 5000, 100);
  });
  it("ignores short pauses", () => {
    const stops = detectStops(deliveryDay(), { minDuration: 20 * 60_000 });
    assert.equal(stops.length, 0);
  });
});

describe("segmentTrips", () => {
  it("returns two ~5 km trips linked to their stops", () => {
    const { trips, stops } = segmentTrips(deliveryDay());
    assert.equal(trips.length, 2);
    for (const t of trips) {
      near(t.summary.distance, 5000, 150);
      near(t.summary.maxSpeed * 3.6, 40, 6); // stop wobble at the edges adds a little
      assert.ok(t.from && t.to);
    }
    assert.equal(trips[0].from, stops[0]);
    assert.equal(trips[0].to, stops[1]);
    assert.equal(trips[1].from, stops[1]);
  });
  it("splits on signal gaps", () => {
    const day = deliveryDay();
    // Remove the middle of the first drive and shift later fixes by 20 min.
    const firstDriveMid = 60 + 20;
    const withGap = day
      .filter((_, i) => i !== firstDriveMid)
      .map((p, i) => (i >= firstDriveMid ? { ...p, time: p.time + 20 * 60_000 } : p));
    const { trips } = segmentTrips(withGap);
    assert.equal(trips.length, 3);
  });
  it("handles empty and single-point input", () => {
    assert.deepEqual(segmentTrips([]).trips, []);
    assert.deepEqual(segmentTrips([{ lat: 1, lng: 1, time: 0 }]).trips, []);
  });
});

describe("summarize", () => {
  it("measures a clean drive exactly", () => {
    const { trips } = segmentTrips(deliveryDay());
    const s = summarize(trips[0].points);
    near(s.distance, 5000, 150);
    near(s.avgMovingSpeed * 3.6, 40, 3);
    near(s.duration, 7.5 * 60_000, 30_000);
  });
  it("shows why raw totals overcount: parked GPS wobble adds fake distance", () => {
    const raw = summarize(deliveryDay()).distance;
    const trips = segmentTrips(deliveryDay()).trips.reduce((s, t) => s + t.summary.distance, 0);
    near(trips, 10_000, 300);
    assert.ok(raw > trips + 500, `raw ${raw} vs trips ${trips}`);
  });
});

describe("simplify", () => {
  it("collapses a straight line to its endpoints and keeps extra fields", () => {
    const line = Array.from({ length: 100 }, (_, i) => ({ lat: 30, lng: 31 + i * 0.0001, time: i }));
    const s = simplify(line, 1);
    assert.equal(s.length, 2);
    assert.equal(s[1].time, 99);
  });
  it("keeps a corner", () => {
    const pts = [
      { lat: 30, lng: 31 },
      { lat: 30, lng: 31.01 },
      { lat: 30.01, lng: 31.01 },
    ];
    assert.equal(simplify(pts, 10).length, 3);
  });
  it("shrinks a real day a lot without losing much length", () => {
    const day = deliveryDay();
    const s = simplify(day, 15);
    assert.ok(s.length < day.length / 5, `${s.length} vs ${day.length}`);
    near(pathLength(s), 10_000, 300);
  });
});

describe("polyline", () => {
  it("matches Google's reference example", () => {
    const pts = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    assert.equal(encodePolyline(pts), "_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), pts);
  });
  it("round-trips at precision 6", () => {
    const pts = [
      { lat: 30.044412, lng: 31.235712 },
      { lat: -33.868819, lng: 151.209295 },
    ];
    assert.deepEqual(decodePolyline(encodePolyline(pts, 6), 6), pts);
  });
  it("throws on truncated input", () => {
    assert.throws(() => decodePolyline("_p~iF~ps|U_"));
  });
});
