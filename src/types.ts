export interface LatLng {
  lat: number;
  lng: number;
}

/** A raw GPS fix as it typically arrives from a tracker or phone. */
export interface GpsPoint extends LatLng {
  /** Unix epoch time in milliseconds. */
  time: number;
  /** Reported horizontal accuracy in meters, if the device sends it. */
  accuracy?: number;
  /** Reported speed in m/s, if the device sends it. Not required by any function. */
  speed?: number;
}

/** A place where the device stayed within `radius` meters for at least `minDuration`. */
export interface Stop extends LatLng {
  start: number;
  end: number;
  /** Duration in milliseconds. */
  duration: number;
  startIndex: number;
  endIndex: number;
}

export interface TripSummary {
  /** Meters. */
  distance: number;
  /** Milliseconds from first to last point. */
  duration: number;
  /** Milliseconds spent above the idle speed threshold. */
  movingTime: number;
  /** Milliseconds spent at or below the idle speed threshold. */
  idleTime: number;
  /** m/s, computed from consecutive points. */
  maxSpeed: number;
  /** m/s over the whole duration. */
  avgSpeed: number;
  /** m/s over moving time only. */
  avgMovingSpeed: number;
}

export interface Trip<P extends GpsPoint = GpsPoint> {
  points: P[];
  start: number;
  end: number;
  /** The stop the trip departed from, if one was detected. */
  from?: Stop;
  /** The stop the trip arrived at, if one was detected. */
  to?: Stop;
  summary: TripSummary;
}
