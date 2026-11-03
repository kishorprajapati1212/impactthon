import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The faculty "Start session" button must never hang on GPS. These tests
 * drive getLocationFast with a geolocation stub that never answers and check
 * the hard cap, plus the permission helpers used by the start form.
 */
let geo;
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  sessionStorage.clear();
  geo = {
    watchPosition: vi.fn(() => 1),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  };
  Object.defineProperty(navigator, "geolocation", { value: geo, configurable: true });
});
afterEach(() => { vi.useRealTimers(); });

describe("getLocationFast timeout cap", () => {
  it("resolves null no later than timeoutMs when no fix ever arrives", async () => {
    const { getLocationFast } = await import("../utils/geolocation.js");
    let done = false;
    const p = getLocationFast({ allowCached: false, timeoutMs: 8000 }).then((v) => { done = true; return v; });
    await vi.advanceTimersByTimeAsync(7000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1600);
    expect(done).toBe(true);
    expect(await p).toBeNull();
    expect(geo.clearWatch).toHaveBeenCalled();
  });

  it("returns the first accurate fix immediately", async () => {
    geo.watchPosition = vi.fn((ok) => { setTimeout(() => ok({ coords: { latitude: 23.02, longitude: 72.57, accuracy: 12 } }), 300); return 7; });
    const { getLocationFast } = await import("../utils/geolocation.js");
    const p = getLocationFast({ allowCached: false, timeoutMs: 8000 });
    await vi.advanceTimersByTimeAsync(400);
    const fix = await p;
    expect(fix).toMatchObject({ latitude: 23.02, longitude: 72.57, accuracy: 12 });
  });

  it("serves a warm cache synchronously via getCachedLocation", async () => {
    geo.watchPosition = vi.fn((ok) => { setTimeout(() => ok({ coords: { latitude: 1, longitude: 2, accuracy: 5 } }), 10); return 3; });
    const { getLocationFast, getCachedLocation } = await import("../utils/geolocation.js");
    const p = getLocationFast({ allowCached: false, timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(50);
    await p;
    expect(getCachedLocation()).toMatchObject({ latitude: 1, longitude: 2 });
  });
});

describe("leaving the screen cancels GPS (Phase 18)", () => {
  it("getLocationFast clears its watch and resolves as soon as the signal aborts", async () => {
    const { getLocationFast } = await import("../utils/geolocation.js");
    const ctl = new AbortController();
    let done = false;
    const p = getLocationFast({ allowCached: false, timeoutMs: 18000, signal: ctl.signal }).then((v) => { done = true; return v; });
    await vi.advanceTimersByTimeAsync(500);
    expect(done).toBe(false);
    ctl.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
    expect(await p).toBeNull();
    expect(geo.clearWatch).toHaveBeenCalledWith(1);
  });

  it("prewarmLocation uses a watch (cancellable) and clears it on abort or first fix", async () => {
    const { prewarmLocation } = await import("../utils/geolocation.js");
    const ctl = new AbortController();
    const p = prewarmLocation({ signal: ctl.signal });
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    ctl.abort();
    expect(await p).toBeNull();
    expect(geo.clearWatch).toHaveBeenCalledWith(1);

    geo.watchPosition = vi.fn((ok) => { setTimeout(() => ok({ coords: { latitude: 23.0, longitude: 72.5, accuracy: 20 } }), 50); return 9; });
    const p2 = prewarmLocation();
    await vi.advanceTimersByTimeAsync(60);
    expect(await p2).toMatchObject({ latitude: 23.0, longitude: 72.5 });
    expect(geo.clearWatch).toHaveBeenCalledWith(9);
  });
});

describe("getLocationPermission", () => {
  it("reports the browser's permission state without prompting", async () => {
    Object.defineProperty(navigator, "permissions", { value: { query: vi.fn(async () => ({ state: "denied" })) }, configurable: true });
    const { getLocationPermission } = await import("../utils/geolocation.js");
    expect(await getLocationPermission()).toBe("denied");
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });
  it("falls back to 'prompt' where the Permissions API is missing", async () => {
    Object.defineProperty(navigator, "permissions", { value: undefined, configurable: true });
    const { getLocationPermission } = await import("../utils/geolocation.js");
    expect(await getLocationPermission()).toBe("prompt");
  });
});
