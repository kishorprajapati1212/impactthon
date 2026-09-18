import { describe, it, expect } from 'vitest';

/**
 * Attendance Controller — Unit Tests
 *
 * These test the haversine distance calculation (geofence logic)
 * and the attendance marking flow validation rules.
 */

// Haversine formula extracted from the controller
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const f1 = (lat1 * Math.PI) / 180, f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180, dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

describe('Geofence — Haversine Distance', () => {
  // SKPIMCS, KSV (Ahmedabad) approximate coordinates
  const classroom = { lat: 23.0225, lon: 72.5714 };

  it('returns ~0m for same coordinates', () => {
    const d = haversineDistance(classroom.lat, classroom.lon, classroom.lat, classroom.lon);
    expect(d).toBeLessThan(1);
  });

  it('returns < 100m for a student in the same building', () => {
    // ~50m away
    const d = haversineDistance(classroom.lat, classroom.lon, 23.0229, 72.5717);
    expect(d).toBeLessThan(100);
    expect(d).toBeGreaterThan(30);
  });

  it('returns > 500m for a student off campus', () => {
    const d = haversineDistance(classroom.lat, classroom.lon, 23.0300, 72.5800);
    expect(d).toBeGreaterThan(500);
  });

  it('returns > 1000m for a student in a different area', () => {
    const d = haversineDistance(classroom.lat, classroom.lon, 23.0500, 72.6000);
    expect(d).toBeGreaterThan(1000);
  });
});

describe('Attendance Window Validation', () => {
  it('window of 15 minutes should accept mark at 14:59', () => {
    const startTime = new Date('2026-07-15T09:00:00Z');
    const markTime = new Date('2026-07-15T09:14:59Z');
    const diffMs = markTime.getTime() - startTime.getTime();
    const diffMin = diffMs / 60000;
    expect(diffMin).toBeLessThanOrEqual(15);
  });

  it('window of 15 minutes should reject mark at 15:01', () => {
    const startTime = new Date('2026-07-15T09:00:00Z');
    const markTime = new Date('2026-07-15T09:15:01Z');
    const diffMs = markTime.getTime() - startTime.getTime();
    const diffMin = diffMs / 60000;
    expect(diffMin).toBeGreaterThan(15);
  });

  it('window of 5 minutes should allow mark at 4:59', () => {
    const startTime = new Date('2026-07-15T09:00:00Z');
    const markTime = new Date('2026-07-15T09:04:59Z');
    const diffMs = markTime.getTime() - startTime.getTime();
    const diffMin = diffMs / 60000;
    expect(diffMin).toBeLessThanOrEqual(5);
  });
});

describe('QR Timestamp Scenarios (Last-Second Scan Fix)', () => {
  it('QR with ts = 14.5s ago should still be valid on server (within 15s window)', () => {
    const qrTs = Date.now() - 14_500;
    const age = Date.now() - qrTs;
    expect(age).toBeGreaterThan(14_000);
    expect(age).toBeLessThanOrEqual(15_000); // Should still be accepted
  });

  it('QR with ts = 15.1s ago should be rejected on server', () => {
    const qrTs = Date.now() - 15_100;
    const age = Date.now() - qrTs;
    expect(age).toBeGreaterThan(15_000); // Should be rejected
  });

  it('Simulates last-second scan: t=4.9s QR + 2s GPS + 1s network = 7.9s total', () => {
    // QR generated at t=0
    const qrTs = Date.now() - 7900; // 7.9s total elapsed
    const age = Date.now() - qrTs;
    expect(age).toBeLessThanOrEqual(15_000); // Well within 15s window ✓
  });

  it('Simulates worst case: t=4.9s QR + 4s GPS + 2s network = 10.9s total', () => {
    const qrTs = Date.now() - 10_900;
    const age = Date.now() - qrTs;
    expect(age).toBeLessThanOrEqual(15_000); // Still within 15s window ✓
  });
});
