import { pathLength } from "./geo.js";
import { detectStops, type StopOptions } from "./stops.js";
import { summarize, type SummaryOptions } from "./summary.js";
import type { GpsPoint, Stop, Trip } from "./types.js";

export interface TripOptions extends StopOptions, SummaryOptions {
  /** A silence longer than this (ms) ends the current trip. Default 10 minutes. */
  maxGap?: number;
  /** Trips shorter than this many meters are dropped. Default 200. */
  minDistance?: number;
}

/**
 * Split a day of GPS points into trips separated by stops and by signal gaps.
 * Each trip starts at the last point of the stop it left and ends at the
 * first point of the stop it reached, so trips connect cleanly to stops.
 * Expects points sorted by time (run `clean` first).
 */
export function segmentTrips<P extends GpsPoint>(
  points: readonly P[],
  options: TripOptions = {},
): { trips: Trip<P>[]; stops: Stop[] } {
  const maxGap = options.maxGap ?? 10 * 60_000;
  const minDistance = options.minDistance ?? 200;
  const stops = detectStops(points, options);

  // Moving ranges between stops, as [startIndex, endIndex] inclusive.
  const ranges: { from?: Stop; to?: Stop; s: number; e: number }[] = [];
  let cursor = 0;
  let prevStop: Stop | undefined;
  for (const stop of stops) {
    if (stop.startIndex > cursor) {
      ranges.push({ from: prevStop, to: stop, s: cursor, e: stop.startIndex });
    }
    cursor = stop.endIndex;
    prevStop = stop;
  }
  if (cursor < points.length - 1) {
    ranges.push({ from: prevStop, s: cursor, e: points.length - 1 });
  }

  const trips: Trip<P>[] = [];
  for (const r of ranges) {
    // Further split each range on signal gaps.
    let segStart = r.s;
    for (let k = r.s + 1; k <= r.e + 1; k++) {
      const atEnd = k > r.e;
      const gap = !atEnd && points[k].time - points[k - 1].time > maxGap;
      if (!atEnd && !gap) continue;
      const segEnd = k - 1;
      const seg = points.slice(segStart, segEnd + 1);
      if (seg.length >= 2 && pathLength(seg) >= minDistance) {
        trips.push({
          points: seg,
          start: seg[0].time,
          end: seg[seg.length - 1].time,
          from: segStart === r.s ? r.from : undefined,
          to: segEnd === r.e ? r.to : undefined,
          summary: summarize(seg, options),
        });
      }
      segStart = k;
    }
  }
  return { trips, stops };
}
