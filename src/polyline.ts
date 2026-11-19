import type { LatLng } from "./types.js";

/** Encode coordinates with Google's Encoded Polyline Algorithm (precision 5 by default, 6 for OSRM/Valhalla). */
export function encodePolyline(points: readonly LatLng[], precision = 5): string {
  const factor = 10 ** precision;
  let out = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const p of points) {
    const lat = Math.round(p.lat * factor);
    const lng = Math.round(p.lng * factor);
    out += encodeValue(lat - prevLat) + encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

/** Decode a Google encoded polyline back to coordinates. */
export function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const factor = 10 ** precision;
  const out: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    const dLat = decodeValue();
    const dLng = decodeValue();
    lat += dLat;
    lng += dLng;
    out.push({ lat: lat / factor, lng: lng / factor });
  }
  return out;

  function decodeValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) throw new Error("Invalid polyline: unexpected end of input");
      byte = encoded.charCodeAt(index++) - 63;
      result += (byte & 0x1f) * 2 ** shift;
      shift += 5;
    } while (byte >= 0x20);
    return result % 2 === 1 ? -(result + 1) / 2 : result / 2;
  }
}

function encodeValue(value: number): string {
  let v = value < 0 ? -value * 2 - 1 : value * 2;
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v % 32)) + 63);
    v = Math.floor(v / 32);
  }
  return out + String.fromCharCode(v + 63);
}
